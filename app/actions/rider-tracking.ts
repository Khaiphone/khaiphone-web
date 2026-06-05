"use server";

import { requireAuth } from "@/lib/require-auth";
import { createServerClient } from "@/lib/supabase-server";

// ─── Open shift (clock-in) ────────────────────────────────────────────────────
export async function openShift(lat: number, lng: number): Promise<{ success: true; shiftId: string } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();

  // Close any stale open shift first
  await supabase
    .from("rider_shifts")
    .update({ clocked_out_at: new Date().toISOString(), ended_reason: "auto_replaced" })
    .eq("rider_id", user.id)
    .is("clocked_out_at", null);

  const { data, error } = await supabase
    .from("rider_shifts")
    .insert({ rider_id: user.id, clock_in_lat: lat, clock_in_lng: lng })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "shift error" };

  // Upsert rider_locations (go online)
  await supabase.from("rider_locations").upsert({
    rider_id:      user.id,
    lat, lng,
    is_online:     true,
    tracking_mode: "idle",
    shift_id:      data.id,
    last_heartbeat: new Date().toISOString(),
    updated_at:    new Date().toISOString(),
  }, { onConflict: "rider_id" });

  // Also keep admin_users.is_online in sync
  await supabase
    .from("admin_users")
    .update({ is_online: true, last_seen_at: new Date().toISOString() })
    .eq("user_id", user.id);

  return { success: true, shiftId: data.id };
}

// ─── Close shift (clock-out) ──────────────────────────────────────────────────
export async function closeShift(lat: number | null, lng: number | null): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();

  const now = new Date().toISOString();

  await supabase
    .from("rider_shifts")
    .update({
      clocked_out_at: now,
      clock_out_lat: lat,
      clock_out_lng: lng,
      ended_reason: "manual",
    })
    .eq("rider_id", user.id)
    .is("clocked_out_at", null);

  await supabase
    .from("rider_locations")
    .update({ is_online: false, tracking_mode: "idle", current_job_id: null, updated_at: now })
    .eq("rider_id", user.id);

  await supabase
    .from("admin_users")
    .update({ is_online: false, last_seen_at: now })
    .eq("user_id", user.id);

  return { success: true };
}

// ─── Ping location ────────────────────────────────────────────────────────────
export async function riderPingLocation(payload: {
  lat: number;
  lng: number;
  accuracy: number;
  heading: number | null;
  speed: number | null;
  batteryPct: number | null;
  mode: string;
  appState: string;
  shiftId: string;
  currentJobId?: string | null;
}): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  const { error } = await supabase.from("rider_locations").upsert({
    rider_id:       user.id,
    lat:            payload.lat,
    lng:            payload.lng,
    accuracy_m:     payload.accuracy,
    heading:        payload.heading,
    speed_kmh:      payload.speed,
    battery_pct:    payload.batteryPct,
    is_online:      true,
    tracking_mode:  payload.mode,
    app_state:      payload.appState,
    shift_id:       payload.shiftId,
    current_job_id: payload.currentJobId ?? null,
    last_heartbeat: now,
    updated_at:     now,
  }, { onConflict: "rider_id" });

  if (error) return { success: false, error: error.message };

  // Write history only for active travel modes
  if (payload.mode === "enroute" || payload.mode === "return") {
    await supabase.from("rider_location_history").insert({
      rider_id:   user.id,
      job_id:     payload.currentJobId ?? null,
      shift_id:   payload.shiftId,
      lat:        payload.lat,
      lng:        payload.lng,
      accuracy_m: payload.accuracy,
    });
  }

  return { success: true };
}

// ─── Grant / revoke location consent ─────────────────────────────────────────
export async function saveLocationConsent(granted: boolean): Promise<void> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  await supabase.from("rider_profiles").upsert({
    user_id:             user.id,
    consent_location:    granted,
    consent_granted_at:  granted ? now : null,
    consent_revoked_at:  !granted ? now : null,
    consent_version:     1,
    is_rider:            true,
    updated_at:          now,
  }, { onConflict: "user_id" });
}

// ─── Fetch consent status ─────────────────────────────────────────────────────
export async function fetchRiderConsent(): Promise<{ consented: boolean; grantedAt: string | null }> {
  const user = await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("rider_profiles")
    .select("consent_location, consent_granted_at")
    .eq("user_id", user.id)
    .single();

  return {
    consented:  data?.consent_location ?? false,
    grantedAt: data?.consent_granted_at ?? null,
  };
}

// ─── Fetch active riders for admin ───────────────────────────────────────────
export async function fetchActiveRiders() {
  await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("rider_locations")
    .select(`
      rider_id, lat, lng, accuracy_m, tracking_mode, battery_pct,
      app_state, last_heartbeat, is_online, current_job_id, shift_id,
      admin_users!rider_locations_rider_id_fkey(name, phone),
      rider_shifts!rider_locations_shift_id_fkey(clocked_in_at, jobs_completed)
    `)
    .eq("is_online", true);

  return data ?? [];
}

// ─── Fetch rider location history for trail map ───────────────────────────────
export async function fetchRiderTrail(riderId: string, since: string) {
  await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("rider_location_history")
    .select("lat, lng, recorded_at")
    .eq("rider_id", riderId)
    .gte("recorded_at", since)
    .order("recorded_at", { ascending: true });

  return data ?? [];
}

// ─── Smart rider suggestions for a request ────────────────────────────────────
export async function fetchRiderSuggestionsForRequest(requestId: string): Promise<{
  riders: Array<{
    rider_id: string;
    name: string;
    tracking_mode: string;
    battery_pct: number | null;
    distanceKm: number;
    etaMinutes: number;
    jobs_completed: number;
  }>;
  appt_location: string | null;
}> {
  await requireAuth();
  const supabase = createServerClient();

  // Fetch the request to get appointment coordinates / location text
  const { data: req } = await supabase
    .from("requests")
    .select("appt_location, appt_lat, appt_lng")
    .eq("id", requestId)
    .single();

  // Fetch all online riders with their current positions
  const { data: locs } = await supabase
    .from("rider_locations")
    .select(`
      rider_id, lat, lng, tracking_mode, battery_pct,
      admin_users!rider_locations_rider_id_fkey(name),
      rider_shifts!rider_locations_shift_id_fkey(jobs_completed)
    `)
    .eq("is_online", true);

  if (!locs || locs.length === 0) {
    return { riders: [], appt_location: req?.appt_location ?? null };
  }

  // Calculate haversine distance from each rider to appointment
  // If we have geocoded coords use those; otherwise fall back to office as reference
  const targetLat = req?.appt_lat ?? null;
  const targetLng = req?.appt_lng ?? null;

  const { haversineKm, etaMinutes } = await import("@/lib/geo-utils");

  const suggestions = locs
    .map((r: Record<string, unknown>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adminUsers = r.admin_users as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const riderShifts = r.rider_shifts as any;
      const distKm =
        targetLat != null && targetLng != null
          ? haversineKm(r.lat as number, r.lng as number, targetLat, targetLng)
          : 0;
      return {
        rider_id:       r.rider_id as string,
        name:           adminUsers?.name ?? "ไรเดอร์",
        tracking_mode:  r.tracking_mode as string,
        battery_pct:    r.battery_pct as number | null,
        distanceKm:     Math.round(distKm * 10) / 10,
        etaMinutes:     etaMinutes(distKm),
        jobs_completed: riderShifts?.jobs_completed ?? 0,
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return { riders: suggestions, appt_location: req?.appt_location ?? null };
}

// ─── Fetch rider shift stats ──────────────────────────────────────────────────
export async function fetchRiderShiftStats(riderId: string, dateFrom: string, dateTo: string) {
  await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("rider_shifts")
    .select("id, clocked_in_at, clocked_out_at, jobs_completed, total_distance_km, ended_reason")
    .eq("rider_id", riderId)
    .gte("clocked_in_at", dateFrom)
    .lte("clocked_in_at", dateTo + "T23:59:59")
    .order("clocked_in_at", { ascending: false });

  return data ?? [];
}
