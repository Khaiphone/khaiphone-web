"use server";

import { requireAuth } from "@/lib/require-auth";
import { createServerClient } from "@/lib/supabase-server";
import { sendPushToUser } from "@/app/actions/push";

export type RiderSystemSettings = {
  office_lat:             number;
  office_lng:             number;
  office_name:            string;
  shift_auto_timeout_min: number;
  location_interval_sec:  number;
  return_radius_m:        number;
  sla_dispatch_good_min:  number;
  sla_dispatch_warn_min:  number;
  sla_arrive_ontime_min:  number;
  sla_arrive_slight_min:  number;
  sla_job_fast_min:       number;
  sla_job_slight_min:     number;
};

const DEFAULTS: RiderSystemSettings = {
  office_lat:             14.0100,
  office_lng:             100.7197,
  office_name:            "สำนักงาน Khaiphone",
  shift_auto_timeout_min: 60,
  location_interval_sec:  30,
  return_radius_m:        500,
  sla_dispatch_good_min:  120,
  sla_dispatch_warn_min:  30,
  sla_arrive_ontime_min:  5,
  sla_arrive_slight_min:  20,
  sla_job_fast_min:       30,
  sla_job_slight_min:     60,
};

export async function fetchRiderSystemSettings(): Promise<RiderSystemSettings> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase.from("rider_system_settings").select("key, value");
  const map = Object.fromEntries((data ?? []).map(r => [r.key, r.value]));
  return {
    office_lat:             parseFloat(map.office_lat             ?? String(DEFAULTS.office_lat)),
    office_lng:             parseFloat(map.office_lng             ?? String(DEFAULTS.office_lng)),
    office_name:            map.office_name             ?? DEFAULTS.office_name,
    shift_auto_timeout_min: parseInt(map.shift_auto_timeout_min   ?? String(DEFAULTS.shift_auto_timeout_min)),
    location_interval_sec:  parseInt(map.location_interval_sec    ?? String(DEFAULTS.location_interval_sec)),
    return_radius_m:        parseInt(map.return_radius_m          ?? String(DEFAULTS.return_radius_m)),
    sla_dispatch_good_min:  parseInt(map.sla_dispatch_good_min    ?? String(DEFAULTS.sla_dispatch_good_min)),
    sla_dispatch_warn_min:  parseInt(map.sla_dispatch_warn_min    ?? String(DEFAULTS.sla_dispatch_warn_min)),
    sla_arrive_ontime_min:  parseInt(map.sla_arrive_ontime_min    ?? String(DEFAULTS.sla_arrive_ontime_min)),
    sla_arrive_slight_min:  parseInt(map.sla_arrive_slight_min    ?? String(DEFAULTS.sla_arrive_slight_min)),
    sla_job_fast_min:       parseInt(map.sla_job_fast_min         ?? String(DEFAULTS.sla_job_fast_min)),
    sla_job_slight_min:     parseInt(map.sla_job_slight_min       ?? String(DEFAULTS.sla_job_slight_min)),
  };
}

export async function updateRiderSystemSettings(
  settings: Partial<RiderSystemSettings>
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value: String(value),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase
    .from("rider_system_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export type RiderPushStatus = {
  userId:    string;
  name:      string;
  email:     string;
  hasSubscription: boolean;
  subCount:  number;
};

export async function fetchRiderPushStatus(): Promise<RiderPushStatus[]> {
  await requireAuth();
  const supabase = createServerClient();

  const [{ data: riders }, { data: subs }] = await Promise.all([
    supabase.from("admin_users").select("user_id, name, email").eq("is_rider", true).eq("active", true),
    supabase.from("push_subscriptions").select("user_id"),
  ]);

  const subMap = new Map<string, number>();
  for (const s of subs ?? []) {
    if (s.user_id) subMap.set(s.user_id, (subMap.get(s.user_id) ?? 0) + 1);
  }

  return (riders ?? []).map(r => ({
    userId:          r.user_id,
    name:            r.name ?? "ไรเดอร์",
    email:           r.email ?? "",
    hasSubscription: subMap.has(r.user_id),
    subCount:        subMap.get(r.user_id) ?? 0,
  }));
}

export async function broadcastToRiders(
  title: string,
  body: string
): Promise<{ success: true; sent: number } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: riders } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("is_rider", true)
    .eq("active", true);

  if (!riders?.length) return { success: true as const, sent: 0 };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("user_id")
    .in("user_id", riders.map(r => r.user_id));

  const uniqueIds = [...new Set((subs ?? []).map(s => s.user_id).filter(Boolean))];
  await Promise.allSettled(
    uniqueIds.map(uid => sendPushToUser(uid, { title, body, url: "/rider", tag: "broadcast" }))
  );
  return { success: true as const, sent: uniqueIds.length };
}
