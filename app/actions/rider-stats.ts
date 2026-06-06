"use server";

import { requireAuth } from "@/lib/require-auth";
import { createServerClient } from "@/lib/supabase-server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type RiderTier = "bronze" | "silver" | "gold" | "diamond";

export type BadgeId =
  | "first_job" | "jobs_10" | "jobs_50" | "jobs_100"
  | "km_500" | "km_1000" | "km_5000"
  | "streak_7" | "streak_30" | "acceptance_pro";

export type Badge = { id: BadgeId; label: string; emoji: string; earned: boolean };

export type MonthlyStats = {
  jobsCompleted:  number;
  jobsAttempted:  number;
  jobsDeclined:   number;
  distanceKm:     number;
  earningsThb:    number;
  acceptanceRate: number | null;
  completionRate: number | null;
  avgDistPerJob:  number | null;
};

export type RiderTargets = {
  monthly_jobs_target:     number | null;
  monthly_distance_target: number | null;
  min_acceptance_rate:     number | null;
  monthly_bonus_jobs:      number | null;
  monthly_bonus_amount:    number | null;
};

export type LeaderboardEntry = {
  riderId:       string;
  name:          string;
  jobsCompleted: number;
  distanceKm:    number;
  earningsThb:   number;
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function computeTier(lifetimeCompleted: number): RiderTier {
  if (lifetimeCompleted >= 100) return "diamond";
  if (lifetimeCompleted >= 50)  return "gold";
  if (lifetimeCompleted >= 20)  return "silver";
  return "bronze";
}

export function computeStreak(
  shifts: Array<{ clocked_in_at: string; jobs_completed: number }>
): number {
  const workDays = new Set(
    shifts
      .filter(s => (s.jobs_completed ?? 0) > 0)
      .map(s => {
        // Convert UTC to Bangkok date (UTC+7)
        const d = new Date(new Date(s.clocked_in_at).getTime() + 7 * 3600 * 1000);
        return d.toISOString().slice(0, 10);
      })
  );
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  let streak = 0;
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    if (workDays.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break; // allow today to not count yet (shift might still be open)
    }
  }
  return streak;
}

const BADGE_DEFS: Array<{
  id: BadgeId; label: string; emoji: string;
  condition: (args: {
    lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
    monthAcceptanceRate: number | null; monthAttempted: number;
  }) => boolean;
}> = [
  { id: "first_job",      label: "งานแรก",     emoji: "🎯", condition: s => s.lifetimeCompleted >= 1   },
  { id: "jobs_10",        label: "10 งาน",      emoji: "⭐", condition: s => s.lifetimeCompleted >= 10  },
  { id: "jobs_50",        label: "50 งาน",      emoji: "🏆", condition: s => s.lifetimeCompleted >= 50  },
  { id: "jobs_100",       label: "100 งาน",     emoji: "💯", condition: s => s.lifetimeCompleted >= 100 },
  { id: "km_500",         label: "500 กม.",     emoji: "🛵", condition: s => s.lifetimeDistanceKm >= 500  },
  { id: "km_1000",        label: "1,000 กม.",   emoji: "🚀", condition: s => s.lifetimeDistanceKm >= 1000 },
  { id: "km_5000",        label: "5,000 กม.",   emoji: "🏍", condition: s => s.lifetimeDistanceKm >= 5000 },
  { id: "streak_7",       label: "7 วันติด",   emoji: "🔥", condition: s => s.currentStreak >= 7  },
  { id: "streak_30",      label: "30 วันติด",  emoji: "💎", condition: s => s.currentStreak >= 30 },
  { id: "acceptance_pro", label: "Pro รับงาน", emoji: "⚡", condition: s => (s.monthAcceptanceRate ?? 0) >= 0.95 && s.monthAttempted >= 5 },
];

export function computeBadges(args: {
  lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
  monthAcceptanceRate: number | null; monthAttempted: number;
}): Badge[] {
  return BADGE_DEFS.map(b => ({ id: b.id, label: b.label, emoji: b.emoji, earned: b.condition(args) }));
}

// ── Month helpers ─────────────────────────────────────────────────────────────

function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  return {
    start: new Date(y, m - 1, 1).toISOString(),
    end:   new Date(y, m, 1).toISOString(),
  };
}

// ── Server actions ────────────────────────────────────────────────────────────

export async function fetchMyMonthlyStats(month: string): Promise<{ stats: MonthlyStats; targets: RiderTargets }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { start, end } = monthBounds(month);

  const [{ data: shifts }, { data: requests }, { data: userRow }] = await Promise.all([
    supabase
      .from("rider_shifts")
      .select("jobs_completed, jobs_attempted, jobs_declined, total_distance_km")
      .eq("rider_id", user.id)
      .gte("clocked_in_at", start)
      .lt("clocked_in_at", end),
    supabase
      .from("requests")
      .select("actual_price, distance_km")
      .eq("rider_id", user.id)
      .eq("status", "completed")
      .gte("appt_date", month + "-01")
      .lte("appt_date", month + "-31"),
    supabase
      .from("admin_users")
      .select("monthly_jobs_target, monthly_distance_target, min_acceptance_rate, monthly_bonus_jobs, monthly_bonus_amount")
      .eq("user_id", user.id)
      .single(),
  ]);

  const jobsCompleted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const jobsAttempted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_attempted ?? 0), 0);
  const jobsDeclined   = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_declined  ?? 0), 0);
  const distanceKm     = (shifts ?? []).reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const earningsThb    = (requests ?? []).reduce((s, r) => s + (r.actual_price ?? 0), 0);
  const totalOffered   = jobsAttempted + jobsDeclined;
  const reqDistTotal   = (requests ?? []).reduce((s, r) => s + (r.distance_km ?? 0), 0);

  return {
    stats: {
      jobsCompleted,
      jobsAttempted,
      jobsDeclined,
      distanceKm,
      earningsThb,
      acceptanceRate: totalOffered > 0  ? jobsAttempted / totalOffered  : null,
      completionRate: jobsAttempted > 0 ? jobsCompleted / jobsAttempted : null,
      avgDistPerJob:  jobsCompleted > 0 ? reqDistTotal  / jobsCompleted  : null,
    },
    targets: {
      monthly_jobs_target:     userRow?.monthly_jobs_target     ?? null,
      monthly_distance_target: userRow?.monthly_distance_target ?? null,
      min_acceptance_rate:     userRow?.min_acceptance_rate     != null ? Number(userRow.min_acceptance_rate) : null,
      monthly_bonus_jobs:      userRow?.monthly_bonus_jobs      ?? null,
      monthly_bonus_amount:    userRow?.monthly_bonus_amount     ?? null,
    },
  };
}

export async function fetchMyLifetimeStats(): Promise<{
  lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
  tier: RiderTier; monthAcceptanceRate: number | null; monthAttempted: number;
  badges: Badge[];
}> {
  const user = await requireAuth();
  const supabase = createServerClient();

  const { data: allShifts } = await supabase
    .from("rider_shifts")
    .select("clocked_in_at, jobs_completed, jobs_attempted, jobs_declined, total_distance_km")
    .eq("rider_id", user.id)
    .order("clocked_in_at", { ascending: false });

  const lifetimeCompleted  = (allShifts ?? []).reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const lifetimeDistanceKm = (allShifts ?? []).reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const currentStreak      = computeStreak(allShifts ?? []);
  const tier               = computeTier(lifetimeCompleted);

  // Current month acceptance rate
  const now = new Date();
  const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { start, end } = monthBounds(curMonth);
  const monthShifts    = (allShifts ?? []).filter(s => s.clocked_in_at >= start && s.clocked_in_at < end);
  const monthAttempted = monthShifts.reduce((s, sh) => s + (sh.jobs_attempted ?? 0), 0);
  const monthDeclined  = monthShifts.reduce((s, sh) => s + (sh.jobs_declined  ?? 0), 0);
  const totalOffered   = monthAttempted + monthDeclined;
  const monthAcceptanceRate = totalOffered > 0 ? monthAttempted / totalOffered : null;

  const badges = computeBadges({ lifetimeCompleted, lifetimeDistanceKm, currentStreak, monthAcceptanceRate, monthAttempted });

  return { lifetimeCompleted, lifetimeDistanceKm, currentStreak, tier, monthAcceptanceRate, monthAttempted, badges };
}

export async function fetchLeaderboard(month: string): Promise<LeaderboardEntry[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { start, end } = monthBounds(month);

  const [{ data: shifts }, { data: riders }, { data: requests }] = await Promise.all([
    supabase
      .from("rider_shifts")
      .select("rider_id, jobs_completed, total_distance_km")
      .gte("clocked_in_at", start)
      .lt("clocked_in_at", end),
    supabase.from("admin_users").select("user_id, name").eq("is_rider", true),
    supabase
      .from("requests")
      .select("rider_id, actual_price")
      .eq("status", "completed")
      .gte("appt_date", month + "-01")
      .lte("appt_date", month + "-31"),
  ]);

  const map = new Map<string, LeaderboardEntry>();
  for (const r of riders ?? []) {
    map.set(r.user_id, { riderId: r.user_id, name: r.name, jobsCompleted: 0, distanceKm: 0, earningsThb: 0 });
  }
  for (const s of shifts ?? []) {
    const e = map.get(s.rider_id);
    if (e) { e.jobsCompleted += s.jobs_completed ?? 0; e.distanceKm += s.total_distance_km ?? 0; }
  }
  for (const r of requests ?? []) {
    if (!r.rider_id) continue;
    const e = map.get(r.rider_id);
    if (e) e.earningsThb += r.actual_price ?? 0;
  }

  return Array.from(map.values()).sort((a, b) => b.jobsCompleted - a.jobsCompleted);
}

export async function fetchRiderKpiForAdmin(riderId: string, month: string): Promise<{ stats: MonthlyStats; targets: RiderTargets }> {
  await requireAuth();
  const supabase = createServerClient();
  const { start, end } = monthBounds(month);

  const [{ data: shifts }, { data: requests }, { data: userRow }] = await Promise.all([
    supabase
      .from("rider_shifts")
      .select("jobs_completed, jobs_attempted, jobs_declined, total_distance_km")
      .eq("rider_id", riderId)
      .gte("clocked_in_at", start)
      .lt("clocked_in_at", end),
    supabase
      .from("requests")
      .select("actual_price, distance_km")
      .eq("rider_id", riderId)
      .eq("status", "completed")
      .gte("appt_date", month + "-01")
      .lte("appt_date", month + "-31"),
    supabase
      .from("admin_users")
      .select("monthly_jobs_target, monthly_distance_target, min_acceptance_rate, monthly_bonus_jobs, monthly_bonus_amount")
      .eq("user_id", riderId)
      .single(),
  ]);

  const jobsCompleted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const jobsAttempted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_attempted ?? 0), 0);
  const jobsDeclined   = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_declined  ?? 0), 0);
  const distanceKm     = (shifts ?? []).reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const earningsThb    = (requests ?? []).reduce((s, r) => s + (r.actual_price ?? 0), 0);
  const totalOffered   = jobsAttempted + jobsDeclined;
  const reqDistTotal   = (requests ?? []).reduce((s, r) => s + (r.distance_km ?? 0), 0);

  return {
    stats: {
      jobsCompleted, jobsAttempted, jobsDeclined, distanceKm, earningsThb,
      acceptanceRate: totalOffered > 0  ? jobsAttempted / totalOffered  : null,
      completionRate: jobsAttempted > 0 ? jobsCompleted / jobsAttempted : null,
      avgDistPerJob:  jobsCompleted > 0 ? reqDistTotal  / jobsCompleted : null,
    },
    targets: {
      monthly_jobs_target:     userRow?.monthly_jobs_target     ?? null,
      monthly_distance_target: userRow?.monthly_distance_target ?? null,
      min_acceptance_rate:     userRow?.min_acceptance_rate     != null ? Number(userRow.min_acceptance_rate) : null,
      monthly_bonus_jobs:      userRow?.monthly_bonus_jobs      ?? null,
      monthly_bonus_amount:    userRow?.monthly_bonus_amount    ?? null,
    },
  };
}

export async function updateRiderTargets(
  riderId: string,
  targets: Partial<RiderTargets>
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase
    .from("admin_users")
    .update({
      monthly_jobs_target:     targets.monthly_jobs_target     ?? null,
      monthly_distance_target: targets.monthly_distance_target ?? null,
      min_acceptance_rate:     targets.min_acceptance_rate     ?? null,
      monthly_bonus_jobs:      targets.monthly_bonus_jobs      ?? null,
      monthly_bonus_amount:    targets.monthly_bonus_amount    ?? null,
    })
    .eq("user_id", riderId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}
