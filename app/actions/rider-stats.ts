"use server";

import { requireAuth } from "@/lib/require-auth";
import { createServerClient } from "@/lib/supabase-server";
import { computeTier, computeStreak, computeBadges, computeMonthlyTier } from "@/lib/rider-kpi";
import { thaiMonthStr, startOfThaiMonth, startOfNextThaiMonth } from "@/lib/thai-date";
import type { RiderTier, Badge, RankConfig } from "@/lib/rider-kpi";
export type { RiderTier, BadgeId, Badge, RankConfig } from "@/lib/rider-kpi";

export type MonthlyStats = {
  jobsCompleted:  number;
  jobsAttempted:  number;
  jobsDeclined:   number;
  distanceKm:     number;
  goodsValueThb:  number;
  acceptanceRate: number | null;
  completionRate: number | null;
  avgDistPerJob:  number | null;
  monthlyTier:    RiderTier;
  rankConfig:     RankConfig;
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

// ── Month helpers ─────────────────────────────────────────────────────────────

function monthBounds(month: string): { start: string; end: string } {
  return {
    start: startOfThaiMonth(month),
    end:   startOfNextThaiMonth(month),
  };
}

// ── Server actions ────────────────────────────────────────────────────────────

export async function fetchMyMonthlyStats(month: string): Promise<{ stats: MonthlyStats; targets: RiderTargets }> {
  const user = await requireAuth();
  const supabase = createServerClient();
  const { start, end } = monthBounds(month);

  const [{ data: shifts }, { data: requests }, { data: userRow }, { data: rankRows }] = await Promise.all([
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
      .select("monthly_jobs_target, monthly_distance_target, min_acceptance_rate, monthly_bonus_jobs, monthly_bonus_amount, rank_tier_override")
      .eq("user_id", user.id)
      .single(),
    supabase.from("rank_configs").select("*"),
  ]);

  const jobsCompleted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const jobsAttempted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_attempted ?? 0), 0);
  const jobsDeclined   = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_declined  ?? 0), 0);
  const distanceKm     = (shifts ?? []).reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const goodsValueThb  = (requests ?? []).reduce((s, r) => s + (r.actual_price ?? 0), 0);
  const totalOffered   = jobsAttempted + jobsDeclined;
  const reqDistTotal   = (requests ?? []).reduce((s, r) => s + (r.distance_km ?? 0), 0);

  const configs: RankConfig[] = (rankRows ?? []).map(r => ({
    tier: r.tier as RiderTier, label_th: r.label_th,
    min_jobs_month: r.min_jobs_month, commission_rate: Number(r.commission_rate),
    fuel_rate_per_km: Number(r.fuel_rate_per_km), bonus_multiplier: Number(r.bonus_multiplier),
    job_target_reduction: r.job_target_reduction,
  }));
  const monthlyTier = computeMonthlyTier(jobsCompleted, configs, userRow?.rank_tier_override as RiderTier | null);
  const rankConfig  = configs.find(c => c.tier === monthlyTier) ?? { tier: "bronze" as RiderTier, label_th: "บรอนซ์", min_jobs_month: 0, commission_rate: 0, fuel_rate_per_km: 0, bonus_multiplier: 1, job_target_reduction: 0 };

  return {
    stats: {
      jobsCompleted, jobsAttempted, jobsDeclined, distanceKm, goodsValueThb, monthlyTier, rankConfig,
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
  const curMonth = thaiMonthStr();
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

export async function fetchRankConfigs(): Promise<RankConfig[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase.from("rank_configs").select("*").order("min_jobs_month");
  return (data ?? []).map(r => ({
    tier: r.tier as RiderTier, label_th: r.label_th,
    min_jobs_month: r.min_jobs_month, commission_rate: Number(r.commission_rate),
    fuel_rate_per_km: Number(r.fuel_rate_per_km), bonus_multiplier: Number(r.bonus_multiplier),
    job_target_reduction: r.job_target_reduction,
  }));
}

export async function updateRankConfig(
  tier: RiderTier,
  config: Partial<Omit<RankConfig, "tier">>
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("rank_configs").update({
    label_th:             config.label_th,
    min_jobs_month:       config.min_jobs_month,
    commission_rate:      config.commission_rate,
    fuel_rate_per_km:     config.fuel_rate_per_km,
    bonus_multiplier:     config.bonus_multiplier,
    job_target_reduction: config.job_target_reduction,
  }).eq("tier", tier);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function updateRiderRankOverride(
  riderId: string,
  tier: RiderTier | null
): Promise<{ success: true } | { success: false; error: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { error } = await supabase.from("admin_users").update({ rank_tier_override: tier }).eq("user_id", riderId);
  if (error) return { success: false as const, error: error.message };
  return { success: true as const };
}

export async function fetchRiderKpiForAdmin(riderId: string, month: string): Promise<{ stats: MonthlyStats; targets: RiderTargets }> {
  await requireAuth();
  const supabase = createServerClient();
  const { start, end } = monthBounds(month);

  const [{ data: shifts }, { data: requests }, { data: userRow }, { data: rankRows }] = await Promise.all([
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
      .select("monthly_jobs_target, monthly_distance_target, min_acceptance_rate, monthly_bonus_jobs, monthly_bonus_amount, rank_tier_override")
      .eq("user_id", riderId)
      .single(),
    supabase.from("rank_configs").select("*"),
  ]);

  const jobsCompleted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const jobsAttempted  = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_attempted ?? 0), 0);
  const jobsDeclined   = (shifts ?? []).reduce((s, sh) => s + (sh.jobs_declined  ?? 0), 0);
  const distanceKm     = (shifts ?? []).reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const goodsValueThb  = (requests ?? []).reduce((s, r) => s + (r.actual_price ?? 0), 0);
  const totalOffered   = jobsAttempted + jobsDeclined;
  const reqDistTotal   = (requests ?? []).reduce((s, r) => s + (r.distance_km ?? 0), 0);

  const configs: RankConfig[] = (rankRows ?? []).map(r => ({
    tier: r.tier as RiderTier, label_th: r.label_th,
    min_jobs_month: r.min_jobs_month, commission_rate: Number(r.commission_rate),
    fuel_rate_per_km: Number(r.fuel_rate_per_km), bonus_multiplier: Number(r.bonus_multiplier),
    job_target_reduction: r.job_target_reduction,
  }));
  const monthlyTier = computeMonthlyTier(jobsCompleted, configs, userRow?.rank_tier_override as RiderTier | null);
  const rankConfig  = configs.find(c => c.tier === monthlyTier) ?? { tier: "bronze" as RiderTier, label_th: "บรอนซ์", min_jobs_month: 0, commission_rate: 0, fuel_rate_per_km: 0, bonus_multiplier: 1, job_target_reduction: 0 };

  return {
    stats: {
      jobsCompleted, jobsAttempted, jobsDeclined, distanceKm, goodsValueThb, monthlyTier, rankConfig,
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

export async function fetchRiderLifetimeForAdmin(riderId: string): Promise<{
  lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
  tier: RiderTier; badges: Badge[];
}> {
  await requireAuth();
  const supabase = createServerClient();

  const { data: allShifts } = await supabase
    .from("rider_shifts")
    .select("clocked_in_at, jobs_completed, jobs_attempted, jobs_declined, total_distance_km")
    .eq("rider_id", riderId)
    .order("clocked_in_at", { ascending: false });

  const lifetimeCompleted  = (allShifts ?? []).reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const lifetimeDistanceKm = (allShifts ?? []).reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const currentStreak      = computeStreak(allShifts ?? []);
  const tier               = computeTier(lifetimeCompleted);
  const badges = computeBadges({ lifetimeCompleted, lifetimeDistanceKm, currentStreak, monthAcceptanceRate: null, monthAttempted: 0 });

  return { lifetimeCompleted, lifetimeDistanceKm, currentStreak, tier, badges };
}
