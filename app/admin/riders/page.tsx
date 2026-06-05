"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { Battery, AlertTriangle, ChevronDown, X, Zap, RefreshCw, MapPin, Clock, User, CalendarDays, UserCheck, Wrench, CheckCircle2, XCircle, BarChart2, ArrowRight, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchActiveRiders, fetchAllRidersShifts, fetchUnassignedJobs, fetchTodayRequestStats } from "@/app/actions/rider-tracking";
import { assignRider, backfillRequestCoords, autoAssignJobs } from "@/app/actions/admin-requests";
import { haversineKm, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD   = "#c9a84c";
const DARK   = "#1a1a2e";
const BG     = "#f4f5f7";
const CARD   = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT   = "#111827";
const TEXT2  = "#6b7280";
const TEXT3  = "#9ca3af";
const GREEN  = "#16a34a";
const RED    = "#dc2626";
const ORANGE = "#ea580c";
const BLUE   = "#2563eb";
const PURPLE = "#7c3aed";
const YELLOW = "#d97706";

const MODE_COLOR: Record<string, string> = {
  idle: GREEN, enroute: ORANGE, on_site: BLUE, return: PURPLE,
};
const MODE_LABEL: Record<string, string> = {
  idle: "ว่าง", enroute: "เดินทาง", on_site: "กับลูกค้า", return: "กลับออฟฟิศ",
};

// ─── Types ────────────────────────────────────────────────────────────────────
type ActiveRider = {
  rider_id: string; lat: number; lng: number;
  tracking_mode: string; battery_pct: number | null;
  last_heartbeat: string; is_online: boolean;
  current_job_id: string | null; shift_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin_users: any; rider_shifts: any; current_job: any;
};

type Job = {
  id: string; order_number: string; device_model: string | null;
  customer_name: string | null; appt_location: string | null;
  appt_date: string | null; appt_time: string | null;
  appt_lat: number | null; appt_lng: number | null;
  rider_id: string | null; rider_name: string | null;
};

type AllShift = {
  id: string; rider_id: string; rider_name: string;
  clocked_in_at: string; clocked_out_at: string | null;
  jobs_completed: number; total_distance_km: number | null; ended_reason: string | null;
};

type SLAStatus = "overdue" | "warning" | "ok" | "none";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function minutesToSLA(apptDate: string | null, apptTime: string | null): number | null {
  if (!apptDate || !apptTime) return null;
  const apptMs = new Date(`${apptDate}T${apptTime}:00`).getTime();
  const deadlineMs = apptMs - 60 * 60 * 1000; // 1 hour before
  return Math.floor((deadlineMs - Date.now()) / 60000);
}

function getSLAStatus(job: Job): SLAStatus {
  if (job.rider_id) return "none"; // already assigned
  const mins = minutesToSLA(job.appt_date, job.appt_time);
  if (mins === null) return "none";
  if (mins < 0) return "overdue";
  if (mins <= 15) return "warning";
  return "ok";
}

function slaColor(status: SLAStatus): string {
  if (status === "overdue") return RED;
  if (status === "warning") return YELLOW;
  return GREEN;
}

function slaLabel(mins: number | null): string {
  if (mins === null) return "";
  if (mins < 0) return `เกิน SLA ${Math.abs(mins)} นาที`;
  if (mins < 60) return `${mins} นาที`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h} ชม.${m > 0 ? ` ${m} นาที` : ""}`;
}

function lastSeen(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return "เพิ่งอัพเดต";
  return `${Math.floor(sec / 60)} นาทีที่แล้ว`;
}

function thDate(): string {
  return new Date().toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function shiftDuration(clockedIn: string, clockedOut?: string | null): string {
  const ms = (clockedOut ? new Date(clockedOut) : new Date()).getTime() - new Date(clockedIn).getTime();
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const hue = (name.charCodeAt(0) * 47 + (name.charCodeAt(1) ?? 0) * 23) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: `hsl(${hue},55%,50%)`, display: "flex", alignItems: "center",
      justifyContent: "center", color: "#fff", fontSize: size * 0.38, fontWeight: 700,
    }}>{initials}</div>
  );
}

function StatCard({ icon, label, value, color, bold }: { icon: string; label: string; value: number | string; color: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, borderRadius: 12, padding: "10px 16px", border: `1px solid ${BORDER}`, flex: 1, minWidth: 100 }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: TEXT2, fontWeight: 500 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: bold ? color : TEXT, lineHeight: 1.1 }}>{value}</p>
      </div>
    </div>
  );
}

// ─── JobCard sub-component ────────────────────────────────────────────────────
function JobCard({
  job, riders, assigning, assignDropdownJob, setAssignDropdownJob,
  onAssign, onNavigate, dragJobId, setDragJobId, accentColor,
}: {
  job: Job;
  riders: ActiveRider[];
  assigning: string | null;
  assignDropdownJob: string | null;
  setAssignDropdownJob: (id: string | null) => void;
  onAssign: (jobId: string, riderId: string, riderName: string) => void;
  onNavigate: (id: string) => void;
  dragJobId: string | null;
  setDragJobId: (id: string | null) => void;
  accentColor: string;
}) {
  const mins = minutesToSLA(job.appt_date, job.appt_time);
  const isAssigning = assigning === job.id;
  const isDragging = dragJobId === job.id;
  const isOpen = assignDropdownJob === job.id;

  const ridersForAssign = riders
    .filter(r => r.tracking_mode === "idle" && !r.current_job_id)
    .map(r => ({
      rider_id: r.rider_id,
      name: r.admin_users?.name ?? "ไรเดอร์",
      distKm: job.appt_lat && job.appt_lng
        ? haversineKm(r.lat, r.lng, job.appt_lat, job.appt_lng)
        : 0,
    }))
    .sort((a, b) => a.distKm - b.distKm);

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData("jobId", job.id); setDragJobId(job.id); }}
      onDragEnd={() => setDragJobId(null)}
      style={{
        padding: "10px 14px", borderBottom: `1px solid ${BORDER}`,
        background: isDragging ? `${accentColor}08` : "#fff",
        cursor: isAssigning ? "wait" : "grab",
        opacity: isAssigning ? 0.6 : 1,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>#{job.order_number}</span>
          {mins !== null && (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: accentColor, background: `${accentColor}12`, padding: "1px 6px", borderRadius: 99 }}>
              {slaLabel(mins)}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button
            onClick={() => onNavigate(job.id)}
            style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: TEXT2, cursor: "pointer", fontFamily: "inherit" }}
          >รายละเอียด</button>
          <div style={{ position: "relative" }}>
            <button
              disabled={isAssigning}
              onClick={() => setAssignDropdownJob(isOpen ? null : job.id)}
              style={{ background: BLUE, border: "none", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
            >
              Assign <ChevronDown size={11} />
            </button>
            {isOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.12)", zIndex: 200, minWidth: 180 }}>
                {ridersForAssign.length === 0 ? (
                  <div style={{ padding: "10px 14px", fontSize: 12, color: TEXT2 }}>ไม่มีไรเดอร์ว่าง</div>
                ) : ridersForAssign.map(r => (
                  <button
                    key={r.rider_id}
                    onClick={() => onAssign(job.id, r.rider_id, r.name)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: TEXT, textAlign: "left" }}
                  >
                    <span style={{ fontWeight: 600 }}>{r.name}</span>
                    <span style={{ color: TEXT2, fontSize: 11 }}>{r.distKm.toFixed(1)} กม.</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <p style={{ margin: "0 0 2px", fontSize: 12, color: TEXT }}>{job.device_model ?? "—"} · {job.customer_name ?? "—"}</p>
      {job.appt_location && <p style={{ margin: "0 0 2px", fontSize: 11, color: TEXT2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {job.appt_location}</p>}
      {job.appt_time && <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>🕐 {job.appt_date} {job.appt_time} น.</p>}
      <p style={{ margin: "4px 0 0", fontSize: 10, color: TEXT3 }}>↖ ลากไปวางที่ไรเดอร์บนแผนที่</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlannerDashboard() {
  const router = useRouter();

  // Data state
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allShifts, setAllShifts] = useState<AllShift[]>([]);
  const [todayStats, setTodayStats] = useState({ totalCount: 0, newCount: 0, assignedCount: 0, completedCount: 0, cancelledCount: 0 });
  const [loading, setLoading] = useState(true);

  // UI state
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dropTargetRider, setDropTargetRider] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [assignDropdownJob, setAssignDropdownJob] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"queue" | "shifts">("queue");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Data fetchers
  const loadRiders = useCallback(async () => {
    const data = await fetchActiveRiders();
    setRiders(data as ActiveRider[]);
    setLoading(false);
  }, []);

  const loadJobs = useCallback(async () => {
    const data = await fetchUnassignedJobs();
    setJobs(data as Job[]);
  }, []);

  const loadShifts = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const data = await fetchAllRidersShifts(today);
    setAllShifts(data as AllShift[]);
  }, []);

  const loadTodayStats = useCallback(async () => {
    const data = await fetchTodayRequestStats();
    setTodayStats(data);
  }, []);

  useEffect(() => {
    loadRiders(); loadJobs(); loadShifts(); loadTodayStats();
    const ch = supabase
      .channel("planner-rider-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, () => loadRiders())
      .on("postgres_changes", { event: "*", schema: "public", table: "requests" }, () => { loadJobs(); loadTodayStats(); })
      .subscribe();
    const interval = setInterval(() => { loadRiders(); loadJobs(); }, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [loadRiders, loadJobs, loadShifts, loadTodayStats]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssignDropdownJob(null);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Assignment handlers
  async function handleAssign(jobId: string, riderId: string, riderName: string) {
    setAssigning(jobId);
    setAssignDropdownJob(null);
    setSelectedJobId(null);
    await assignRider(jobId, riderId, riderName);
    setAssigning(null);
    loadJobs();
    loadRiders();
  }

  async function handleAssignDrop(jobId: string, riderId: string, riderName: string) {
    setAssigning(jobId);
    setDropTargetRider(null);
    setDragJobId(null);
    await assignRider(jobId, riderId, riderName);
    setAssigning(null);
    loadJobs();
    loadRiders();
  }

  async function handleAutoAssign() {
    setAutoAssigning(true);
    const { assigned, skipped } = await autoAssignJobs();
    await Promise.all([loadJobs(), loadRiders()]);
    setAutoAssigning(false);
    if (assigned === 0 && skipped === 0) alert("ไม่มีงานที่ต้องจัดหรือไม่มีไรเดอร์ว่าง");
    else alert(`Auto Assign สำเร็จ ${assigned} งาน${skipped > 0 ? ` · ข้าม ${skipped} งาน (ไม่มีไรเดอร์ว่าง)` : ""}`);
  }

  // Computed values
  const unassignedJobs = jobs.filter(j => !j.rider_id);
  const assignedJobs   = jobs.filter(j => j.rider_id);
  const idleRiders     = riders.filter(r => r.tracking_mode === "idle");
  const busyRiders     = riders.filter(r => r.tracking_mode !== "idle");
  const overdueJobs    = unassignedJobs.filter(j => getSLAStatus(j) === "overdue");
  const warningJobs    = unassignedJobs.filter(j => getSLAStatus(j) === "warning");
  const okJobs         = unassignedJobs.filter(j => getSLAStatus(j) === "ok" || getSLAStatus(j) === "none");
  const offlineRiders  = riders.filter(r => {
    const sec = (Date.now() - new Date(r.last_heartbeat).getTime()) / 1000;
    return sec > 300; // 5 min no heartbeat = effectively offline
  });
  const todayShiftJobs = allShifts.reduce((sum, s) => sum + (s.jobs_completed ?? 0), 0);

  // Alerts
  const alerts: { color: string; msg: string }[] = [];
  if (overdueJobs.length > 0) alerts.push({ color: RED, msg: `⚠ งานเกิน SLA ${overdueJobs.length} งาน` });
  if (warningJobs.length > 0) alerts.push({ color: YELLOW, msg: `⚠ ใกล้เกิน SLA (15 นาที) ${warningJobs.length} งาน` });
  if (offlineRiders.length > 0) alerts.push({ color: ORANGE, msg: `⚠ ไรเดอร์ขาดสัญญาณ ${offlineRiders.length} คน` });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ background: DARK, padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: GOLD, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: DARK, fontSize: 14 }}>K</div>
          <div>
            <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>ศูนย์ควบคุมงานรับซื้อ</p>
            <p style={{ margin: 0, color: "rgba(255,255,255,.45)", fontSize: 10 }}>Planner Dashboard</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "rgba(255,255,255,.5)", fontSize: 12 }}>{thDate()}</span>
          <button
            onClick={async () => {
              setSyncing(true);
              const { total, updated } = await backfillRequestCoords();
              await loadJobs();
              setSyncing(false);
              if (total === 0) alert("ทุกงานมีพิกัดครบแล้ว");
              else alert(`ซิงค์พิกัดสำเร็จ ${updated}/${total} งาน`);
            }}
            disabled={syncing}
            style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}
          >
            <RefreshCw size={11} /> {syncing ? "ซิงค์..." : "ซิงค์พิกัด"}
          </button>
          <button onClick={() => router.push("/admin/riders/manage")} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "rgba(255,255,255,.7)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
            <Settings size={11} /> จัดการ
          </button>
        </div>
      </div>

      {/* ── Stat bar ── */}
      <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexShrink: 0, background: BG }}>
        <StatCard icon="📋" label="งานใหม่" value={todayStats.newCount} color={BLUE} />
        <StatCard icon="⏳" label="รอ Assign" value={unassignedJobs.length} color={YELLOW} bold={unassignedJobs.length > 0} />
        <StatCard icon="🚗" label="กำลังเดินทาง" value={riders.filter(r => r.tracking_mode === "enroute").length} color={ORANGE} />
        <StatCard icon="🔍" label="ตรวจเครื่อง" value={riders.filter(r => r.tracking_mode === "on_site").length} color={BLUE} />
        <StatCard icon="✅" label="เสร็จวันนี้" value={todayStats.completedCount} color={GREEN} />
        <StatCard icon="👤" label="ไรเดอร์ว่าง" value={idleRiders.length} color={GREEN} bold={idleRiders.length > 0} />
        <button
          onClick={handleAutoAssign}
          disabled={autoAssigning || unassignedJobs.length === 0 || idleRiders.length === 0}
          style={{ display: "flex", alignItems: "center", gap: 6, background: autoAssigning ? "#f9fafb" : GOLD, border: "none", borderRadius: 12, padding: "10px 16px", cursor: autoAssigning ? "wait" : "pointer", color: autoAssigning ? TEXT2 : DARK, fontWeight: 800, fontSize: 13, fontFamily: "inherit", flexShrink: 0, opacity: (unassignedJobs.length === 0 || idleRiders.length === 0) && !autoAssigning ? 0.5 : 1, whiteSpace: "nowrap" }}
        >
          <Zap size={15} /> {autoAssigning ? "กำลัง Auto..." : "Auto Assign"}
        </button>
      </div>

      {/* ── Alert bar ── */}
      {alerts.length > 0 && (
        <div style={{ padding: "0 16px 8px", display: "flex", gap: 8, flexShrink: 0 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ background: `${a.color}12`, border: `1px solid ${a.color}40`, borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, color: a.color }}>
              {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* ── Main 3-column area ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── LEFT: Rider list (272px) ── */}
        <div style={{ width: 272, background: CARD, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
          <div style={{ padding: "12px 14px 8px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
              ไรเดอร์ ({riders.length})
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: "center", color: TEXT2, fontSize: 13 }}>กำลังโหลด...</div>
            ) : riders.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: TEXT2, fontSize: 13 }}>
                <User size={28} color={BORDER} style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
                ยังไม่มีไรเดอร์ออนไลน์
              </div>
            ) : riders.map(r => {
              const name = r.admin_users?.name ?? "ไรเดอร์";
              const hasJob = r.current_job_id != null && r.tracking_mode === "idle";
              const color = hasJob ? PURPLE : (MODE_COLOR[r.tracking_mode] ?? BLUE);
              const label = hasJob ? "รอรับงาน" : (MODE_LABEL[r.tracking_mode] ?? r.tracking_mode);
              const isSelected = r.rider_id === selectedRiderId;
              const shift = r.rider_shifts;
              const battLow = r.battery_pct != null && r.battery_pct < 20;

              return (
                <div
                  key={r.rider_id}
                  onDragOver={e => { e.preventDefault(); setDropTargetRider(r.rider_id); }}
                  onDragLeave={() => setDropTargetRider(null)}
                  onDrop={e => { e.preventDefault(); const jobId = e.dataTransfer.getData("jobId"); if (jobId) handleAssignDrop(jobId, r.rider_id, name); }}
                  onClick={() => setSelectedRiderId(r.rider_id === selectedRiderId ? null : r.rider_id)}
                  style={{
                    padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer",
                    background: dropTargetRider === r.rider_id ? `${BLUE}08` : isSelected ? `${color}08` : "transparent",
                    borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent",
                    outline: dropTargetRider === r.rider_id ? `2px dashed ${BLUE}` : "none",
                    outlineOffset: -2, transition: "all 0.1s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Avatar name={name} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 99, background: `${color}15`, color, fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>{label}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, fontSize: 11, color: TEXT2, marginTop: 2 }}>
                        {shift?.jobs_completed > 0 && <span>✅ {shift.jobs_completed} งาน</span>}
                        {r.battery_pct != null && <span style={{ color: battLow ? RED : TEXT2 }}><Battery size={9} style={{ verticalAlign: "middle" }} /> {r.battery_pct}%</span>}
                        <span style={{ color: TEXT3 }}>{lastSeen(r.last_heartbeat)}</span>
                      </div>
                    </div>
                  </div>
                  {r.current_job && (
                    <div style={{ fontSize: 11, color: BLUE, fontWeight: 600, marginTop: 2, paddingLeft: 42 }}>
                      📱 #{r.current_job.order_number} · {r.current_job.device_model ?? "—"}
                    </div>
                  )}
                  {battLow && (
                    <div style={{ fontSize: 11, color: RED, fontWeight: 600, marginTop: 2, paddingLeft: 42, display: "flex", alignItems: "center", gap: 3 }}>
                      <AlertTriangle size={10} /> แบตใกล้หมด
                    </div>
                  )}
                  {isSelected && (
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/admin/riders/${r.rider_id}`); }}
                      style={{ marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#f9fafb", color: TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >ดูรายละเอียด →</button>
                  )}
                  {dropTargetRider === r.rider_id && dragJobId && (
                    <div style={{ marginTop: 6, fontSize: 11, color: BLUE, fontWeight: 700, textAlign: "center" }}>⬇ วางที่นี่เพื่อ Assign</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: Map ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""}>
            <Map
              defaultCenter={{ lat: OFFICE_LAT, lng: OFFICE_LNG }}
              defaultZoom={11}
              mapId="22ccc57d606934a9bbe74a52"
              style={{ width: "100%", height: "100%" }}
            >
              {/* Office marker */}
              <AdvancedMarker position={{ lat: OFFICE_LAT, lng: OFFICE_LNG }}>
                <div style={{ background: DARK, color: GOLD, fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, border: `1px solid ${GOLD}` }}>🏠 ออฟฟิศ</div>
              </AdvancedMarker>

              {/* Rider markers */}
              {riders.map(r => {
                const name = r.admin_users?.name ?? "ไรเดอร์";
                const hasJob = r.current_job_id != null && r.tracking_mode === "idle";
                const color = hasJob ? PURPLE : (MODE_COLOR[r.tracking_mode] ?? BLUE);
                const isSelected = r.rider_id === selectedRiderId;
                return (
                  <AdvancedMarker key={r.rider_id} position={{ lat: r.lat, lng: r.lng }} onClick={() => setSelectedRiderId(r.rider_id === selectedRiderId ? null : r.rider_id)}>
                    <div style={{ position: "relative" }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: color,
                        border: `3px solid ${isSelected ? "#fff" : color}`,
                        boxShadow: isSelected ? `0 0 0 3px ${color}` : "0 2px 6px rgba(0,0,0,.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", overflow: "hidden",
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {isSelected && (
                        <div style={{ position: "absolute", bottom: 42, left: "50%", transform: "translateX(-50%)", background: DARK, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,.3)" }}>
                          {name} · {hasJob ? "รอรับงาน" : (MODE_LABEL[r.tracking_mode] ?? r.tracking_mode)}
                        </div>
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Job markers */}
              {jobs.filter(j => j.appt_lat && j.appt_lng).map(job => {
                const status = getSLAStatus(job);
                const color = job.rider_id ? PURPLE : (status === "overdue" ? RED : status === "warning" ? YELLOW : ORANGE);
                const isSelected = selectedJobId === job.id;
                const mins = minutesToSLA(job.appt_date, job.appt_time);
                const idleRidersForAssign = riders
                  .filter(r => r.tracking_mode === "idle" && !r.current_job_id)
                  .map(r => ({
                    ...r,
                    distKm: job.appt_lat && job.appt_lng
                      ? haversineKm(r.lat, r.lng, job.appt_lat!, job.appt_lng!)
                      : 0,
                  }))
                  .sort((a, b) => a.distKm - b.distKm);
                return (
                  <AdvancedMarker key={job.id} position={{ lat: job.appt_lat!, lng: job.appt_lng! }} onClick={() => setSelectedJobId(isSelected ? null : job.id)}>
                    <div style={{ position: "relative" }}>
                      <div style={{ background: color, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 7px", borderRadius: 6, border: "1.5px solid rgba(255,255,255,.7)", boxShadow: "0 2px 6px rgba(0,0,0,.25)", cursor: "pointer", whiteSpace: "nowrap" }}>
                        {job.rider_id ? "🏍" : "📍"} {job.order_number}
                      </div>
                      {isSelected && (
                        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", boxShadow: "0 8px 24px rgba(0,0,0,.18)", minWidth: 220, zIndex: 100 }}>
                          <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 8 }}>
                            <div>
                              <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>#{job.order_number}</p>
                              <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 700, color: TEXT }}>{job.device_model ?? "—"}</p>
                            </div>
                            <button onClick={e => { e.stopPropagation(); setSelectedJobId(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, padding: 2 }}><X size={14} /></button>
                          </div>
                          {job.customer_name && <div style={{ display: "flex", gap: 6, fontSize: 12, color: TEXT2, marginBottom: 4 }}><User size={12} style={{ marginTop: 1, flexShrink: 0 }} />{job.customer_name}</div>}
                          {job.appt_location && <div style={{ display: "flex", gap: 6, fontSize: 12, color: TEXT2, marginBottom: 4 }}><MapPin size={12} style={{ marginTop: 1, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 170 }}>{job.appt_location}</span></div>}
                          {job.appt_time && <div style={{ display: "flex", gap: 6, fontSize: 12, color: status !== "none" ? slaColor(status) : TEXT2, fontWeight: status !== "none" ? 600 : 400, marginBottom: 10 }}><Clock size={12} style={{ marginTop: 1, flexShrink: 0 }} />{job.appt_date} {job.appt_time} น.{mins !== null && !job.rider_id ? ` · ${slaLabel(mins)}` : ""}</div>}
                          {job.rider_id ? (
                            <div style={{ background: `${PURPLE}10`, border: `1px solid ${PURPLE}30`, borderRadius: 8, padding: "6px 10px", fontSize: 12, color: PURPLE, fontWeight: 600 }}>🏍 {job.rider_name ?? "ไรเดอร์"}</div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {idleRidersForAssign.length === 0 ? (
                                <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>ไม่มีไรเดอร์ว่าง</p>
                              ) : idleRidersForAssign.slice(0, 3).map(r => {
                                const rName = r.admin_users?.name ?? "ไรเดอร์";
                                return (
                                  <button
                                    key={r.rider_id}
                                    disabled={assigning === job.id}
                                    onClick={e => { e.stopPropagation(); handleAssign(job.id, r.rider_id, rName); }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: BLUE, border: "none", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    <span>Assign → {rName}</span>
                                    <span style={{ opacity: 0.8, fontSize: 11 }}>{r.distKm.toFixed(1)} กม.</span>
                                  </button>
                                );
                              })}
                              <button onClick={e => { e.stopPropagation(); router.push(`/admin/requests/${job.id}`); }} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 12px", color: TEXT2, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>รายละเอียด →</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>

          {/* Map legend */}
          <div style={{ position: "absolute", bottom: 12, left: 12, background: "rgba(255,255,255,.9)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "6px 12px", display: "flex", gap: 12, fontSize: 11, border: `1px solid ${BORDER}` }}>
            {[["ว่าง", GREEN], ["เดินทาง", ORANGE], ["กับลูกค้า", BLUE], ["กลับออฟฟิศ", PURPLE]].map(([label, color]) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 4, color: TEXT2 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />{label}
              </span>
            ))}
            <span style={{ color: BORDER }}>|</span>
            {[["📍 รอ Assign", ORANGE], ["🏍 Assign แล้ว", PURPLE]].map(([label, color]) => (
              <span key={label as string} style={{ color: color as string, fontWeight: 600, fontSize: 11 }}>{label}</span>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Job queue (320px) ── */}
        <div style={{ width: 320, background: CARD, borderLeft: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }} ref={dropdownRef}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {(["queue", "shifts"] as const).map(tab => {
              const label = tab === "queue" ? `คิวงาน${unassignedJobs.length > 0 ? ` (${unassignedJobs.length})` : ""}` : "Shift วันนี้";
              const active = rightTab === tab;
              return (
                <button key={tab} onClick={() => { setRightTab(tab); if (tab === "shifts") loadShifts(); }} style={{ flex: 1, padding: "10px 0", border: "none", background: active ? `${GOLD}10` : "transparent", color: active ? GOLD : TEXT2, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit", borderBottom: active ? `2px solid ${GOLD}` : "none" }}>
                  {label}
                </button>
              );
            })}
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {rightTab === "queue" ? (
              <>
                {/* Overdue SLA */}
                {overdueJobs.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 6px", background: `${RED}08`, borderBottom: `1px solid ${RED}20` }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 0.5 }}>🔥 เกิน SLA ({overdueJobs.length})</p>
                    </div>
                    {overdueJobs.map(job => (
                      <JobCard
                        key={job.id} job={job} riders={riders} assigning={assigning}
                        assignDropdownJob={assignDropdownJob} setAssignDropdownJob={setAssignDropdownJob}
                        onAssign={handleAssign} onNavigate={id => router.push(`/admin/requests/${id}`)}
                        dragJobId={dragJobId} setDragJobId={setDragJobId} accentColor={RED}
                      />
                    ))}
                  </div>
                )}
                {/* Warning SLA */}
                {warningJobs.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 6px", background: `${YELLOW}08`, borderBottom: `1px solid ${YELLOW}20` }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: YELLOW, textTransform: "uppercase", letterSpacing: 0.5 }}>⚠ ใกล้เกิน SLA ({warningJobs.length})</p>
                    </div>
                    {warningJobs.map(job => (
                      <JobCard
                        key={job.id} job={job} riders={riders} assigning={assigning}
                        assignDropdownJob={assignDropdownJob} setAssignDropdownJob={setAssignDropdownJob}
                        onAssign={handleAssign} onNavigate={id => router.push(`/admin/requests/${id}`)}
                        dragJobId={dragJobId} setDragJobId={setDragJobId} accentColor={YELLOW}
                      />
                    ))}
                  </div>
                )}
                {/* Normal */}
                {okJobs.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 6px", borderBottom: `1px solid ${BORDER}` }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>✅ ปกติ ({okJobs.length})</p>
                    </div>
                    {okJobs.map(job => (
                      <JobCard
                        key={job.id} job={job} riders={riders} assigning={assigning}
                        assignDropdownJob={assignDropdownJob} setAssignDropdownJob={setAssignDropdownJob}
                        onAssign={handleAssign} onNavigate={id => router.push(`/admin/requests/${id}`)}
                        dragJobId={dragJobId} setDragJobId={setDragJobId} accentColor={GREEN}
                      />
                    ))}
                  </div>
                )}
                {unassignedJobs.length === 0 && (
                  <div style={{ padding: 32, textAlign: "center", color: TEXT2 }}>
                    <CheckCircle2 size={28} color={GREEN} style={{ marginBottom: 6, display: "block", margin: "0 auto 8px" }} />
                    <p style={{ margin: 0, fontSize: 13 }}>ไม่มีงานรอ Assign</p>
                  </div>
                )}
                {/* Assigned jobs section */}
                {assignedJobs.length > 0 && (
                  <div>
                    <div style={{ padding: "10px 14px 6px", borderTop: `2px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: "uppercase", letterSpacing: 0.5 }}>🏍 Assign แล้ว ({assignedJobs.length})</p>
                    </div>
                    {assignedJobs.map(job => (
                      <div key={job.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>#{job.order_number}</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE, background: `${PURPLE}12`, padding: "2px 8px", borderRadius: 99 }}>🏍 {job.rider_name}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.device_model ?? "—"} · {job.customer_name ?? "—"}</p>
                        {job.appt_time && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT3 }}>🕐 {job.appt_date} {job.appt_time} น.</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              /* Shifts tab */
              <div>
                {allShifts.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center", color: TEXT2, fontSize: 13 }}>ยังไม่มี Shift วันนี้</div>
                ) : allShifts.map((s, i, arr) => (
                  <div key={s.id} style={{ padding: "12px 14px", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Avatar name={s.rider_name} size={28} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{s.rider_name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{s.jobs_completed} งาน</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>
                          {new Date(s.clocked_in_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} – {s.clocked_out_at ? new Date(s.clocked_out_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: GREEN }}>กำลังทำงาน</span>}
                          {" · "}{shiftDuration(s.clocked_in_at, s.clocked_out_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Summary bar ── */}
      <div style={{ background: "#fff", borderTop: `1px solid ${BORDER}`, padding: "10px 20px", display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
        <p style={{ margin: "0 20px 0 0", fontSize: 12, fontWeight: 700, color: TEXT, whiteSpace: "nowrap" }}>สรุปภาพรวมวันนี้</p>
        <div style={{ display: "flex", alignItems: "center", flex: 1, gap: 4 }}>
          {([
            { label: "รับงานทั้งหมด",     value: todayStats.totalCount,      icon: CalendarDays,  iconColor: BLUE,   bg: "#EFF6FF" },
            { label: "Assign แล้ว",        value: todayStats.assignedCount,   icon: UserCheck,     iconColor: ORANGE, bg: "#FFF7ED" },
            { label: "กำลังดำเนินการ",    value: busyRiders.length,           icon: Wrench,        iconColor: BLUE,   bg: "#EFF6FF" },
            { label: "เสร็จสิ้น",         value: todayStats.completedCount,   icon: CheckCircle2,  iconColor: GREEN,  bg: "#F0FDF4" },
            { label: "ยกเลิก",            value: todayStats.cancelledCount,   icon: XCircle,       iconColor: RED,    bg: "#FEF2F2" },
            { label: "ค้าง",              value: unassignedJobs.length,       icon: Clock,         iconColor: "#9CA3AF", bg: "#F9FAFB" },
          ] as const).map(({ label, value, icon: Icon, iconColor, bg }, i, arr) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, padding: "4px 16px", borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={18} color={iconColor} strokeWidth={2} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, color: TEXT2, whiteSpace: "nowrap" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: TEXT, lineHeight: 1.1 }}>{value} <span style={{ fontSize: 11, fontWeight: 400, color: TEXT2 }}>งาน</span></p>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => router.push("/admin/reports")}
          style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 16, padding: "8px 14px", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: TEXT, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <BarChart2 size={14} color={BLUE} />
          ดูรายงานฉบับเต็ม
          <ArrowRight size={13} color={ORANGE} />
        </button>
      </div>
    </div>
  );
}
