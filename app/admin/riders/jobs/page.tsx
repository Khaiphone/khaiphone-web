"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Clock, CheckCircle2, XCircle, ClipboardList, Loader2,
  AlertTriangle, Package, Truck, PackageCheck, RotateCcw, Target,
} from "lucide-react";
import { fetchRiderJobs, adminConfirmReturn, adminReclaimJob } from "@/app/actions/admin-requests";
import type { AdminRequest, RequestStatus } from "@/lib/types/admin";
import StatusBadge from "@/app/components/admin/StatusBadge";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";

const BLUE   = "#3B82F6";
const GREEN  = "#10B981";
const ORANGE = "#F59E0B";
const RED    = "#EF4444";
const PURPLE = "#8B5CF6";

type ViewMode  = "jobs" | "sla";
type FilterKey = "all" | "unassigned" | "waiting" | "in_progress" | "completed" | "cancelled";

const IN_PROGRESS_STATUSES: RequestStatus[] = ["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"];
const COMPLETED_STATUSES:   RequestStatus[] = ["completed"];
const CANCELLED_STATUSES:   RequestStatus[] = ["cancelled", "no_show", "rejected"];

function jobCategory(job: AdminRequest): FilterKey {
  if (COMPLETED_STATUSES.includes(job.status))   return "completed";
  if (CANCELLED_STATUSES.includes(job.status))   return "cancelled";
  if (IN_PROGRESS_STATUSES.includes(job.status)) return "in_progress";
  if (job.status === "confirmed" && !job.riderId) return "unassigned";
  if (job.status === "confirmed" &&  job.riderId) return "waiting";
  return "all";
}

function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function shiftDate(iso: string, delta: number) {
  const d = new Date(iso); d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}
function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
}

type RiderRow = {
  riderId: string; riderName: string;
  total: number; completed: number; inProgress: number; cancelled: number; waiting: number;
  pendingReturn: number;
};

// ── SLA helpers ────────────────────────────────────────────────────────────────

// Planner SLA: appointment time → rider arrival (inspecting)
type PunctualitySLA =
  | { status: "no_appt" }
  | { status: "cancelled" }
  | { status: "pending";  apptMs: number }
  | { status: "overdue";  apptMs: number }
  | { status: "ontime";   apptMs: number; arrivedMs: number; deltaMin: number }
  | { status: "slight";   apptMs: number; arrivedMs: number; deltaMin: number }
  | { status: "late";     apptMs: number; arrivedMs: number; deltaMin: number };

// Rider SLA: arrival (inspecting) → completed
type EfficiencySLA =
  | { status: "no_arrival" }
  | { status: "pending";  arrivedMs: number }
  | { status: "fast";     arrivedMs: number; completedMs: number; deltaMin: number }
  | { status: "slight";   arrivedMs: number; completedMs: number; deltaMin: number }
  | { status: "slow";     arrivedMs: number; completedMs: number; deltaMin: number };

type SLARow = { job: AdminRequest; punct: PunctualitySLA; eff: EfficiencySLA };

function computePunctualitySLA(job: AdminRequest): PunctualitySLA {
  const { date, time } = job.appointment;
  if (!date || !time) return { status: "no_appt" };
  if (CANCELLED_STATUSES.includes(job.status)) return { status: "cancelled" };

  const apptMs = new Date(`${date}T${time}:00+07:00`).getTime();
  const arrivedEntry = (job.statusLog ?? []).find(s => s.status === "inspecting");

  if (!arrivedEntry) {
    return Date.now() > apptMs + 20 * 60_000
      ? { status: "overdue", apptMs }
      : { status: "pending", apptMs };
  }

  const arrivedMs = new Date(arrivedEntry.timestamp).getTime();
  const deltaMin  = Math.round((arrivedMs - apptMs) / 60_000);
  return deltaMin <= 5
    ? { status: "ontime", apptMs, arrivedMs, deltaMin }
    : deltaMin <= 20
    ? { status: "slight", apptMs, arrivedMs, deltaMin }
    : { status: "late",   apptMs, arrivedMs, deltaMin };
}

function computeEfficiencySLA(job: AdminRequest): EfficiencySLA {
  const arrivedEntry  = (job.statusLog ?? []).find(s => s.status === "inspecting");
  if (!arrivedEntry) return { status: "no_arrival" };

  const arrivedMs    = new Date(arrivedEntry.timestamp).getTime();
  const completedEntry = [...(job.statusLog ?? [])].reverse().find(s => s.status === "completed");
  if (!completedEntry) return { status: "pending", arrivedMs };

  const completedMs = new Date(completedEntry.timestamp).getTime();
  const deltaMin    = Math.round((completedMs - arrivedMs) / 60_000);
  return deltaMin <= 30
    ? { status: "fast",   arrivedMs, completedMs, deltaMin }
    : deltaMin <= 60
    ? { status: "slight", arrivedMs, completedMs, deltaMin }
    : { status: "slow",   arrivedMs, completedMs, deltaMin };
}

function punctLabel(r: PunctualitySLA) {
  if (r.status === "ontime")  return { label: "ถึงตรงเวลา",    color: GREEN,  bg: GREEN  + "18" };
  if (r.status === "slight")  return { label: "สายเล็กน้อย",   color: ORANGE, bg: ORANGE + "18" };
  if (r.status === "late")    return { label: "สายมาก",         color: RED,    bg: RED    + "18" };
  if (r.status === "overdue") return { label: "ยังไม่ถึง",      color: RED,    bg: RED    + "12" };
  if (r.status === "pending") return { label: "รอไรเดอร์",      color: BLUE,   bg: BLUE   + "12" };
  return { label: "—", color: TEXT3, bg: BORDER };
}

function effLabel(r: EfficiencySLA) {
  if (r.status === "fast")   return { label: "เสร็จเร็ว",      color: GREEN,  bg: GREEN  + "18" };
  if (r.status === "slight") return { label: "ล่าช้าเล็กน้อย", color: ORANGE, bg: ORANGE + "18" };
  if (r.status === "slow")   return { label: "ช้าเกินไป",       color: RED,    bg: RED    + "18" };
  if (r.status === "pending") return { label: "กำลังดำเนินการ", color: BLUE,  bg: BLUE   + "12" };
  return { label: "—", color: TEXT3, bg: BORDER };
}

function minTxt(min: number, late = false) {
  return late ? `ช้า ${min} นาที` : `${min} นาที`;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ["#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#06B6D4","#EC4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "25", border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color }}>
      {name.slice(0, 1)}
    </div>
  );
}

function getMonthRange(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export default function RiderJobsPage() {
  const router = useRouter();
  const today  = new Date().toISOString().slice(0, 10);
  const now    = new Date();

  const [view,        setView]       = useState<ViewMode>("jobs");
  const [mode,        setMode]       = useState<"day" | "month">("day");
  const [date,        setDate]       = useState(today);
  const [monthYear,   setMonthYear]  = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [jobs,        setJobs]       = useState<AdminRequest[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [filter,      setFilter]     = useState<FilterKey>("all");
  const [expanded,    setExpanded]   = useState(true);
  const [confirmBusy, setConfirmBusy] = useState<string | null>(null);
  const [reclaimBusy, setReclaimBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    if (mode === "day") {
      fetchRiderJobs(date).then(d => { setJobs(d); setLoading(false); });
    } else {
      const range = getMonthRange(monthYear.year, monthYear.month);
      fetchRiderJobs(undefined, range).then(d => { setJobs(d); setLoading(false); });
    }
  }, [mode, date, monthYear]);

  function refresh() {
    if (mode === "day") {
      fetchRiderJobs(date).then(d => setJobs(d));
    } else {
      const range = getMonthRange(monthYear.year, monthYear.month);
      fetchRiderJobs(undefined, range).then(d => setJobs(d));
    }
  }

  function shiftMonth(delta: number) {
    setMonthYear(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1)  { m = 12; y--; }
      return { year: y, month: m };
    });
  }

  const stats = useMemo(() => {
    const completed  = jobs.filter(j => jobCategory(j) === "completed");
    const cancelled  = jobs.filter(j => jobCategory(j) === "cancelled");
    const inProgress = jobs.filter(j => jobCategory(j) === "in_progress");
    const waiting    = jobs.filter(j => jobCategory(j) === "waiting");
    const unassigned = jobs.filter(j => jobCategory(j) === "unassigned");
    const withRider      = inProgress;
    const pendingSubmit  = completed.filter(j => !j.returnedToOfficeAt);
    const pendingConfirm = completed.filter(j => j.returnSubmittedAt && !j.returnedToOfficeAt);
    const returned       = completed.filter(j => !!j.returnedToOfficeAt);
    return { total: jobs.length, completed, cancelled, inProgress, waiting, unassigned, withRider, pendingSubmit, pendingConfirm, returned };
  }, [jobs]);

  const riderRows = useMemo<RiderRow[]>(() => {
    const map = new Map<string, RiderRow>();
    for (const j of jobs) {
      if (!j.riderId) continue;
      if (!map.has(j.riderId)) {
        map.set(j.riderId, { riderId: j.riderId, riderName: j.riderName ?? "ไรเดอร์", total: 0, completed: 0, inProgress: 0, cancelled: 0, waiting: 0, pendingReturn: 0 });
      }
      const row = map.get(j.riderId)!;
      row.total++;
      const cat = jobCategory(j);
      if (cat === "completed")   { row.completed++; if (!j.returnedToOfficeAt) row.pendingReturn++; }
      if (cat === "in_progress") { row.inProgress++; }
      if (cat === "cancelled")   { row.cancelled++;  }
      if (cat === "waiting")     { row.waiting++;    }
    }
    return [...map.values()].sort((a, b) => b.completed - a.completed || b.total - a.total);
  }, [jobs]);

  const unassignedJobs = useMemo(() => jobs.filter(j => !j.riderId && j.status === "confirmed"), [jobs]);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter(j => jobCategory(j) === filter);
  }, [jobs, filter]);

  // ── SLA data ──────────────────────────────────────────────────────────────
  const slaRows = useMemo((): SLARow[] =>
    jobs
      .filter(j => j.appointment.date && j.appointment.time)
      .map(j => ({ job: j, punct: computePunctualitySLA(j), eff: computeEfficiencySLA(j) }))
      .filter(r => r.punct.status !== "no_appt" && r.punct.status !== "cancelled")
      .sort((a, b) => {
        const aMs = ("apptMs" in a.punct ? a.punct.apptMs : 0);
        const bMs = ("apptMs" in b.punct ? b.punct.apptMs : 0);
        return aMs - bMs;
      }),
    [jobs]
  );

  // Planner SLA summary
  const pOntime  = slaRows.filter(r => r.punct.status === "ontime").length;
  const pSlight  = slaRows.filter(r => r.punct.status === "slight").length;
  const pLate    = slaRows.filter(r => r.punct.status === "late" || r.punct.status === "overdue").length;
  const pPending = slaRows.filter(r => r.punct.status === "pending").length;
  const pTotal   = slaRows.length;
  const pRate    = pTotal > 0 ? Math.round((pOntime / Math.max(1, pTotal - pPending)) * 100) : null;

  // Rider SLA summary (only rows that have arrival data)
  const effRows  = slaRows.filter(r => r.eff.status !== "no_arrival");
  const eFast    = effRows.filter(r => r.eff.status === "fast").length;
  const eSlight  = effRows.filter(r => r.eff.status === "slight").length;
  const eSlow    = effRows.filter(r => r.eff.status === "slow").length;
  const ePending = effRows.filter(r => r.eff.status === "pending").length;
  const eTotal   = effRows.length;
  const eRate    = eTotal > 0 ? Math.round((eFast / Math.max(1, eTotal - ePending)) * 100) : null;

  const slaRate  = pRate;

  const FILTER_TABS: Array<{ key: FilterKey; label: string; count: number; color: string }> = [
    { key: "all",         label: "ทั้งหมด",        count: stats.total,              color: TEXT    },
    { key: "unassigned",  label: "ยังไม่จ่ายงาน",  count: stats.unassigned.length,  color: RED     },
    { key: "waiting",     label: "รอรับงาน",        count: stats.waiting.length,     color: ORANGE  },
    { key: "in_progress", label: "กำลังดำเนินการ",  count: stats.inProgress.length,  color: BLUE    },
    { key: "completed",   label: "เสร็จสิ้น",       count: stats.completed.length,   color: GREEN   },
    { key: "cancelled",   label: "ยกเลิก",          count: stats.cancelled.length,   color: TEXT3   },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Sticky header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: CARD, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ padding: "12px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
              <ArrowLeft size={22} />
            </button>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>รายงานงานไรเดอร์</h1>
            </div>
            {/* Mode toggle */}
            <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${BORDER}`, overflow: "hidden", flexShrink: 0 }}>
              <button onClick={() => setMode("day")}   style={{ padding: "5px 10px", fontSize: 12, fontWeight: 600, background: mode === "day"   ? GOLD + "20" : "none", color: mode === "day"   ? GOLD : TEXT2, border: "none", cursor: "pointer", fontFamily: "inherit" }}>รายวัน</button>
              <button onClick={() => setMode("month")} style={{ padding: "5px 10px", fontSize: 12, fontWeight: 600, background: mode === "month" ? GOLD + "20" : "none", color: mode === "month" ? GOLD : TEXT2, border: "none", cursor: "pointer", fontFamily: "inherit" }}>รายเดือน</button>
            </div>
            {/* Date/Month nav */}
            {mode === "day" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => setDate(d => shiftDate(d, -1))} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "flex", color: TEXT2 }}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: "nowrap" }}>
                  {date === today ? <span style={{ color: GOLD }}>วันนี้</span> : new Date(date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                </span>
                <button onClick={() => setDate(d => shiftDate(d, 1))} disabled={date >= today} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: date >= today ? "default" : "pointer", display: "flex", color: date >= today ? BORDER : TEXT2, opacity: date >= today ? 0.4 : 1 }}><ChevronRight size={15} /></button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => shiftMonth(-1)} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "flex", color: TEXT2 }}><ChevronLeft size={15} /></button>
                <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: "nowrap" }}>
                  {new Date(monthYear.year, monthYear.month - 1, 1).toLocaleDateString("th-TH", { month: "short", year: "numeric" })}
                </span>
                <button onClick={() => shiftMonth(1)} disabled={monthYear.year === now.getFullYear() && monthYear.month >= now.getMonth() + 1} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "flex", color: TEXT2, opacity: (monthYear.year === now.getFullYear() && monthYear.month >= now.getMonth() + 1) ? 0.4 : 1 }}><ChevronRight size={15} /></button>
              </div>
            )}
          </div>

          <p style={{ margin: "0 0 10px", fontSize: 12, color: TEXT3 }}>
            {mode === "day"
              ? thDate(date + "T00:00:00")
              : (() => { const r = getMonthRange(monthYear.year, monthYear.month); return `${new Date(r.from + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })} — ${new Date(r.to + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}`; })()
            }
          </p>

          {/* ── View tabs ── */}
          <div style={{ display: "flex", gap: 0, borderTop: `1px solid ${BORDER}`, margin: "0 -20px" }}>
            {([["jobs", "งาน"], ["sla", "SLA Report"]] as [ViewMode, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                flex: 1, padding: "10px 0", border: "none", fontFamily: "inherit",
                background: view === v ? CARD : "transparent",
                color: view === v ? (v === "sla" ? PURPLE : GOLD) : TEXT2,
                fontSize: 13, fontWeight: view === v ? 700 : 400, cursor: "pointer",
                borderBottom: view === v ? `2px solid ${v === "sla" ? PURPLE : GOLD}` : "2px solid transparent",
              }}>
                {v === "sla" && <Target size={13} style={{ marginRight: 5, verticalAlign: "middle" }} />}
                {label}
                {v === "sla" && slaRate !== null && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: slaRate >= 80 ? GREEN : slaRate >= 60 ? ORANGE : RED, fontWeight: 700 }}>
                    {slaRate}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <Loader2 size={28} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
        </div>
      ) : view === "sla" ? (

        /* ════════════════════════════════════════════════════════════════════ */
        /* ── SLA REPORT TAB ── */
        /* ════════════════════════════════════════════════════════════════════ */
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Planner SLA card ── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Clock size={15} color={BLUE} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>Planner SLA · ตรงเวลานัดหมาย</p>
              {pRate !== null && (
                <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800, color: pRate >= 80 ? GREEN : pRate >= 60 ? ORANGE : RED }}>{pRate}%</span>
              )}
            </div>
            {pTotal > 0 && (
              <div style={{ height: 7, borderRadius: 99, background: BORDER, overflow: "hidden", display: "flex", marginBottom: 10 }}>
                <div style={{ width: `${(pOntime / pTotal) * 100}%`, background: GREEN }} />
                <div style={{ width: `${(pSlight / pTotal) * 100}%`, background: ORANGE }} />
                <div style={{ width: `${(pLate / pTotal) * 100}%`, background: RED }} />
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[
                { label: "ถึงตรงเวลา",  count: pOntime,  color: GREEN  },
                { label: "สายเล็กน้อย", count: pSlight,  color: ORANGE },
                { label: "สายมาก",       count: pLate,    color: RED    },
                { label: "รอ",           count: pPending, color: BLUE   },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{count}</p>
                  <p style={{ margin: 0, fontSize: 10, color: TEXT3 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rider SLA card ── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Target size={15} color={PURPLE} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>Rider SLA · เวลาทำงาน (เป้า ≤ 30 นาที)</p>
              {eRate !== null && (
                <span style={{ marginLeft: "auto", fontSize: 22, fontWeight: 800, color: eRate >= 80 ? GREEN : eRate >= 60 ? ORANGE : RED }}>{eRate}%</span>
              )}
            </div>
            {eTotal > 0 && (
              <div style={{ height: 7, borderRadius: 99, background: BORDER, overflow: "hidden", display: "flex", marginBottom: 10 }}>
                <div style={{ width: `${(eFast / eTotal) * 100}%`, background: GREEN }} />
                <div style={{ width: `${(eSlight / eTotal) * 100}%`, background: ORANGE }} />
                <div style={{ width: `${(eSlow / eTotal) * 100}%`, background: RED }} />
              </div>
            )}
            {eTotal === 0 ? (
              <p style={{ margin: 0, fontSize: 12, color: TEXT3 }}>ยังไม่มีข้อมูลเวลามาถึง (ต้องมีสถานะ "กำลังตรวจเครื่อง")</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                {[
                  { label: "≤ 30 นาที",    count: eFast,    color: GREEN  },
                  { label: "30–60 นาที",   count: eSlight,  color: ORANGE },
                  { label: "> 60 นาที",    count: eSlow,    color: RED    },
                  { label: "กำลังทำ",      count: ePending, color: BLUE   },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color }}>{count}</p>
                    <p style={{ margin: 0, fontSize: 10, color: TEXT3 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-job SLA list */}
          {slaRows.length === 0 ? (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "60px 20px", textAlign: "center" }}>
              <Target size={32} color={BORDER} style={{ marginBottom: 12 }} />
              <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: TEXT2 }}>ไม่มีงานที่มีนัดหมาย</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT3 }}>SLA จะแสดงเมื่อมีงานที่ระบุวันและเวลานัด</p>
            </div>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>
                  รายการ <span style={{ fontWeight: 400, color: TEXT2 }}>({slaRows.length} งาน)</span>
                </p>
              </div>
              {slaRows.map(({ job, punct, eff }, i) => {
                const pl = punctLabel(punct);
                const el = effLabel(eff);
                const apptTimeStr = job.appointment.time ? `${job.appointment.time} น.` : "";
                const arrivedTimeStr = ("arrivedMs" in punct) ? fmtTime(new Date(punct.arrivedMs).toISOString()) : null;
                const completedTimeStr = ("completedMs" in eff) ? fmtTime(new Date(eff.completedMs).toISOString()) : null;
                const borderColor = pl.color === GREEN && (eff.status === "fast" || eff.status === "no_arrival" || eff.status === "pending") ? GREEN
                  : pl.color === RED || el.color === RED ? RED : ORANGE;
                return (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/admin/requests/${job.id}`)}
                    style={{
                      padding: "14px 16px",
                      borderBottom: i < slaRows.length - 1 ? `1px solid ${BORDER}` : "none",
                      cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: 12,
                      borderLeft: `3px solid ${borderColor}`,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Row 1: order + month date */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT2 }}>{job.orderNumber}</span>
                        {mode === "month" && job.appointment.date && (
                          <span style={{ fontSize: 11, color: TEXT3 }}>
                            {new Date(job.appointment.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                      {/* Row 2: device + customer */}
                      <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: TEXT }}>
                        {job.device.model}{job.device.storage ? ` · ${job.device.storage}` : ""}
                      </p>
                      <p style={{ margin: "0 0 8px", fontSize: 12, color: TEXT2 }}>
                        {job.customer.name}
                        {job.riderName && <span style={{ color: TEXT3 }}> · {job.riderName}</span>}
                      </p>
                      {/* Row 3: Planner SLA */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: TEXT3, minWidth: 60 }}>📍 Planner</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: pl.bg, color: pl.color }}>{pl.label}</span>
                        <span style={{ fontSize: 11, color: TEXT3 }}>นัด {apptTimeStr}</span>
                        {arrivedTimeStr && <span style={{ fontSize: 11, color: TEXT3 }}>→ ถึง {arrivedTimeStr}</span>}
                        {"deltaMin" in punct && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: pl.color }}>
                            {punct.deltaMin <= 0 ? `ก่อน ${Math.abs(punct.deltaMin)} นาที` : minTxt(punct.deltaMin, true)}
                          </span>
                        )}
                      </div>
                      {/* Row 4: Rider SLA */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 10, color: TEXT3, minWidth: 60 }}>⚡ Rider</span>
                        {eff.status === "no_arrival" ? (
                          <span style={{ fontSize: 11, color: TEXT3 }}>ยังไม่มีข้อมูลเวลามาถึง</span>
                        ) : (
                          <>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: el.bg, color: el.color }}>{el.label}</span>
                            {arrivedTimeStr && <span style={{ fontSize: 11, color: TEXT3 }}>ถึง {arrivedTimeStr}</span>}
                            {completedTimeStr && <span style={{ fontSize: 11, color: TEXT3 }}>→ เสร็จ {completedTimeStr}</span>}
                            {"deltaMin" in eff && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: el.color }}>{eff.deltaMin} นาที</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right: status badge */}
                    <div style={{ flexShrink: 0 }}>
                      <StatusBadge status={job.status} size="xs" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : (

        /* ════════════════════════════════════════════════════════════════════ */
        /* ── JOBS TAB (existing content) ── */
        /* ════════════════════════════════════════════════════════════════════ */
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Device custody tracking */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Truck size={14} color={BLUE} />
                <span style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>เครื่องกับไรเดอร์</span>
              </div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: BLUE }}>{stats.withRider.length}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: TEXT3 }}>เครื่องยังอยู่ระหว่างดำเนินการ</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <Clock size={14} color={ORANGE} />
                <span style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>รอแจ้งส่งคืน</span>
              </div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: stats.pendingSubmit.length > 0 ? ORANGE : TEXT3 }}>{stats.pendingSubmit.length}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: TEXT3 }}>งานเสร็จ แต่ยังไม่แจ้งส่งคืน</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${stats.pendingConfirm.length > 0 ? ORANGE + "60" : BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <RotateCcw size={14} color={stats.pendingConfirm.length > 0 ? ORANGE : TEXT3} />
                <span style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>รอยืนยันรับเครื่อง</span>
              </div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: stats.pendingConfirm.length > 0 ? ORANGE : TEXT3 }}>{stats.pendingConfirm.length}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: TEXT3 }}>ไรเดอร์แจ้งส่งแล้ว รอ office ยืนยัน</p>
            </div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <PackageCheck size={14} color={GREEN} />
                <span style={{ fontSize: 11, color: TEXT2, fontWeight: 600 }}>ส่งคืนแล้ว</span>
              </div>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: GREEN }}>{stats.returned.length}</p>
              <p style={{ margin: "3px 0 0", fontSize: 11, color: TEXT3 }}>office รับเครื่องเรียบร้อย</p>
            </div>
          </div>

          {/* Status cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {FILTER_TABS.map(({ key, label, count, color }) => {
              const active = filter === key;
              return (
                <button key={key} onClick={() => setFilter(key)} style={{ padding: "10px 12px", borderRadius: 12, border: active ? `2px solid ${color}` : `1px solid ${BORDER}`, background: active ? color + "12" : CARD, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 20, fontWeight: 800, color: active ? color : TEXT, lineHeight: 1 }}>{count}</p>
                  <p style={{ margin: 0, fontSize: 10, color: active ? color : TEXT3, fontWeight: active ? 700 : 400 }}>{label}</p>
                </button>
              );
            })}
          </div>

          {/* Unassigned alert */}
          {unassignedJobs.length > 0 && (
            <div style={{ background: "#FEF2F2", border: `1px solid ${RED}30`, borderRadius: 14, padding: "12px 16px", display: "flex", gap: 10, alignItems: "center" }}>
              <AlertTriangle size={18} color={RED} />
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>มี {unassignedJobs.length} งาน ยังไม่ถูกจ่ายงาน</p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "#B91C1C" }}>{unassignedJobs.map(j => j.orderNumber).join(", ")}</p>
              </div>
              <button onClick={() => setFilter("unassigned")} style={{ background: RED, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>ดูงาน</button>
            </div>
          )}

          {/* Rider performance cards */}
          {riderRows.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: expanded ? `1px solid ${BORDER}` : "none" }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT, flex: 1, textAlign: "left" }}>ประสิทธิภาพไรเดอร์ <span style={{ fontWeight: 400, color: TEXT3 }}>({riderRows.length} คน)</span></p>
                {expanded ? <ChevronUp size={16} color={TEXT2} /> : <ChevronDown size={16} color={TEXT2} />}
              </button>
              {expanded && riderRows.map((r, i) => {
                const successPct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
                const barColor   = successPct >= 80 ? GREEN : successPct >= 50 ? ORANGE : RED;
                const active     = r.inProgress + r.waiting;
                return (
                  <div key={r.riderId} style={{ padding: "16px", borderBottom: i < riderRows.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <Avatar name={r.riderName} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>{r.riderName}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <div style={{ flex: 1, maxWidth: 100, height: 5, borderRadius: 99, background: BORDER, overflow: "hidden" }}>
                            <div style={{ width: `${successPct}%`, height: "100%", background: barColor, borderRadius: 99, transition: "width 0.4s" }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: barColor }}>{successPct}% สำเร็จ</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>{r.total}</p>
                        <p style={{ margin: 0, fontSize: 10, color: TEXT3 }}>งานทั้งหมด</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, background: GREEN + "12", border: `1px solid ${GREEN}30`, borderRadius: 8, padding: "5px 10px" }}>
                        <CheckCircle2 size={12} color={GREEN} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>{r.completed}</span>
                        <span style={{ fontSize: 11, color: TEXT2 }}>เสร็จสิ้น</span>
                      </div>
                      {active > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: BLUE + "12", border: `1px solid ${BLUE}30`, borderRadius: 8, padding: "5px 10px" }}>
                          <Clock size={12} color={BLUE} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: BLUE }}>{active}</span>
                          <span style={{ fontSize: 11, color: TEXT2 }}>กำลังดำเนินการ</span>
                        </div>
                      )}
                      {r.cancelled > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: RED + "12", border: `1px solid ${RED}30`, borderRadius: 8, padding: "5px 10px" }}>
                          <XCircle size={12} color={RED} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>{r.cancelled}</span>
                          <span style={{ fontSize: 11, color: TEXT2 }}>ยกเลิก</span>
                        </div>
                      )}
                      {r.pendingReturn > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 5, background: ORANGE + "12", border: `1px solid ${ORANGE}30`, borderRadius: 8, padding: "5px 10px" }}>
                          <RotateCcw size={12} color={ORANGE} />
                          <span style={{ fontSize: 12, fontWeight: 700, color: ORANGE }}>{r.pendingReturn}</span>
                          <span style={{ fontSize: 11, color: TEXT2 }}>รอส่งคืนเครื่อง</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Job list */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "14px 16px 0", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: TEXT }}>
                รายการงาน <span style={{ fontWeight: 400, color: TEXT2 }}>({filtered.length} งาน)</span>
              </p>
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }}>
                {FILTER_TABS.map(({ key, label, count, color }) => {
                  const active = filter === key;
                  return (
                    <button key={key} onClick={() => setFilter(key)} style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 999, border: active ? `1px solid ${color}50` : `1px solid ${BORDER}`, background: active ? color + "12" : "transparent", color: active ? color : TEXT2, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      {label} {count > 0 && <span style={{ opacity: 0.7 }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: "48px 0", textAlign: "center" }}>
                <CheckCircle2 size={32} color={BORDER} style={{ marginBottom: 10 }} />
                <p style={{ margin: 0, fontSize: 14, color: TEXT3 }}>ไม่มีข้อมูลในหมวดนี้</p>
              </div>
            ) : filtered.map((job, i) => {
              const price    = job.device.actualPrice ?? job.device.estimatedPrice;
              const cat      = jobCategory(job);
              const catColor = cat === "completed" ? GREEN : cat === "cancelled" ? TEXT3 : cat === "unassigned" ? RED : cat === "waiting" ? ORANGE : BLUE;
              return (
                <div key={job.id} style={{ padding: "12px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div onClick={() => router.push(`/admin/requests/${job.id}`)} style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 3, borderRadius: 2, background: catColor, alignSelf: "stretch", flexShrink: 0, minHeight: 40 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT2 }}>{job.orderNumber}</span>
                        <StatusBadge status={job.status} size="xs" />
                        {job.appointment.date && mode === "month" && (
                          <span style={{ fontSize: 11, color: TEXT3 }}>📅 {new Date(job.appointment.date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                        )}
                        {job.appointment.time && (
                          <span style={{ fontSize: 11, color: TEXT3 }}>🕐 {job.appointment.time} น.</span>
                        )}
                        {cat === "completed" && job.returnedToOfficeAt && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, background: GREEN + "15", padding: "1px 6px", borderRadius: 999 }}>คืนแล้ว</span>
                        )}
                        {cat === "completed" && job.returnSubmittedAt && !job.returnedToOfficeAt && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: ORANGE, background: ORANGE + "15", padding: "1px 6px", borderRadius: 999 }}>รอยืนยัน</span>
                        )}
                      </div>
                      <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: TEXT }}>{job.device.model}{job.device.storage ? ` · ${job.device.storage}` : ""}</p>
                      <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.customer.name}{job.riderName ? <span style={{ color: TEXT3 }}> · ไรเดอร์: {job.riderName}</span> : job.status === "confirmed" ? <span style={{ color: RED, fontWeight: 600 }}> · ยังไม่จ่ายงาน</span> : null}</p>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: cat === "completed" ? GREEN : TEXT }}>฿{fmt(price)}</p>
                      {job.device.actualPrice && job.device.actualPrice !== job.device.estimatedPrice && (
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: TEXT3, textDecoration: "line-through" }}>฿{fmt(job.device.estimatedPrice)}</p>
                      )}
                    </div>
                  </div>
                  {job.riderId && ["confirmed", "pickup_scheduled", "en_route", "inspecting"].includes(job.status) && (
                    <div style={{ marginTop: 10, marginLeft: 15 }}>
                      <button
                        disabled={reclaimBusy === job.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`ดึงงาน ${job.orderNumber} คืนจาก ${job.riderName ?? "ไรเดอร์"}?`)) return;
                          setReclaimBusy(job.id);
                          const res = await adminReclaimJob(job.id);
                          if (res.success) refresh(); else alert(res.error);
                          setReclaimBusy(null);
                        }}
                        style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${RED}50`, background: RED + "15", color: RED, fontSize: 13, fontWeight: 700, cursor: reclaimBusy === job.id ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <RotateCcw size={14} />
                        {reclaimBusy === job.id ? "กำลังดึงคืน..." : "ดึงงานคืน"}
                      </button>
                    </div>
                  )}
                  {jobCategory(job) === "completed" && !job.returnedToOfficeAt && (
                    <div style={{ marginTop: 10, marginLeft: 15 }}>
                      <button
                        disabled={confirmBusy === job.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setConfirmBusy(job.id);
                          const res = await adminConfirmReturn(job.id);
                          if (res.success) refresh(); else alert(res.error);
                          setConfirmBusy(null);
                        }}
                        style={{ padding: "8px 16px", borderRadius: 10, border: `1px solid ${GREEN}50`, background: GREEN + "15", color: GREEN, fontSize: 13, fontWeight: 700, cursor: confirmBusy === job.id ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}
                      >
                        <PackageCheck size={15} />
                        {confirmBusy === job.id ? "กำลังยืนยัน..." : "ยืนยันรับเครื่องคืน"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {jobs.length === 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "60px 20px", textAlign: "center" }}>
              <ClipboardList size={36} color={BORDER} style={{ marginBottom: 12 }} />
              <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 600, color: TEXT2 }}>ไม่มีงานวันนี้</p>
              <p style={{ margin: 0, fontSize: 13, color: TEXT3 }}>งานที่มีนัดวันนี้จะแสดงที่นี่</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
