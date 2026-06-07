"use server";

import { requireAuth } from "@/lib/require-auth";
import { createServerClient } from "@/lib/supabase-server";
import { startOfThaiDay, endOfThaiDay } from "@/lib/thai-date";
import { haversineKm, etaMinutes as etaMinutesGeo, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";

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

  // Guard: reject stale pings that arrive after the shift was closed (race condition)
  const { data: openShift } = await supabase
    .from("rider_shifts")
    .select("id")
    .eq("id", payload.shiftId)
    .is("clocked_out_at", null)
    .maybeSingle();
  if (!openShift) return { success: false, error: "shift_closed" };

  const locData: Record<string, unknown> = {
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
    last_heartbeat: now,
    updated_at:     now,
  };
  // Validate currentJobId ownership before writing — if admin reclaimed the job
  // the closure in the rider app still holds the old ID; checking here prevents it
  // from being written back on every heartbeat.
  if (payload.currentJobId != null) {
    const { data: jobCheck } = await supabase
      .from("requests")
      .select("id")
      .eq("id", payload.currentJobId)
      .eq("rider_id", user.id)
      .maybeSingle();
    locData.current_job_id = jobCheck ? payload.currentJobId : null;
  }

  const { error } = await supabase.from("rider_locations").upsert(locData, { onConflict: "rider_id" });

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

// ─── Fetch active shift for auto-resume ──────────────────────────────────────
export async function fetchActiveShift(): Promise<{ shiftId: string; currentJobId: string | null } | null> {
  const user = await requireAuth();
  const supabase = createServerClient();

  const [{ data: shift }, { data: loc }] = await Promise.all([
    supabase.from("rider_shifts").select("id").eq("rider_id", user.id).is("clocked_out_at", null).maybeSingle(),
    supabase.from("rider_locations").select("current_job_id").eq("rider_id", user.id).maybeSingle(),
  ]);

  if (!shift) return null;
  return { shiftId: shift.id, currentJobId: loc?.current_job_id ?? null };
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

  // Use is_online as the sole online signal — it only changes on manual toggle or shift close.
  // last_heartbeat may be stale when rider is using Maps/another app (iOS freezes PWA in background),
  // but the rider is still on shift and available. We show "last seen X min ago" in the UI instead.
  const { data: locs } = await supabase
    .from("rider_locations")
    .select("rider_id, lat, lng, accuracy_m, tracking_mode, battery_pct, app_state, last_heartbeat, is_online, current_job_id, shift_id")
    .eq("is_online", true);

  if (!locs || locs.length === 0) return [];

  const riderIds = locs.map(l => l.rider_id);
  const shiftIds = locs.map(l => l.shift_id).filter(Boolean) as string[];

  // Fetch full job details for ALL active jobs (not just current_job_id) so we can
  // fallback current_job when current_job_id is null (e.g. during inspecting/on-site).
  const ACTIVE_STATUSES = ["confirmed", "pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"];
  const STATUS_PRIORITY: Record<string, number> = {
    inspecting: 0, price_negotiation: 1, contracting: 2, awaiting_transfer: 3,
    en_route: 4, pickup_scheduled: 5, confirmed: 6,
  };

  const [{ data: users }, { data: shifts }, { data: activeJobs }] = await Promise.all([
    supabase.from("admin_users").select("user_id, name, avatar_url").in("user_id", riderIds),
    shiftIds.length > 0
      ? supabase.from("rider_shifts").select("id, clocked_in_at, jobs_completed").in("id", shiftIds)
      : Promise.resolve({ data: [] }),
    supabase.from("requests")
      .select("id, order_number, device_model, customer_name, appt_location, appt_lat, appt_lng, appt_time, appt_date, distance_km, status, rider_id")
      .in("rider_id", riderIds)
      .in("status", ACTIVE_STATUSES),
  ]);

  return locs.map(loc => {
    const riderJobs = (activeJobs ?? []).filter(j => j.rider_id === loc.rider_id);
    // Prefer current_job_id; fall back to most urgent active job
    const currentJob = loc.current_job_id
      ? (riderJobs.find(j => j.id === loc.current_job_id) ?? null)
      : (riderJobs.slice().sort((a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99))[0] ?? null);
    return {
      ...loc,
      admin_users:  users?.find(u => u.user_id === loc.rider_id) ?? null,
      rider_shifts: shifts?.find(s => s.id === loc.shift_id) ?? null,
      current_job:  currentJob,
      active_jobs:  riderJobs,
    };
  });
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

  const start = new Date(date + "T00:00:00+07:00").toISOString();
  const end   = new Date(date + "T23:59:59+07:00").toISOString();

  const { data: shifts } = await supabase
    .from("rider_shifts")
    .select("id, rider_id, clocked_in_at, clocked_out_at, jobs_completed, total_distance_km, ended_reason")
    .gte("clocked_in_at", start)
    .lte("clocked_in_at", end)
    .order("clocked_in_at", { ascending: false });

  if (!shifts || shifts.length === 0) return [];

  const riderIds = [...new Set(shifts.map(s => s.rider_id))];
  const { data: users } = await supabase
    .from("admin_users")
    .select("user_id, name, avatar_url")
    .in("user_id", riderIds);

  return shifts.map(s => ({
    ...s,
    rider_name:       users?.find(u => u.user_id === s.rider_id)?.name ?? "ไรเดอร์",
    rider_avatar_url: users?.find(u => u.user_id === s.rider_id)?.avatar_url ?? null,
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

// ─── Fetch all active requests for planner (confirmed + in-progress) ─────────
export async function fetchUnassignedJobs() {
  await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("requests")
    .select("id, order_number, device_model, customer_name, appt_location, appt_date, appt_time, appt_lat, appt_lng, rider_id, rider_name, status")
    .in("status", ["confirmed", "pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"])
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

  // Fetch all online riders with their current positions (exclude stale heartbeats)
  const staleThresholdAssign = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: locs } = await supabase
    .from("rider_locations")
    .select("rider_id, lat, lng, tracking_mode, battery_pct, shift_id")
    .eq("is_online", true)
    .gte("last_heartbeat", staleThresholdAssign);

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

  const etaMinutes = etaMinutesGeo;

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
    .gte("clocked_in_at", startOfThaiDay(dateFrom))
    .lte("clocked_in_at", endOfThaiDay(dateTo))
    .order("clocked_in_at", { ascending: false });

  return data ?? [];
}

// ─── Count rider jobs from requests table (accurate, not denormalized) ────────
export async function fetchRiderJobCountByRange(
  riderId: string,
  dateFrom: string,
  dateTo: string
): Promise<number> {
  await requireAuth();
  const supabase = createServerClient();
  const { count } = await supabase
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("rider_id", riderId)
    .in("status", ["completed", "cancelled", "no_show", "rejected"])
    .gte("appt_date", dateFrom)
    .lte("appt_date", dateTo);
  return count ?? 0;
}

// ─── Compute cumulative GPS distance for a rider over a date range ────────────
export async function fetchRiderTrailDistanceKm(
  riderId: string,
  dateFrom: string,
  dateTo: string
): Promise<number> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("rider_location_history")
    .select("lat, lng")
    .eq("rider_id", riderId)
    .gte("recorded_at", startOfThaiDay(dateFrom))
    .lte("recorded_at", endOfThaiDay(dateTo))
    .order("recorded_at", { ascending: true });

  if (!data || data.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < data.length; i++) {
    total += haversineKm(data[i - 1].lat, data[i - 1].lng, data[i].lat, data[i].lng);
  }
  return Math.round(total * 10) / 10;
}

// ─── Compute chain distance from appointment coordinates ─────────────────────
// office→job[0]→job[1]→...→job[N]→office
// If job[i] has direct_chain in status_log, skip the return-to-office segment after it
export async function fetchRiderChainDistanceKm(
  riderId: string,
  dateFrom: string,
  dateTo: string
): Promise<number> {
  await requireAuth();
  const supabase = createServerClient();

  const { data } = await supabase
    .from("requests")
    .select("appt_lat, appt_lng, status_log")
    .eq("rider_id", riderId)
    .in("status", ["completed", "cancelled", "no_show", "rejected"])
    .gte("appt_date", dateFrom)
    .lte("appt_date", dateTo);

  if (!data || data.length === 0) return 0;

  type LogEntry = { status: string; timestamp: string };

  const jobs = data
    .filter(j => j.appt_lat != null && j.appt_lng != null)
    .map(j => {
      const log = ((j.status_log as unknown) as LogEntry[]) ?? [];
      const ts  = log.find(e => e.status === "completed" || e.status === "direct_chain")?.timestamp
               ?? log.find(e => e.status === "inspecting")?.timestamp
               ?? "9999";
      return {
        lat:      j.appt_lat as number,
        lng:      j.appt_lng as number,
        ts,
        chained:  log.some(e => e.status === "direct_chain"),
      };
    })
    .sort((a, b) => a.ts.localeCompare(b.ts));

  if (jobs.length === 0) return 0;

  const OLat = OFFICE_LAT, OLng = OFFICE_LNG;
  let total = 0, prevLat = OLat, prevLng = OLng;

  for (let i = 0; i < jobs.length; i++) {
    const { lat, lng, chained } = jobs[i];
    total += haversineKm(prevLat, prevLng, lat, lng);            // travel to this job
    const goDirectlyNext = chained && i < jobs.length - 1;
    if (goDirectlyNext) { prevLat = lat; prevLng = lng; }        // chain → stay at job location
    else { total += haversineKm(lat, lng, OLat, OLng); prevLat = OLat; prevLng = OLng; } // return office
  }

  return Math.round(total * 10) / 10;
}

// ─── Today's request stats for planner dashboard ─────────────────────────────
export async function fetchTodayRequestStats() {
  await requireAuth();
  const supabase = createServerClient();
  const thDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
  const start  = new Date(thDate + "T00:00:00+07:00").toISOString();
  const end    = new Date(thDate + "T23:59:59+07:00").toISOString();

  const { data } = await supabase
    .from("requests")
    .select("status, rider_id, appt_date, appt_time")
    .gte("created_at", start)
    .lte("created_at", end);

  if (!data) return { totalCount: 0, newCount: 0, assignedCount: 0, completedCount: 0, cancelledCount: 0, slaBreachedCount: 0, slaTrackableCount: 0 };

  const SLA_BUFFER_MS = 60 * 60 * 1000;
  const now = Date.now();
  const notCancelled = (r: { status: string }) => !["cancelled", "no_show"].includes(r.status);
  const slaTrackable = data.filter(r => r.appt_date && r.appt_time && notCancelled(r));
  const slaBreached  = slaTrackable.filter(r => {
    if (r.rider_id) return false; // assigned = ok (best approximation without assignment timestamp)
    const deadline = new Date(`${r.appt_date}T${r.appt_time}:00`).getTime() - SLA_BUFFER_MS;
    return now > deadline;
  });

  return {
    totalCount:       data.length,
    newCount:         data.filter(r => ["new", "pending", "contacted"].includes(r.status)).length,
    assignedCount:    data.filter(r => r.rider_id).length,
    completedCount:   data.filter(r => r.status === "completed").length,
    cancelledCount:   data.filter(r => ["cancelled", "no_show"].includes(r.status)).length,
    slaTrackableCount: slaTrackable.length,
    slaBreachedCount:  slaBreached.length,
  };
}
