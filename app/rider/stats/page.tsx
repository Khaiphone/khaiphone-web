"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Trophy, Flame, Star } from "lucide-react";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";
import { Sk } from "@/app/rider/skeleton";
import { fetchMyMonthlyStats, fetchMyLifetimeStats, fetchLeaderboard } from "@/app/actions/rider-stats";
import type { MonthlyStats, RiderTargets, LeaderboardEntry } from "@/app/actions/rider-stats";
import { computeTier } from "@/lib/rider-kpi";
import type { Badge, RiderTier } from "@/lib/rider-kpi";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function pct(r: number | null) { return r != null ? `${Math.round(r * 100)}%` : "—"; }

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("th-TH", { month: "long", year: "numeric" });
}

function prevMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const TIER_CONFIG: Record<RiderTier, { label: string; emoji: string; color: string; nextAt: number | null }> = {
  bronze:  { label: "Bronze",  emoji: "🥉", color: "#cd7f32", nextAt: 20  },
  silver:  { label: "Silver",  emoji: "🥈", color: "#9ca3af", nextAt: 50  },
  gold:    { label: "Gold",    emoji: "🥇", color: "#c9a84c", nextAt: 100 },
  diamond: { label: "Diamond", emoji: "💎", color: "#60a5fa", nextAt: null },
};

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color, label, sub }: {
  value: number; max: number; color: string; label: string; sub?: string;
}) {
  const pctNum = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const done   = value >= max;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: done ? color : "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, color: done ? color : "#6b7280" }}>
          {sub ?? `${value} / ${max}`}
          {done && " ✓"}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: "#e5e7eb", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pctNum}%`, borderRadius: 99, background: color, transition: "width 0.5s ease" }} />
      </div>
    </div>
  );
}

// ── Rate pill ─────────────────────────────────────────────────────────────────

function RatePill({ label, value, target, good }: { label: string; value: number | null; target?: number | null; good?: boolean }) {
  const pctNum = value != null ? Math.round(value * 100) : null;
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

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { CARD, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 } = useRiderTheme();
  const { userId } = useRiderSession();

  const curMonthStr = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [month, setMonth]             = useState(curMonthStr);
  const [stats, setStats]             = useState<MonthlyStats | null>(null);
  const [targets, setTargets]         = useState<RiderTargets | null>(null);
  const [lifetime, setLifetime]       = useState<{
    lifetimeCompleted: number; lifetimeDistanceKm: number; currentStreak: number;
    tier: RiderTier; badges: Badge[];
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [monthly, life, board] = await Promise.all([
      fetchMyMonthlyStats(month),
      fetchMyLifetimeStats(),
      fetchLeaderboard(month),
    ]);
    setStats(monthly.stats);
    setTargets(monthly.targets);
    setLifetime(life);
    setLeaderboard(board);
    setLoading(false);
  }, [userId, month]);

  useEffect(() => { load(); }, [load]);

  const tier       = lifetime?.tier ?? computeTier(0);
  const tierCfg    = TIER_CONFIG[tier];
  const streak     = lifetime?.currentStreak ?? 0;
  const badges     = lifetime?.badges ?? [];
  const earnedBadges = badges.filter(b => b.earned);
  const myPosition = leaderboard.findIndex(e => e.riderId === userId);

  // ── Bonus status ──
  const bonusTarget = targets?.monthly_bonus_jobs;
  const bonusAmount = targets?.monthly_bonus_amount;
  const bonusLeft   = bonusTarget != null && stats != null ? Math.max(0, bonusTarget - stats.jobsCompleted) : null;
  const bonusDone   = bonusLeft === 0;

  // ── Next tier ──
  const nextTierAt    = tierCfg.nextAt;
  const lifeCompleted = lifetime?.lifetimeCompleted ?? 0;
  const tierPct       = nextTierAt != null ? (lifeCompleted / nextTierAt) * 100 : 100;

  const isCurrentMonth = month === curMonthStr;
  const ORANGE = "#f97316";
  const GOLD   = "#c9a84c";

  return (
    <div style={{ padding: "16px 16px 32px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Tier header ── */}
      <div style={{
        background: `linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)`,
        borderRadius: 18, padding: "20px 20px 18px", color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 44, lineHeight: 1 }}>{tierCfg.emoji}</div>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 2px", fontSize: 11, color: "rgba(255,255,255,.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7 }}>ระดับ</p>
            <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: tierCfg.color }}>{tierCfg.label}</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,.6)" }}>สะสม {fmt(lifeCompleted)} งาน · {fmt(Math.round(lifetime?.lifetimeDistanceKm ?? 0))} กม.</p>
          </div>
          {streak > 0 && (
            <div style={{ textAlign: "center" }}>
              <Flame size={20} color="#f97316" />
              <p style={{ margin: "2px 0 0", fontSize: 15, fontWeight: 800, color: "#f97316" }}>{streak}</p>
              <p style={{ margin: 0, fontSize: 9, color: "rgba(255,255,255,.4)" }}>วันติด</p>
            </div>
          )}
        </div>

        {nextTierAt != null && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>
                อีก {nextTierAt - lifeCompleted} งาน → {TIER_CONFIG[computeTier(nextTierAt)].label}
              </span>
              <span style={{ fontSize: 11, color: tierCfg.color, fontWeight: 700 }}>{Math.round(tierPct)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, tierPct)}%`, borderRadius: 99, background: tierCfg.color, transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Month selector ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 14px" }}>
        <button onClick={() => setMonth(prevMonth(month))} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: TEXT2 }}>
          <ChevronLeft size={18} />
        </button>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>{monthLabel(month)}</p>
        <button
          onClick={() => setMonth(nextMonth(month))}
          disabled={isCurrentMonth}
          style={{ background: "none", border: "none", cursor: isCurrentMonth ? "not-allowed" : "pointer", padding: 4, color: isCurrentMonth ? BORDER : TEXT2 }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Goals + Bonus ── */}
      {loading ? (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          {[0,1,2].map(i => <Sk key={i} w="100%" h={32} r={6} />)}
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 16px 4px" }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.7 }}>เป้าเดือนนี้</p>

          {targets?.monthly_jobs_target != null && stats != null && (
            <ProgressBar
              value={stats.jobsCompleted}
              max={targets.monthly_jobs_target}
              color={GREEN}
              label="งานสำเร็จ"
              sub={`${stats.jobsCompleted} / ${targets.monthly_jobs_target} งาน`}
            />
          )}
          {targets?.monthly_distance_target != null && stats != null && (
            <ProgressBar
              value={Math.round(stats.distanceKm)}
              max={targets.monthly_distance_target}
              color={ACCENT}
              label="ระยะทาง"
              sub={`${Math.round(stats.distanceKm)} / ${targets.monthly_distance_target} กม.`}
            />
          )}
          {targets?.min_acceptance_rate != null && stats?.acceptanceRate != null && (
            <ProgressBar
              value={Math.round((stats.acceptanceRate ?? 0) * 100)}
              max={Math.round(targets.min_acceptance_rate * 100)}
              color={stats.acceptanceRate >= targets.min_acceptance_rate ? GREEN : RED}
              label="อัตราการรับงาน"
              sub={`${Math.round((stats.acceptanceRate ?? 0) * 100)}% (เป้า ${Math.round(targets.min_acceptance_rate * 100)}%)`}
            />
          )}

          {/* Bonus card */}
          {bonusTarget != null && bonusAmount != null && stats != null && (
            <div style={{ marginBottom: 12, padding: "12px 14px", borderRadius: 12, background: bonusDone ? "rgba(22,163,74,0.08)" : "rgba(201,168,76,0.08)", border: `1px solid ${bonusDone ? GREEN : GOLD}40` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: bonusDone ? GREEN : GOLD }}>
                    {bonusDone ? "🎉 โบนัสถึงเป้าแล้ว!" : `อีก ${bonusLeft} งาน = โบนัส`}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{stats.jobsCompleted} / {bonusTarget} งาน</p>
                </div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: bonusDone ? GREEN : GOLD }}>฿{fmt(bonusAmount)}</p>
              </div>
            </div>
          )}

          {!targets?.monthly_jobs_target && !targets?.monthly_distance_target && (
            <p style={{ margin: "0 0 12px", fontSize: 13, color: TEXT2 }}>ยังไม่มีการตั้งเป้าหมาย</p>
          )}
        </div>
      )}

      {/* ── KPI grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[0,1,2,3].map(i => <Sk key={i} w="100%" h={80} r={12} />)}
        </div>
      ) : stats && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2, fontWeight: 600 }}>งานสำเร็จ</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: GREEN }}>{stats.jobsCompleted}</p>
              <p style={{ margin: 0, fontSize: 10, color: TEXT2 }}>งาน</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2, fontWeight: 600 }}>รายได้</p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: GOLD }}>฿{fmt(stats.earningsThb)}</p>
              <p style={{ margin: 0, fontSize: 10, color: TEXT2 }}>บาท</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2, fontWeight: 600 }}>ระยะทาง</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: ACCENT }}>{Math.round(stats.distanceKm)}</p>
              <p style={{ margin: 0, fontSize: 10, color: TEXT2 }}>กม.</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, color: TEXT2, fontWeight: 600 }}>เฉลี่ย/งาน</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: ORANGE }}>
                {stats.avgDistPerJob != null ? stats.avgDistPerJob.toFixed(1) : "—"}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: TEXT2 }}>กม./งาน</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <RatePill label="อัตราการรับงาน" value={stats.acceptanceRate} target={targets?.min_acceptance_rate} />
            <RatePill label="อัตราสำเร็จ"    value={stats.completionRate} good={stats.completionRate != null ? stats.completionRate >= 0.7 : undefined} />
          </div>
        </>
      )}

      {/* ── Leaderboard ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
          <Trophy size={14} color={GOLD} />
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>Leaderboard {monthLabel(month)}</p>
        </div>
        {loading ? (
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[0,1,2].map(i => <Sk key={i} w="100%" h={40} r={8} />)}
          </div>
        ) : leaderboard.length === 0 ? (
          <p style={{ margin: 0, padding: "24px 16px", textAlign: "center", fontSize: 13, color: TEXT2 }}>ยังไม่มีข้อมูล</p>
        ) : (
          <div>
            {leaderboard.slice(0, 5).map((e, i) => {
              const isMe = e.riderId === userId;
              const rankEmoji = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
              return (
                <div key={e.riderId} style={{
                  padding: "10px 16px", borderBottom: i < Math.min(leaderboard.length, 5) - 1 ? `1px solid ${BORDER}` : "none",
                  background: isMe ? `${ACCENT}08` : "transparent",
                  display: "flex", alignItems: "center", gap: 12,
                }}>
                  <span style={{ fontSize: 16, minWidth: 28, textAlign: "center" }}>{rankEmoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? ACCENT : TEXT }}>
                      {e.name}{isMe ? " (คุณ)" : ""}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{Math.round(e.distanceKm)} กม. · ฿{fmt(e.earningsThb)}</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: isMe ? ACCENT : TEXT }}>{e.jobsCompleted} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT2 }}>งาน</span></p>
                </div>
              );
            })}

            {/* Show own position if outside top 5 */}
            {myPosition >= 5 && (
              <>
                <div style={{ padding: "6px 16px", background: "#f9fafb" }}>
                  <p style={{ margin: 0, fontSize: 10, color: TEXT2, textAlign: "center" }}>· · ·</p>
                </div>
                <div style={{ padding: "10px 16px", background: `${ACCENT}08`, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, minWidth: 28, textAlign: "center", fontWeight: 700, color: ACCENT }}>{myPosition + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: ACCENT }}>{leaderboard[myPosition].name} (คุณ)</p>
                    <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{Math.round(leaderboard[myPosition].distanceKm)} กม.</p>
                  </div>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: ACCENT }}>{leaderboard[myPosition].jobsCompleted} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT2 }}>งาน</span></p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Badges ── */}
      {!loading && badges.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Star size={14} color={GOLD} />
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Badges ({earnedBadges.length}/{badges.length})
            </p>
          </div>
          <div style={{ padding: "14px 16px", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {badges.map(b => (
              <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: b.earned ? 1 : 0.25, filter: b.earned ? "none" : "grayscale(1)" }}>
                <div style={{ fontSize: 28 }}>{b.emoji}</div>
                <p style={{ margin: 0, fontSize: 9, color: b.earned ? TEXT : TEXT2, textAlign: "center", lineHeight: 1.3, fontWeight: b.earned ? 600 : 400 }}>{b.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
