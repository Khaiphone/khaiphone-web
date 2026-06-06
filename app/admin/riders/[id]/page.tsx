"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { APIProvider, Map, AdvancedMarker, Polyline } from "@vis.gl/react-google-maps";
import {
  ArrowLeft, Battery, MapPin, Clock, CheckCircle2, AlertTriangle, Settings, X,
  Trophy, Flame, Star, Package, ChevronLeft, ChevronRight, XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderShiftStats, fetchRiderTrail, fetchActiveRiders, adminCloseRiderShift } from "@/app/actions/rider-tracking";
import { fmtDistance, fmtEta, etaMinutes, distanceToOfficeKm, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";
import {
  fetchRiderKpiForAdmin, updateRiderTargets, updateRiderRankOverride,
  fetchLeaderboard, fetchRiderLifetimeForAdmin,
} from "@/app/actions/rider-stats";
import { fetchRiderHistory, fetchRiderStats, fetchRiderEarnings } from "@/app/actions/rider";
import type { MonthlyStats, RiderTargets, RiderTier, LeaderboardEntry } from "@/app/actions/rider-stats";
import type { AdminRequest } from "@/lib/types/admin";
import type { Badge } from "@/lib/rider-kpi";
import { computeTier } from "@/lib/rider-kpi";

// ── Admin palette ──────────────────────────────────────────────────────────────
const DARK   = "#1a1a2e";
const GOLD   = "#c9a84c";
const BORDER = "#e5e7eb";
const TEXT   = "#1a1a1a";
const TEXT2  = "#6b7280";
const GREEN  = "#16a34a";
const ACCENT = "#2563eb";
const RED    = "#dc2626";

// ── Rider-app palette (used inside ผลงาน / งานของฉัน tabs) ───────────────────
const R_CARD   = "#FFFFFF";
const R_BORDER = "#E5E7EB";
const R_GREEN  = "#16a34a";
const R_RED    = "#dc2626";
const R_TEXT   = "#111827";
const R_TEXT2  = "#6b7280";
const R_ACCENT = "#4ade80";
const R_GOLD   = "#c9a84c";
const R_ORANGE = "#f97316";

// ── Types ──────────────────────────────────────────────────────────────────────
type TopTab = "overview" | "stats" | "history";

type Shift = {
  id: string; clocked_in_at: string; clocked_out_at: string | null;
  jobs_completed: number; total_distance_km: number; ended_reason: string | null;
};
type TrailPoint = { lat: number; lng: number; recorded_at: string };

type LifetimeData = {
  lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
  tier: RiderTier; badges: Badge[];
};
type EarningsData = Awaited<ReturnType<typeof fetchRiderEarnings>>;
type HistStats    = { completedJobs: number; cancelledJobs: number; totalEarnings: number };

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number)  { return n.toLocaleString("th-TH"); }
function shiftDuration(start: string, end?: string | null) {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}
function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
}
function thTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function curMonthStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
}
function prevMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(m: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(m: string) {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

const TIER_CFG: Record<RiderTier, { label: string; emoji: string; color: string; nextAt: number | null }> = {
  bronze:  { label: "Bronze",  emoji: "🥉", color: "#cd7f32", nextAt: 20  },
  silver:  { label: "Silver",  emoji: "🥈", color: "#9ca3af", nextAt: 50  },
  gold:    { label: "Gold",    emoji: "🥇", color: "#c9a84c", nextAt: 100 },
  diamond: { label: "Diamond", emoji: "💎", color: "#60a5fa", nextAt: null },
};
const MONTHLY_TIER_COLOR: Record<string, string> = {
  bronze: "#cd7f32", silver: "#9ca3af", gold: "#c9a84c", diamond: "#60a5fa",
};
const MONTHLY_TIER_EMOJI: Record<string, string> = {
  bronze: "🥉", silver: "🥈", gold: "🥇", diamond: "💎",
};

// ── Main component ─────────────────────────────────────────────────────────────
export default function RiderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const curMonth = curMonthStr();

  // ── Top-level tab ──
  const [topTab, setTopTab] = useState<TopTab>("overview");

  // ── Overview state ──
  const [riderName, setRiderName]   = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; mode: string; battery: number | null } | null>(null);
  const [currentJob, setCurrentJob] = useState<{ order_number: string; device_model: string | null; customer_name: string | null; appt_location: string | null } | null>(null);
  const [shifts,    setShifts]      = useState<Shift[]>([]);
  const [trail,     setTrail]       = useState<TrailPoint[]>([]);
  const [ovTab,     setOvTab]       = useState<"today" | "week" | "month">("today");
  const [loading,   setLoading]     = useState(true);
  const [closingShift, setClosingShift] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // ── KPI (overview) ──
  const [kpiStats,   setKpiStats]   = useState<MonthlyStats | null>(null);
  const [kpiTargets, setKpiTargets] = useState<RiderTargets | null>(null);
  const [editTarget, setEditTarget] = useState(false);
  const [tJobsTarget,  setTJobsTarget]  = useState("");
  const [tDistTarget,  setTDistTarget]  = useState("");
  const [tAcceptRate,  setTAcceptRate]  = useState("");
  const [tBonusJobs,   setTBonusJobs]   = useState("");
  const [tBonusAmount, setTBonusAmount] = useState("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [rankOverride, setRankOverride] = useState<RiderTier | "">("");
  const [savingRank,   setSavingRank]   = useState(false);

  // ── Stats tab state ──
  const [statsMonth,     setStatsMonth]     = useState(curMonth);
  const [statsLoading,   setStatsLoading]   = useState(false);
  const [statsLoaded,    setStatsLoaded]    = useState(false);
  const [statsKpi,       setStatsKpi]       = useState<MonthlyStats | null>(null);
  const [statsTargets,   setStatsTargets]   = useState<RiderTargets | null>(null);
  const [statsLifetime,  setStatsLifetime]  = useState<LifetimeData | null>(null);
  const [statsLeader,    setStatsLeader]    = useState<LeaderboardEntry[]>([]);
  const [statsEarnings,  setStatsEarnings]  = useState<EarningsData | null>(null);

  // ── Recent shifts (overview — always 30 days, not tied to tab) ──
  const [recentShifts, setRecentShifts] = useState<Shift[]>([]);

  // ── History tab state ──
  const [histLoading, setHistLoading] = useState(false);
  const [histLoaded,  setHistLoaded]  = useState(false);
  const [histJobs,    setHistJobs]    = useState<AdminRequest[]>([]);
  const [histStats,   setHistStats]   = useState<HistStats>({ completedJobs: 0, cancelledJobs: 0, totalEarnings: 0 });

  // ── Overview load ──
  const dateRange = useCallback(() => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    if (ovTab === "today") return { from: to, to };
    if (ovTab === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split("T")[0], to };
    }
    const d = new Date(now); d.setDate(1);
    return { from: d.toISOString().split("T")[0], to };
  }, [ovTab]);

  const loadOverview = useCallback(async () => {
    const { from, to } = dateRange();
    const past30 = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);
    const [shiftData, allRiders, recentData] = await Promise.all([
      fetchRiderShiftStats(id, from, to),
      fetchActiveRiders(),
      fetchRiderShiftStats(id, past30, todayStr),
    ]);
    setShifts(shiftData as Shift[]);
    setRecentShifts(recentData as Shift[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const me = (allRiders as any[]).find(r => r.rider_id === id);
    if (me) {
      setRiderName(me.admin_users?.name ?? "ไรเดอร์");
      setCurrentLocation({ lat: me.lat, lng: me.lng, mode: me.tracking_mode, battery: me.battery_pct });
      setCurrentJob(me.current_job ?? null);
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      fetchRiderTrail(id, since24h).then(t => setTrail(t as TrailPoint[]));
    }
    setLoading(false);
  }, [id, dateRange]);

  // ── Stats tab load ──
  const loadStats = useCallback(async (month: string) => {
    setStatsLoading(true);
    const [kpi, life, leader, earn] = await Promise.all([
      fetchRiderKpiForAdmin(id, month),
      statsLifetime ? Promise.resolve(statsLifetime) : fetchRiderLifetimeForAdmin(id),
      fetchLeaderboard(month),
      statsEarnings ? Promise.resolve(statsEarnings) : fetchRiderEarnings(id),
    ]);
    setStatsKpi(kpi.stats);
    setStatsTargets(kpi.targets);
    setStatsLifetime(life);
    setStatsLeader(leader);
    setStatsEarnings(earn);
    setStatsLoading(false);
    setStatsLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, statsLifetime, statsEarnings]);

  // ── History tab load ──
  const loadHistory = useCallback(async () => {
    if (histLoaded) return;
    setHistLoading(true);
    const [jobs, stats] = await Promise.all([fetchRiderHistory(id, 3), fetchRiderStats(id)]);
    setHistJobs(jobs);
    setHistStats({ completedJobs: stats.completedJobs, cancelledJobs: stats.cancelledJobs, totalEarnings: stats.totalEarnings });
    setHistLoading(false);
    setHistLoaded(true);
  }, [id, histLoaded]);

  // ── Effects ──
  useEffect(() => {
    loadOverview();
    fetchRiderKpiForAdmin(id, curMonth).then(({ stats, targets }) => {
      setKpiStats(stats);
      setKpiTargets(targets);
      setTJobsTarget(targets.monthly_jobs_target != null ? String(targets.monthly_jobs_target) : "");
      setTDistTarget(targets.monthly_distance_target != null ? String(targets.monthly_distance_target) : "");
      setTAcceptRate(targets.min_acceptance_rate != null ? String(Math.round(targets.min_acceptance_rate * 100)) : "");
      setTBonusJobs(targets.monthly_bonus_jobs != null ? String(targets.monthly_bonus_jobs) : "");
      setTBonusAmount(targets.monthly_bonus_amount != null ? String(targets.monthly_bonus_amount) : "");
    });
    const ch = supabase
      .channel(`rider-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, () => loadOverview())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, loadOverview]);

  useEffect(() => {
    if (topTab === "stats" && !statsLoaded) loadStats(statsMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTab]);

  useEffect(() => {
    if (topTab === "stats" && statsLoaded) loadStats(statsMonth);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statsMonth]);

  useEffect(() => {
    if (topTab === "history") loadHistory();
  }, [topTab, loadHistory]);

  async function handleCloseShift() {
    setClosingShift(true);
    await adminCloseRiderShift(id);
    setShowCloseConfirm(false);
    setClosingShift(false);
    loadOverview();
  }

  const totalJobs   = shifts.reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const totalDistKm = shifts.reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const openShift   = shifts.find(s => !s.clocked_out_at);
  const distOffice  = currentLocation ? distanceToOfficeKm(currentLocation.lat, currentLocation.lng) : null;

  // stats tab derived
  const lifetimeTier     = statsLifetime?.tier ?? computeTier(0);
  const tierCfg          = TIER_CFG[lifetimeTier];
  const lifeCompleted    = statsLifetime?.lifetimeCompleted ?? 0;
  const streak           = statsLifetime?.currentStreak ?? 0;
  const badges           = statsLifetime?.badges ?? [];
  const earnedBadges     = badges.filter(b => b.earned);
  const myPosition       = statsLeader.findIndex(e => e.riderId === id);
  const bonusTarget      = statsTargets?.monthly_bonus_jobs;
  const bonusAmount      = statsTargets?.monthly_bonus_amount;
  const bonusLeft        = bonusTarget != null && statsKpi != null ? Math.max(0, bonusTarget - statsKpi.jobsCompleted) : null;
  const bonusDone        = bonusLeft === 0;
  const nextTierAt       = tierCfg.nextAt;
  const tierPct          = nextTierAt != null ? (lifeCompleted / nextTierAt) * 100 : 100;
  const monthlyTierColor = statsKpi ? (MONTHLY_TIER_COLOR[statsKpi.monthlyTier] ?? R_GOLD) : R_GOLD;
  const monthlyTierEmoji = statsKpi ? (MONTHLY_TIER_EMOJI[statsKpi.monthlyTier] ?? "🥉") : "🥉";
  const isCurrentMonth   = statsMonth === curMonth;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Header ── */}
      <div style={{ background: DARK, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", color: GOLD, cursor: "pointer", padding: 0 }}>
          <ArrowLeft size={20} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, color: GOLD, fontSize: 18, fontWeight: 800 }}>{riderName || "ไรเดอร์"}</h1>
          {currentLocation && (
            <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.5)" }}>
              {currentLocation.mode === "return" ? "🏠 กลับออฟฟิศ" : currentLocation.mode === "enroute" ? "🛵 กำลังเดินทาง" : "ออนไลน์"}
              {distOffice != null && ` · ${fmtDistance(distOffice)} จากออฟฟิศ · ${fmtEta(etaMinutes(distOffice))}`}
            </p>
          )}
        </div>
        <button onClick={() => router.push("/admin/riders/manage")} style={{ background: "none", border: "none", color: "rgba(255,255,255,.5)", cursor: "pointer", padding: 4 }}>
          <Settings size={18} />
        </button>
        {currentLocation?.battery != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: currentLocation.battery < 20 ? "#ef4444" : "rgba(255,255,255,.6)", fontSize: 13 }}>
            <Battery size={14} />{currentLocation.battery}%
          </div>
        )}
      </div>

      {/* ── Top tabs ── */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, display: "flex" }}>
        {(["overview", "stats", "history"] as TopTab[]).map(t => {
          const label = t === "overview" ? "ภาพรวม" : t === "stats" ? "ผลงาน" : "งานของฉัน";
          const active = topTab === t;
          return (
            <button
              key={t}
              onClick={() => setTopTab(t)}
              style={{ flex: 1, padding: "12px 0", border: "none", background: active ? `${ACCENT}10` : "transparent", color: active ? ACCENT : TEXT2, fontSize: 14, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit", borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent" }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── OVERVIEW TAB ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {topTab === "overview" && (
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, maxWidth: 900, margin: "0 auto" }}>

          {openShift && (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>Shift ปัจจุบัน</p>
                <button onClick={() => setShowCloseConfirm(true)} style={{ fontSize: 12, fontWeight: 600, color: RED, background: "rgba(220,38,38,0.08)", border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                  ปิด Shift แทน
                </button>
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <InfoItem label="เริ่มทำงาน" value={thTime(openShift.clocked_in_at)} />
                <InfoItem label="ระยะเวลา"   value={shiftDuration(openShift.clocked_in_at)} />
                <InfoItem label="งานสำเร็จ"  value={`${openShift.jobs_completed} งาน`} />
              </div>
              {currentJob && (
                <div style={{ marginTop: 10, padding: "8px 12px", background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`, borderRadius: 8 }}>
                  <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: ACCENT }}>งานปัจจุบัน — #{currentJob.order_number}</p>
                  <p style={{ margin: 0, fontSize: 13, color: TEXT }}>{currentJob.device_model ?? "—"} · {currentJob.customer_name ?? "—"}</p>
                  {currentJob.appt_location && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>{currentJob.appt_location}</p>}
                </div>
              )}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ borderBottom: `1px solid ${BORDER}`, display: "flex" }}>
              {(["today", "week", "month"] as const).map(t => (
                <button key={t} onClick={() => setOvTab(t)} style={{ flex: 1, padding: "10px 0", border: "none", background: ovTab === t ? `${ACCENT}10` : "transparent", color: ovTab === t ? ACCENT : TEXT2, fontSize: 13, fontWeight: ovTab === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit", borderBottom: ovTab === t ? `2px solid ${ACCENT}` : "none" }}>
                  {t === "today" ? "วันนี้" : t === "week" ? "สัปดาห์" : "เดือนนี้"}
                </button>
              ))}
            </div>
            <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              <KpiItem label="งานสำเร็จ" value={String(totalJobs)} icon={<CheckCircle2 size={16} color={GREEN} />} />
              <KpiItem label="ระยะทาง" value={totalDistKm > 0 ? `${totalDistKm.toFixed(0)} กม.` : "—"} icon={<MapPin size={16} color={ACCENT} />} />
              <KpiItem label="จำนวน Shift" value={String(shifts.length)} icon={<Clock size={16} color={GOLD} />} />
            </div>
          </div>

          {currentLocation && (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>เส้นทาง 24 ชั่วโมงที่ผ่านมา</p>
              </div>
              <div style={{ height: 320 }}>
                <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""}>
                  <Map defaultCenter={{ lat: currentLocation.lat, lng: currentLocation.lng }} defaultZoom={13} mapId="22ccc57d606934a9a2ae7032" style={{ width: "100%", height: "100%" }} disableDefaultUI>
                    <AdvancedMarker position={{ lat: OFFICE_LAT, lng: OFFICE_LNG }}>
                      <div style={{ background: DARK, color: GOLD, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>🏠</div>
                    </AdvancedMarker>
                    <AdvancedMarker position={{ lat: currentLocation.lat, lng: currentLocation.lng }}>
                      <div style={{ width: 14, height: 14, borderRadius: "50%", background: ACCENT, border: "2px solid #fff", boxShadow: "0 0 6px rgba(37,99,235,.5)" }} />
                    </AdvancedMarker>
                    {trail.length > 1 && (
                      <Polyline path={trail.map(p => ({ lat: p.lat, lng: p.lng }))} strokeColor={ACCENT} strokeWeight={3} strokeOpacity={0.7} />
                    )}
                  </Map>
                </APIProvider>
              </div>
            </div>
          )}

          {kpiStats && (
            <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>KPI เดือนนี้</p>
                  {(() => {
                    const t = kpiStats.monthlyTier;
                    return <span style={{ fontSize: 13, fontWeight: 700, color: MONTHLY_TIER_COLOR[t] ?? GOLD }}>{MONTHLY_TIER_EMOJI[t] ?? "🥉"} {kpiStats.rankConfig?.label_th ?? t}</span>;
                  })()}
                </div>
                <button onClick={() => setEditTarget(p => !p)} style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                  {editTarget ? "ปิด" : "ตั้งเป้า"}
                </button>
              </div>
              <div style={{ padding: "10px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 10 }}>
                <p style={{ margin: 0, fontSize: 11, color: TEXT2, fontWeight: 600, whiteSpace: "nowrap" }}>ปรับ rank manual:</p>
                <select value={rankOverride} onChange={e => setRankOverride(e.target.value as RiderTier | "")} style={{ flex: 1, padding: "5px 8px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, fontFamily: "inherit", color: TEXT, outline: "none" }}>
                  <option value="">อัตโนมัติ (จากผลงาน)</option>
                  <option value="bronze">🥉 บรอนซ์</option>
                  <option value="silver">🥈 ซิลเวอร์</option>
                  <option value="gold">🥇 โกลด์</option>
                  <option value="diamond">💎 ไดมอนด์</option>
                </select>
                <button disabled={savingRank} onClick={async () => { setSavingRank(true); await updateRiderRankOverride(id, rankOverride || null); setSavingRank(false); const { stats } = await fetchRiderKpiForAdmin(id, curMonth); setKpiStats(stats); }} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: DARK, color: GOLD, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: savingRank ? 0.6 : 1, whiteSpace: "nowrap" }}>
                  {savingRank ? "..." : "บันทึก"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
                {[
                  { label: "งานสำเร็จ", value: String(kpiStats.jobsCompleted), target: kpiTargets?.monthly_jobs_target != null ? `/ ${kpiTargets.monthly_jobs_target}` : undefined, color: GREEN },
                  { label: "ระยะทาง",   value: `${Math.round(kpiStats.distanceKm)} กม.`, target: kpiTargets?.monthly_distance_target != null ? `/ ${kpiTargets.monthly_distance_target}` : undefined, color: ACCENT },
                  { label: "รับงาน",    value: kpiStats.acceptanceRate != null ? `${Math.round(kpiStats.acceptanceRate * 100)}%` : "—", target: kpiTargets?.min_acceptance_rate != null ? `เป้า ${Math.round(kpiTargets.min_acceptance_rate * 100)}%` : undefined, color: kpiStats.acceptanceRate != null && kpiTargets?.min_acceptance_rate != null ? (kpiStats.acceptanceRate >= kpiTargets.min_acceptance_rate ? GREEN : RED) : TEXT },
                  { label: "สำเร็จ",    value: kpiStats.completionRate != null ? `${Math.round(kpiStats.completionRate * 100)}%` : "—", color: TEXT },
                ].map((k, i) => (
                  <div key={k.label} style={{ padding: "12px 14px", borderRight: i < 3 ? `1px solid ${BORDER}` : "none", textAlign: "center" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 10, color: TEXT2 }}>{k.label}</p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</p>
                    {k.target && <p style={{ margin: 0, fontSize: 10, color: TEXT2 }}>{k.target}</p>}
                  </div>
                ))}
              </div>
              {editTarget && (
                <div style={{ borderTop: `1px solid ${BORDER}`, padding: "14px 16px" }}>
                  <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>ตั้งเป้าหมายรายเดือน</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "เป้างาน (งาน)",           val: tJobsTarget,  set: setTJobsTarget  },
                      { label: "เป้าระยะทาง (กม.)",        val: tDistTarget,  set: setTDistTarget  },
                      { label: "อัตรารับงานขั้นต่ำ (%)",   val: tAcceptRate,  set: setTAcceptRate  },
                      { label: "โบนัส เมื่อครบ (งาน)",     val: tBonusJobs,   set: setTBonusJobs   },
                      { label: "โบนัสจำนวน (บาท)",         val: tBonusAmount, set: setTBonusAmount },
                    ].map(f => (
                      <div key={f.label}>
                        <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2 }}>{f.label}</p>
                        <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder="—" style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${BORDER}`, fontSize: 13, color: TEXT, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    ))}
                  </div>
                  <button disabled={savingTarget} onClick={async () => {
                    setSavingTarget(true);
                    const res = await updateRiderTargets(id, {
                      monthly_jobs_target:     tJobsTarget     ? Number(tJobsTarget)      : null,
                      monthly_distance_target: tDistTarget     ? Number(tDistTarget)      : null,
                      min_acceptance_rate:     tAcceptRate     ? Number(tAcceptRate) / 100 : null,
                      monthly_bonus_jobs:      tBonusJobs      ? Number(tBonusJobs)       : null,
                      monthly_bonus_amount:    tBonusAmount    ? Number(tBonusAmount)     : null,
                    });
                    if (res.success) { const { targets } = await fetchRiderKpiForAdmin(id, curMonth); setKpiTargets(targets); setEditTarget(false); }
                    else alert(res.error);
                    setSavingTarget(false);
                  }} style={{ marginTop: 12, width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: DARK, color: GOLD, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: savingTarget ? 0.6 : 1 }}>
                    {savingTarget ? "กำลังบันทึก..." : "บันทึกเป้าหมาย"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>ประวัติ Shift (30 วันล่าสุด)</p>
            </div>
            {loading ? (
              <div style={{ padding: 24, textAlign: "center", color: TEXT2 }}>กำลังโหลด...</div>
            ) : recentShifts.filter(s => s.clocked_out_at).length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: TEXT2, fontSize: 14 }}>ยังไม่มีประวัติ</div>
            ) : (
              recentShifts.filter(s => s.clocked_out_at).map((s, i, arr) => (
                <div key={s.id} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: TEXT }}>{thDate(s.clocked_in_at)}</p>
                    <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{thTime(s.clocked_in_at)} – {s.clocked_out_at ? thTime(s.clocked_out_at) : "กำลังทำงาน"} · {shiftDuration(s.clocked_in_at, s.clocked_out_at)}</p>
                    {s.ended_reason === "auto_timeout" && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#f97316" }}><AlertTriangle size={10} style={{ verticalAlign: "middle" }} /> ปิด shift อัตโนมัติ</p>}
                    {s.ended_reason === "admin_closed"  && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>ปิดโดย Admin</p>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: GREEN }}>{s.jobs_completed} งาน</p>
                    {s.total_distance_km > 0 && <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{s.total_distance_km.toFixed(0)} กม.</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── STATS TAB (ผลงาน) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {topTab === "stats" && (
        <div style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap: 14, maxWidth: 600, margin: "0 auto" }}>

          {/* Monthly rank header */}
          <div style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)", borderRadius: 18, padding: "20px 20px 18px", color: "#fff" }}>
            <p style={{ margin: "0 0 12px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: 1 }}>แรงค์เดือนนี้</p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 44, lineHeight: 1 }}>{statsLoading ? "⏳" : monthlyTierEmoji}</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: monthlyTierColor }}>
                  {statsKpi?.rankConfig?.label_th ?? statsKpi?.monthlyTier ?? "—"}
                </p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,.5)" }}>{riderName}</p>
              </div>
              {streak > 0 && (
                <div style={{ textAlign: "center" }}>
                  <Flame size={20} color="#f97316" />
                  <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800, color: "#f97316" }}>{streak}</p>
                  <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,.4)" }}>วันติด</p>
                </div>
              )}
            </div>

            {/* Monthly benefits */}
            {statsKpi?.rankConfig && (statsKpi.rankConfig.commission_rate > 0 || statsKpi.rankConfig.fuel_rate_per_km > 0) && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {statsKpi.rankConfig.commission_rate > 0 && (
                  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.1)", color: monthlyTierColor, fontWeight: 600 }}>
                    Commission {Math.round(statsKpi.rankConfig.commission_rate * 100)}%
                  </span>
                )}
                {statsKpi.rankConfig.fuel_rate_per_km > 0 && (
                  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.1)", color: monthlyTierColor, fontWeight: 600 }}>
                    น้ำมัน ฿{statsKpi.rankConfig.fuel_rate_per_km}/กม.
                  </span>
                )}
              </div>
            )}

            {/* Lifetime mini-badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.06)", marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>{tierCfg.emoji}</span>
              <p style={{ margin: 0, fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                Achievement: {tierCfg.label} · สะสม {fmt(lifeCompleted)} งาน · {fmt(Math.round(statsLifetime?.lifetimeDistanceKm ?? 0))} กม.
              </p>
            </div>

            {nextTierAt != null && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>อีก {nextTierAt - lifeCompleted} งาน → {TIER_CFG[computeTier(nextTierAt)].label}</span>
                  <span style={{ fontSize: 11, color: tierCfg.color, fontWeight: 700 }}>{Math.round(tierPct)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(100, tierPct)}%`, borderRadius: 99, background: tierCfg.color, transition: "width 0.5s ease" }} />
                </div>
              </div>
            )}
          </div>

          {/* Month selector */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 12, padding: "10px 14px" }}>
            <button onClick={() => setStatsMonth(prevMonth(statsMonth))} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: R_TEXT2 }}><ChevronLeft size={18} /></button>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: R_TEXT }}>{monthLabel(statsMonth)}</p>
            <button onClick={() => setStatsMonth(nextMonth(statsMonth))} disabled={isCurrentMonth} style={{ background: "none", border: "none", cursor: isCurrentMonth ? "not-allowed" : "pointer", padding: 4, color: isCurrentMonth ? R_BORDER : R_TEXT2 }}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Goals + Bonus */}
          <div style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 14, padding: "16px 16px 4px" }}>
            <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: R_TEXT2, textTransform: "uppercase", letterSpacing: 0.7 }}>เป้าเดือนนี้</p>
            {statsLoading ? (
              <p style={{ margin: "0 0 12px", fontSize: 13, color: R_TEXT2 }}>กำลังโหลด...</p>
            ) : (
              <>
                {statsTargets?.monthly_jobs_target != null && statsKpi != null && (
                  <RiderProgressBar value={statsKpi.jobsCompleted} max={statsTargets.monthly_jobs_target} color={R_GREEN} label="งานสำเร็จ" sub={`${statsKpi.jobsCompleted} / ${statsTargets.monthly_jobs_target} งาน`} />
                )}
                {statsTargets?.monthly_distance_target != null && statsKpi != null && (
                  <RiderProgressBar value={Math.round(statsKpi.distanceKm)} max={statsTargets.monthly_distance_target} color={R_ACCENT} label="ระยะทาง" sub={`${Math.round(statsKpi.distanceKm)} / ${statsTargets.monthly_distance_target} กม.`} />
                )}
                {bonusTarget != null && bonusAmount != null && statsKpi != null && (
                  <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, background: bonusDone ? "rgba(22,163,74,0.08)" : "rgba(201,168,76,0.08)", border: `1px solid ${bonusDone ? R_GREEN : R_GOLD}40` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: bonusDone ? R_GREEN : R_GOLD }}>{bonusDone ? "🎉 โบนัสถึงเป้าแล้ว!" : `อีก ${bonusLeft} งาน = โบนัส`}</p>
                        <p style={{ margin: 0, fontSize: 11, color: R_TEXT2 }}>{statsKpi.jobsCompleted} / {bonusTarget} งาน</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: bonusDone ? R_GREEN : R_GOLD }}>฿{fmt(bonusAmount)}</p>
                    </div>
                  </div>
                )}
                {!statsTargets?.monthly_jobs_target && !statsTargets?.monthly_distance_target && (
                  <p style={{ margin: "0 0 12px", fontSize: 13, color: R_TEXT2 }}>ยังไม่มีการตั้งเป้าหมาย</p>
                )}
              </>
            )}
          </div>

          {/* KPI grid */}
          {statsKpi && !statsLoading && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { label: "งานสำเร็จ", value: statsKpi.jobsCompleted,                    unit: "งาน",    color: R_GREEN  },
                  { label: "มูลค่าสินค้า", value: `฿${fmt(statsKpi.goodsValueThb)}`,       unit: "บาท",    color: R_GOLD, isStr: true },
                  { label: "ระยะทาง",   value: Math.round(statsKpi.distanceKm),           unit: "กม.",    color: R_ACCENT },
                  { label: "เฉลี่ย/งาน", value: statsKpi.avgDistPerJob != null ? statsKpi.avgDistPerJob.toFixed(1) : "—", unit: "กม./งาน", color: R_ORANGE, isStr: true },
                ].map(k => (
                  <div key={k.label} style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
                    <p style={{ margin: "0 0 4px", fontSize: 11, color: R_TEXT2, fontWeight: 600 }}>{k.label}</p>
                    <p style={{ margin: 0, fontSize: k.isStr ? 22 : 26, fontWeight: 800, color: k.color }}>{k.isStr ? k.value : k.value}</p>
                    <p style={{ margin: 0, fontSize: 10, color: R_TEXT2 }}>{k.unit}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <RatePill label="อัตราการรับงาน" value={statsKpi.acceptanceRate} target={statsTargets?.min_acceptance_rate} />
                <RatePill label="อัตราสำเร็จ" value={statsKpi.completionRate} good={statsKpi.completionRate != null ? statsKpi.completionRate >= 0.7 : undefined} />
              </div>
            </>
          )}

          {/* Leaderboard */}
          <div style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${R_BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={14} color={R_GOLD} />
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: R_TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>Leaderboard {monthLabel(statsMonth)}</p>
            </div>
            {statsLoading ? (
              <p style={{ margin: 0, padding: "24px 16px", textAlign: "center", fontSize: 13, color: R_TEXT2 }}>กำลังโหลด...</p>
            ) : statsLeader.length === 0 ? (
              <p style={{ margin: 0, padding: "24px 16px", textAlign: "center", fontSize: 13, color: R_TEXT2 }}>ยังไม่มีข้อมูล</p>
            ) : (
              <div>
                {statsLeader.slice(0, 5).map((e, i) => {
                  const isMe = e.riderId === id;
                  const rankEmoji = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
                  return (
                    <div key={e.riderId} style={{ padding: "10px 16px", borderBottom: i < Math.min(statsLeader.length, 5) - 1 ? `1px solid ${R_BORDER}` : "none", background: isMe ? `${R_ACCENT}08` : "transparent", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 16, minWidth: 28, textAlign: "center" }}>{rankEmoji}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? R_ACCENT : R_TEXT }}>{e.name}{isMe ? " ← คนนี้" : ""}</p>
                        <p style={{ margin: 0, fontSize: 11, color: R_TEXT2 }}>{Math.round(e.distanceKm)} กม. · ฿{fmt(e.earningsThb)}</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: isMe ? R_ACCENT : R_TEXT }}>{e.jobsCompleted} <span style={{ fontSize: 11, fontWeight: 400, color: R_TEXT2 }}>งาน</span></p>
                    </div>
                  );
                })}
                {myPosition >= 5 && (
                  <>
                    <div style={{ padding: "6px 16px", background: "#f9fafb" }}>
                      <p style={{ margin: 0, fontSize: 10, color: R_TEXT2, textAlign: "center" }}>· · ·</p>
                    </div>
                    <div style={{ padding: "10px 16px", background: `${R_ACCENT}08`, display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 14, minWidth: 28, textAlign: "center", fontWeight: 700, color: R_ACCENT }}>{myPosition + 1}.</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: R_ACCENT }}>{statsLeader[myPosition].name} ← คนนี้</p>
                      </div>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: R_ACCENT }}>{statsLeader[myPosition].jobsCompleted} <span style={{ fontSize: 11, fontWeight: 400, color: R_TEXT2 }}>งาน</span></p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Badges */}
          {badges.length > 0 && (
            <div style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${R_BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={14} color={R_GOLD} />
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: R_TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>Badges ({earnedBadges.length}/{badges.length})</p>
              </div>
              <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {badges.map(b => (
                  <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: b.earned ? 1 : 0.25, filter: b.earned ? "none" : "grayscale(1)" }}>
                    <div style={{ fontSize: 28 }}>{b.emoji}</div>
                    <p style={{ margin: 0, fontSize: 9, color: b.earned ? R_TEXT : R_TEXT2, textAlign: "center", lineHeight: 1.3, fontWeight: b.earned ? 600 : 400 }}>{b.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent jobs */}
          <div>
            <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, color: R_TEXT2, textTransform: "uppercase", letterSpacing: 0.8 }}>งานล่าสุด</p>
            {statsLoading ? (
              <p style={{ textAlign: "center", color: R_TEXT2 }}>กำลังโหลด...</p>
            ) : (statsEarnings?.recent?.length ?? 0) === 0 ? (
              <div style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
                <p style={{ margin: 0, color: R_TEXT2, fontSize: 14 }}>ยังไม่มีงาน</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {statsEarnings!.recent.map((job: any, i: number) => {
                  const isDone = job.status === "completed";
                  return (
                    <div key={i} style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 14, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Package size={16} color={isDone ? R_ACCENT : R_TEXT2} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: R_TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.device_model} {job.device_storage}</p>
                          <p style={{ margin: 0, fontSize: 11, color: R_TEXT2 }}>{fmtDateTime(job.created_at)}</p>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0, marginLeft: 12, textAlign: "right" }}>
                        {isDone
                          ? <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: R_ACCENT }}>฿{fmt(job.actual_price ?? job.estimated_price ?? 0)}</p>
                          : <span style={{ fontSize: 11, fontWeight: 600, color: R_TEXT2, background: "#f3f4f6", borderRadius: 6, padding: "3px 8px" }}>
                              {job.status === "cancelled" ? "ยกเลิก" : job.status === "no_show" ? "ไม่มา" : "ปฏิเสธ"}
                            </span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {/* ── HISTORY TAB (งานของฉัน) ── */}
      {/* ══════════════════════════════════════════════════════════════════════════ */}
      {topTab === "history" && (
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, maxWidth: 600, margin: "0 auto" }}>

          {/* Month stats */}
          <div style={{ background: R_CARD, borderRadius: 16, padding: 20 }}>
            <p style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 600, color: R_TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>สถิติเดือนนี้</p>
            {histLoading ? (
              <p style={{ margin: 0, color: R_TEXT2, fontSize: 13 }}>กำลังโหลด...</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                {[
                  { label: "งานสำเร็จ", value: histStats.completedJobs, color: R_GREEN },
                  { label: "ยกเลิก",    value: histStats.cancelledJobs,  color: R_RED   },
                  { label: "มูลค่า",    value: `฿${fmt(histStats.totalEarnings)}`, color: R_ACCENT, small: true },
                ].map(({ label, value, color, small }) => (
                  <div key={label} style={{ background: "#f9fafb", borderRadius: 12, padding: "12px 10px", textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: small ? 14 : 24, fontWeight: 800, color }}>{value}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: R_TEXT2 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job list */}
          <div>
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: R_TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ประวัติงาน (3 เดือน)</p>
            {histLoading ? (
              <p style={{ textAlign: "center", color: R_TEXT2, padding: 20 }}>กำลังโหลด...</p>
            ) : histJobs.length === 0 ? (
              <div style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 16, padding: 40, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 15, color: R_TEXT2 }}>ยังไม่มีประวัติงาน</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {histJobs.map(job => {
                  const isCompleted = job.status === "completed";
                  const price = job.device.actualPrice ?? job.device.estimatedPrice;
                  return (
                    <div key={job.id} style={{ background: R_CARD, border: `1px solid ${R_BORDER}`, borderRadius: 14, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {isCompleted ? <CheckCircle2 size={16} color={R_GREEN} /> : <XCircle size={16} color={R_RED} />}
                          <div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: R_TEXT }}>{job.customer.name}</p>
                            <p style={{ margin: 0, fontSize: 11, color: R_TEXT2 }}>{fmtDate(job.createdAt)}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: isCompleted ? R_ACCENT : R_TEXT2 }}>
                          {isCompleted ? `฿${fmt(price)}` : "ยกเลิก"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f9fafb", borderRadius: 8, padding: "8px 10px" }}>
                        <Package size={13} color={R_TEXT2} />
                        <span style={{ fontSize: 13, color: R_TEXT2 }}>{job.device.model} {job.device.storage}</span>
                        <span style={{ fontSize: 11, color: R_TEXT2, marginLeft: "auto" }}>{job.orderNumber}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Close shift confirm modal ── */}
      {showCloseConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setShowCloseConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>ปิด Shift แทนไรเดอร์?</p>
              <button onClick={() => setShowCloseConfirm(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: TEXT2 }}><X size={18} /></button>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: TEXT2, lineHeight: 1.6 }}>ระบบจะ clock-out ให้ <strong>{riderName}</strong> ทันที และบันทึกว่า "ปิดโดย Admin"</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCloseConfirm(false)} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: `1px solid ${BORDER}`, background: "transparent", fontSize: 14, color: TEXT2, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
              <button onClick={handleCloseShift} disabled={closingShift} style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: RED, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: closingShift ? 0.6 : 1 }}>
                {closingShift ? "กำลังปิด..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: "0 0 2px", fontSize: 11, color: TEXT2 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{value}</p>
    </div>
  );
}

function KpiItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
      <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800, color: TEXT }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{label}</p>
    </div>
  );
}

function RiderProgressBar({ value, max, color, label, sub }: { value: number; max: number; color: string; label: string; sub?: string }) {
  const pct  = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const done = value >= max;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: done ? color : "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, color: done ? color : "#6b7280" }}>{sub ?? `${value} / ${max}`}{done && " ✓"}</span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

function RatePill({ label, value, target, good }: { label: string; value: number | null; target?: number | null; good?: boolean }) {
  const pctNum = value != null ? Math.min(100, Math.round(value * 100)) : null;
  const isGood = good !== undefined ? good : (target != null && value != null ? value >= target : true);
  const color  = pctNum == null ? "#9ca3af" : isGood ? "#16a34a" : "#dc2626";
  return (
    <div style={{ background: "#fff", border: `1px solid #e5e7eb`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
      <p style={{ margin: "0 0 4px", fontSize: 11, color: "#6b7280", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{pctNum != null ? `${pctNum}%` : "—"}</p>
      {target != null && <p style={{ margin: "2px 0 0", fontSize: 10, color: "#9ca3af" }}>เป้า {Math.round(target * 100)}%</p>}
    </div>
  );
}
