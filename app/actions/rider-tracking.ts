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

  const { data: locs } = await supabase
    .from("rider_locations")
    .select("rider_id, lat, lng, accuracy_m, tracking_mode, battery_pct, app_state, last_heartbeat, is_online, current_job_id, shift_id")
    .eq("is_online", true);

  if (!locs || locs.length === 0) return [];

  const riderIds = locs.map(l => l.rider_id);
  const shiftIds = locs.map(l => l.shift_id).filter(Boolean) as string[];
  const jobIds   = locs.map(l => l.current_job_id).filter(Boolean) as string[];

  const [{ data: users }, { data: shifts }, { data: jobs }] = await Promise.all([
    supabase.from("admin_users").select("user_id, name").in("user_id", riderIds),
    shiftIds.length > 0
      ? supabase.from("rider_shifts").select("id, clocked_in_at, jobs_completed").in("id", shiftIds)
      : Promise.resolve({ data: [] }),
    jobIds.length > 0
      ? supabase.from("requests").select("id, order_number, device_model, customer_name, appt_location").in("id", jobIds)
      : Promise.resolve({ data: [] }),
  ]);

  return locs.map(loc => ({
    ...loc,
    admin_users:  users?.find(u => u.user_id === loc.rider_id) ?? null,
    rider_shifts: shifts?.find(s => s.id === loc.shift_id) ?? null,
    current_job:  jobs?.find(j => j.id === loc.current_job_id) ?? null,
  }));
}

// ─── Admin: force-close a rider's shift ──────────────────────────────────────
export async function adminCloseRiderShift(riderId: string): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const now = new Date().toISOString();

  await supabase
    .from("rider_shifts")
    .update({ clocked_out_at: now, ended_reason: "admin_closed" })
    .eq("rider_id", riderId)
    .is("clocked_out_at", null);

  await supabase
    .from("rider_locations")
    .update({ is_online: false, tracking_mode: "idle", current_job_id: null, updated_at: now })
    .eq("rider_id", riderId);

  await supabase
    .from("admin_users")
    .update({ is_online: false, last_seen_at: now })
    .eq("user_id", riderId);

  return { success: true };
}

// ─── Fetch all riders' shifts for a given date ────────────────────────────────
export async function fetchAllRidersShifts(date: string) {
  await requireAuth();
  const supabase = createServerClient();

  const { data: shifts } = await supabase
    .from("rider_shifts")
    .select("id, rider_id, clocked_in_at, clocked_out_at, jobs_completed, total_distance_km, ended_reason")
    .gte("clocked_in_at", date)
    .lte("clocked_in_at", date + "T23:59:59")
    .order("clocked_in_at", { ascending: false });

  if (!shifts || shifts.length === 0) return [];

  const riderIds = [...new Set(shifts.map(s => s.rider_id))];
  const { data: users } = await supabase
    .from("admin_users")
    .select("user_id, name")
    .in("user_id", riderIds);

  return shifts.map(s => ({
    ...s,
    rider_name: users?.find(u => u.user_id === s.rider_id)?.name ?? "ไรเดอร์",
  }));
}

// ─── Fetch all riders (for management page) ───────────────────────────────────
export async function fetchAllRidersList() {
  await requireAuth();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id, name, email, role")
    .order("name");

  if (error) console.error("fetchAllRidersList:", error.message);
  return data ?? [];
}

// ─── Admin: invite new rider by email ────────────────────────────────────────
export async function adminInviteRider(email: string, name: string): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: "https://admin.khaiphone.com/rider/install",
  });

  if (error || !data.user) return { success: false, error: error?.message ?? "invite failed" };

  await supabase.from("admin_users").upsert({
    user_id:   data.user.id,
    name,
    role:      "staff",
    is_online: false,
  }, { onConflict: "user_id" });

  return { success: true };
}

// ─── Admin: remove rider ──────────────────────────────────────────────────────
export async function adminRemoveRider(riderId: string): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const now = new Date().toISOString();
  await supabase
    .from("rider_shifts")
    .update({ clocked_out_at: now, ended_reason: "admin_removed" })
    .eq("rider_id", riderId)
    .is("clocked_out_at", null);

  await supabase
    .from("rider_locations")
    .update({ is_online: false, updated_at: now })
    .eq("rider_id", riderId);

  const { error } = await supabase
    .from("admin_users")
    .delete()
    .eq("user_id", riderId);

  if (error) return { success: false, error: error.message };
  return { success: true };
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

// ─── Fetch all confirmed requests for planner (unassigned + assigned) ────────
export async function fetchUnassignedJobs() {
  await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("requests")
    .select("id, order_number, device_model, customer_name, appt_location, appt_date, appt_time, appt_lat, appt_lng, rider_id, rider_name")
    .eq("status", "confirmed")
    .order("appt_date", { ascending: true })
    .order("appt_time", { ascending: true });

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
    .select("rider_id, lat, lng, tracking_mode, battery_pct, shift_id")
    .eq("is_online", true);

  if (!locs || locs.length === 0) {
    return { riders: [], appt_location: req?.appt_location ?? null };
  }

  const riderIds = locs.map(l => l.rider_id);
  const shiftIds = locs.map(l => l.shift_id).filter(Boolean) as string[];

  const [{ data: users }, { data: shifts }] = await Promise.all([
    supabase.from("admin_users").select("user_id, name").in("user_id", riderIds),
    shiftIds.length > 0
      ? supabase.from("rider_shifts").select("id, jobs_completed").in("id", shiftIds)
      : Promise.resolve({ data: [] }),
  ]);

  const targetLat = req?.appt_lat ?? null;
  const targetLng = req?.appt_lng ?? null;

  const { haversineKm, etaMinutes } = await import("@/lib/geo-utils");

  const suggestions = locs
    .map(r => {
      const distKm =
        targetLat != null && targetLng != null
          ? haversineKm(r.lat, r.lng, targetLat, targetLng)
          : 0;
      return {
        rider_id:       r.rider_id,
        name:           users?.find(u => u.user_id === r.rider_id)?.name ?? "ไรเดอร์",
        tracking_mode:  r.tracking_mode,
        battery_pct:    r.battery_pct,
        distanceKm:     Math.round(distKm * 10) / 10,
        etaMinutes:     etaMinutes(distKm),
        jobs_completed: shifts?.find(s => s.id === r.shift_id)?.jobs_completed ?? 0,
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

// ─── Today's request stats for planner dashboard ─────────────────────────────
export async function fetchTodayRequestStats() {
  await requireAuth();
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("requests")
    .select("status, rider_id")
    .gte("created_at", today + "T00:00:00")
    .lte("created_at", today + "T23:59:59");

  if (!data) return { newCount: 0, completedCount: 0, cancelledCount: 0 };
  return {
    newCount: data.filter(r => ["new", "pending", "contacted"].includes(r.status)).length,
    completedCount: data.filter(r => r.status === "completed").length,
    cancelledCount: data.filter(r => ["cancelled", "no_show"].includes(r.status)).length,
  };
}
