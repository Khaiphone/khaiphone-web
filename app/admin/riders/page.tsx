"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { Battery, AlertTriangle, ChevronDown, ChevronLeft, X, Zap, RefreshCw, MapPin, Clock, User, CalendarDays, UserCheck, Wrench, CheckCircle2, XCircle, BarChart2, ArrowRight, Settings, ClipboardList, Navigation, Search, RotateCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchActiveRiders, fetchAllRidersShifts, fetchUnassignedJobs, fetchTodayRequestStats } from "@/app/actions/rider-tracking";
import { assignRider, backfillRequestCoords, autoAssignJobs, adminReclaimJob } from "@/app/actions/admin-requests";
import { haversineKm, etaMinutes, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";

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

const RIDER_CAPACITY = 2; // max active jobs before rider is considered full

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
  active_jobs: Array<{ id: string; order_number: string; status: string; appt_time: string | null; appt_date: string | null; rider_id: string }>;
};

type Job = {
  id: string; order_number: string; device_model: string | null;
  customer_name: string | null; appt_location: string | null;
  appt_date: string | null; appt_time: string | null;
  appt_lat: number | null; appt_lng: number | null;
  rider_id: string | null; rider_name: string | null;
  status: string;
};

type AllShift = {
  id: string; rider_id: string; rider_name: string;
  clocked_in_at: string; clocked_out_at: string | null;
  jobs_completed: number; jobs_attempted: number; total_distance_km: number | null; ended_reason: string | null;
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

// ─── Rider status helper ──────────────────────────────────────────────────────
function getRiderStatus(r: ActiveRider): { label: string; color: string } {
  const jobStatus = r.current_job?.status as string | undefined;
  const mode = r.tracking_mode;
  if (mode === "return")  return { label: "กลับออฟฟิศ", color: PURPLE };
  if (mode === "enroute") return { label: "กำลังเดินทาง", color: ORANGE };
  if (mode === "on_site") {
    const map: Record<string, string> = {
      inspecting:          "กำลังตรวจเครื่อง",
      price_negotiation:   "กำลังต่อราคา",
      contracting:         "ทำสัญญา",
      awaiting_transfer:   "รอโอนเงิน",
    };
    return { label: map[jobStatus ?? ""] ?? "กับลูกค้า", color: BLUE };
  }
  if (jobStatus === "pickup_scheduled") return { label: "รับงานแล้ว", color: PURPLE };
  if (r.current_job_id)                 return { label: "รอรับงาน",   color: PURPLE };
  return { label: "ว่าง", color: GREEN };
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

function StatCard({ icon: Icon, label, value, color, bg, bold, href }: { icon: LucideIcon; label: string; value: number | string; color: string; bg: string; bold?: boolean; href?: string }) {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 12, padding: "10px 14px", border: `1px solid ${BORDER}`, flex: 1, minWidth: 100, cursor: href ? "pointer" : "default", transition: "box-shadow 0.15s", textDecoration: "none" }}
      onMouseEnter={e => { if (href) (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={18} color={color} strokeWidth={2} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: TEXT2, fontWeight: 500 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: bold ? color : TEXT, lineHeight: 1.1 }}>{value}</p>
      </div>
    </div>
  );
  if (href) return <a href={href} style={{ flex: 1, minWidth: 100, textDecoration: "none" }}>{inner}</a>;
  return <div style={{ flex: 1, minWidth: 100 }}>{inner}</div>;
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
    .map(r => ({
      rider_id:    r.rider_id,
      name:        r.admin_users?.name ?? "ไรเดอร์",
      activeCount: r.active_jobs?.length ?? 0,
      distKm:      job.appt_lat && job.appt_lng
        ? haversineKm(r.lat, r.lng, job.appt_lat, job.appt_lng)
        : 0,
    }))
    .sort((a, b) => a.activeCount - b.activeCount || a.distKm - b.distKm);

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
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.12)", zIndex: 200, minWidth: 200 }}>
                {ridersForAssign.length === 0 ? (
                  <div style={{ padding: "10px 14px", fontSize: 12, color: TEXT2 }}>ไม่มีไรเดอร์ออนไลน์</div>
                ) : ridersForAssign.map(r => {
                  const isFull = r.activeCount >= RIDER_CAPACITY;
                  return (
                    <button
                      key={r.rider_id}
                      onClick={() => onAssign(job.id, r.rider_id, r.name)}
                      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", border: "none", background: isFull ? "#FFF7ED" : "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: TEXT, textAlign: "left" }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                        {r.activeCount > 0 && (
                          <span style={{ fontSize: 10, marginLeft: 6, fontWeight: 600, color: isFull ? RED : ORANGE }}>
                            {isFull ? "⚠ งานเต็ม" : `📋 ${r.activeCount} งาน`}
                          </span>
                        )}
                      </div>
                      <span style={{ color: TEXT2, fontSize: 11 }}>{r.distKm.toFixed(1)} กม.</span>
                    </button>
                  );
                })}
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

// ─── Dashed lines: selected rider → their assigned job ───────────────────────
function DashedLines({ riders, jobs, selectedRiderId }: { riders: ActiveRider[]; jobs: Job[]; selectedRiderId: string | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !selectedRiderId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const g = (window as any).google;
    if (!g) return;
    const rider = riders.find(r => r.rider_id === selectedRiderId);
    if (!rider) return;
    const lines: unknown[] = [];
    for (const job of jobs) {
      if (job.rider_id !== selectedRiderId || !job.appt_lat || !job.appt_lng) continue;
      const line = new g.maps.Polyline({
        path: [{ lat: rider.lat, lng: rider.lng }, { lat: job.appt_lat, lng: job.appt_lng }],
        strokeOpacity: 0,
        strokeWeight: 2,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.7, strokeColor: PURPLE, scale: 3 }, offset: "0", repeat: "14px" }],
        map,
      });
      lines.push(line);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return () => lines.forEach((l: any) => l.setMap(null));
  }, [map, riders, jobs, selectedRiderId]);
  return null;
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
  const [reclaimBusy, setReclaimBusy] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<"queue" | "shifts">("queue");
  const [leftOpen, setLeftOpen] = useState(true);
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
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
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
      <div style={{ background: "#fff", borderBottom: `1px solid ${BORDER}`, padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: TEXT, lineHeight: 1.2 }}>Planner Dashboard</p>
          <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{thDate()}</p>
        </div>
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
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1px solid ${BORDER}`, color: TEXT2, borderRadius: 8, padding: "6px 12px", cursor: syncing ? "wait" : "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500 }}
        >
          <RefreshCw size={13} style={{ animation: syncing ? "spin 1s linear infinite" : undefined }} />
          {syncing ? "กำลังซิงค์..." : "ซิงค์พิกัด"}
        </button>
      </div>

      {/* ── Stat bar ── */}
      <div style={{ padding: "10px 16px", display: "flex", gap: 8, flexShrink: 0, background: BG }}>
        <StatCard icon={ClipboardList} label="งานใหม่"       value={todayStats.newCount}                                              color={BLUE}   bg="#EFF6FF" href="/admin/riders/jobs" />
        <StatCard icon={Clock}         label="รอ Assign"      value={unassignedJobs.length}                                           color={YELLOW} bg="#FFFBEB" bold={unassignedJobs.length > 0} href="/admin/riders/jobs" />
        <StatCard icon={Navigation}    label="กำลังเดินทาง"  value={riders.filter(r => r.tracking_mode === "enroute").length}        color={ORANGE} bg="#FFF7ED" href="/admin/riders/jobs" />
        <StatCard icon={Search}        label="ตรวจเครื่อง"   value={riders.filter(r => r.tracking_mode === "on_site").length}        color={BLUE}   bg="#EFF6FF" href="/admin/riders/jobs" />
        <StatCard icon={CheckCircle2}  label="เสร็จวันนี้"   value={todayStats.completedCount}                                       color={GREEN}  bg="#F0FDF4" href="/admin/riders/jobs" />
        <StatCard icon={UserCheck}     label="ไรเดอร์ว่าง"   value={idleRiders.length}                                               color={GREEN}  bg="#F0FDF4" bold={idleRiders.length > 0} href="/admin/riders/manage" />
        <button
          onClick={handleAutoAssign}
          disabled={autoAssigning || unassignedJobs.length === 0 || idleRiders.length === 0}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: autoAssigning ? "#fff" : DARK,
            border: `1px solid ${autoAssigning ? BORDER : DARK}`,
            borderRadius: 12, padding: "10px 16px",
            cursor: autoAssigning ? "wait" : (unassignedJobs.length === 0 || idleRiders.length === 0) ? "not-allowed" : "pointer",
            fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap",
            opacity: (unassignedJobs.length === 0 || idleRiders.length === 0) && !autoAssigning ? 0.4 : 1,
            transition: "opacity 0.15s",
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 8, background: autoAssigning ? "#f3f4f6" : `${GOLD}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Zap size={14} color={autoAssigning ? TEXT2 : GOLD} strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: "left" }}>
            <p style={{ margin: 0, fontSize: 11, color: autoAssigning ? TEXT2 : `${GOLD}99`, fontWeight: 500, lineHeight: 1 }}>AI จัดงาน</p>
            <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 700, color: autoAssigning ? TEXT2 : "#fff", lineHeight: 1 }}>
              {autoAssigning ? "กำลังจัดงาน..." : "Auto Assign"}
            </p>
          </div>
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

        {/* ── LEFT: Rider list (collapsible) ── */}
        <div style={{ width: leftOpen ? 272 : 0, background: CARD, borderRight: leftOpen ? `1px solid ${BORDER}` : "none", display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0, transition: "width 0.2s ease" }}>
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
              const name       = r.admin_users?.name ?? "ไรเดอร์";
              const isSelected = r.rider_id === selectedRiderId;
              const shift      = r.rider_shifts;
              const battLow    = r.battery_pct != null && r.battery_pct < 20;
              const statusInfo = getRiderStatus(r);
              const otherJobs  = (r.active_jobs ?? []).filter(j => j.id !== r.current_job_id);

              return (
                <div
                  key={r.rider_id}
                  onDragOver={e => { e.preventDefault(); setDropTargetRider(r.rider_id); }}
                  onDragLeave={() => setDropTargetRider(null)}
                  onDrop={e => { e.preventDefault(); const jobId = e.dataTransfer.getData("jobId"); if (jobId) handleAssignDrop(jobId, r.rider_id, name); }}
                  onClick={() => setSelectedRiderId(r.rider_id === selectedRiderId ? null : r.rider_id)}
                  style={{
                    padding: "10px 12px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer",
                    background: dropTargetRider === r.rider_id ? `${BLUE}08` : isSelected ? `${statusInfo.color}06` : "transparent",
                    borderLeft: isSelected ? `3px solid ${statusInfo.color}` : "3px solid transparent",
                    outline: dropTargetRider === r.rider_id ? `2px dashed ${BLUE}` : "none",
                    outlineOffset: -2, transition: "all 0.1s",
                  }}
                >
                  {/* Row 1: Avatar + Name + Status badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Avatar name={name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 99, background: `${statusInfo.color}15`, color: statusInfo.color, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      {/* Summary stats */}
                      <div style={{ display: "flex", gap: 6, fontSize: 10, flexWrap: "wrap" }}>
                        <span style={{ color: GREEN, fontWeight: 600 }}>✅ {shift?.jobs_completed ?? 0}/{shift?.jobs_attempted ?? 0} วันนี้</span>
                        {(r.active_jobs ?? []).length > 0 && (
                          <span style={{ color: ORANGE, fontWeight: 600 }}>📋 รับ {r.active_jobs.length} งาน</span>
                        )}
                        {r.battery_pct != null && (
                          <span style={{ color: battLow ? RED : TEXT3 }}>🔋 {r.battery_pct}%</span>
                        )}
                        <span style={{ color: TEXT3 }}>{lastSeen(r.last_heartbeat)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Current job block */}
                  {r.current_job && (() => {
                    const job = r.current_job;
                    const hasCoords = job.appt_lat != null && job.appt_lng != null;
                    const distKm = hasCoords ? haversineKm(r.lat, r.lng, job.appt_lat, job.appt_lng) : null;
                    const eta    = distKm != null ? etaMinutes(distKm) : null;
                    return (
                      <div style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}20`, borderRadius: 8, padding: "7px 10px", marginBottom: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, marginBottom: 2 }}>
                          📋 #{job.order_number} · {job.device_model ?? "—"}
                        </div>
                        {job.customer_name && (
                          <div style={{ fontSize: 10, color: TEXT2, marginBottom: 2 }}>👤 {job.customer_name}</div>
                        )}
                        {job.appt_location && (
                          <div style={{ fontSize: 10, color: TEXT2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                            📍 {job.appt_location}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 8, fontSize: 10 }}>
                          {distKm != null && (
                            <span style={{ color: ORANGE, fontWeight: 600 }}>🛣 {distKm.toFixed(1)} กม. · ~{eta} นาที</span>
                          )}
                          {job.appt_time && (
                            <span style={{ color: TEXT2 }}>🕐 {job.appt_time} น.</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Other pending jobs */}
                  {otherJobs.length > 0 && (
                    <div style={{ fontSize: 10, color: PURPLE, fontWeight: 600, marginBottom: 4 }}>
                      📋 รอดำเนินการ: {otherJobs.map(j => `#${j.order_number}`).join(", ")}
                    </div>
                  )}

                  {/* Battery alert */}
                  {battLow && (
                    <div style={{ fontSize: 10, color: RED, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, marginBottom: 2 }}>
                      <AlertTriangle size={9} /> แบตใกล้หมด
                    </div>
                  )}

                  {/* Drop target hint */}
                  {dropTargetRider === r.rider_id && dragJobId && (
                    <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, textAlign: "center", marginTop: 4 }}>⬇ วางที่นี่เพื่อ Assign</div>
                  )}

                  {/* Detail button when selected */}
                  {isSelected && (
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/admin/riders/${r.rider_id}`); }}
                      style={{ marginTop: 8, width: "100%", padding: "6px 0", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#f9fafb", color: TEXT, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                    >ดูรายละเอียด →</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CENTER: Map ── */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Rider panel toggle */}
          <button
            onClick={() => setLeftOpen(p => !p)}
            title={leftOpen ? "ซ่อนรายการไรเดอร์" : "แสดงรายการไรเดอร์"}
            style={{
              position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
              zIndex: 10, background: "#fff", border: `1px solid ${BORDER}`,
              borderRadius: "50%", width: 28, height: 28, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,.18)", flexShrink: 0,
            }}
          >
            <ChevronLeft size={15} color={TEXT2} style={{ transform: leftOpen ? "none" : "rotate(180deg)", transition: "transform 0.2s" }} />
          </button>

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

              {/* Dashed line: selected rider → their assigned job */}
              <DashedLines riders={riders} jobs={jobs} selectedRiderId={selectedRiderId} />

              {/* Job markers */}
              {jobs.filter(j => j.appt_lat && j.appt_lng).map(job => {
                const status = getSLAStatus(job);
                const color = job.rider_id ? PURPLE : (status === "overdue" ? RED : status === "warning" ? YELLOW : ORANGE);
                const isSelected = selectedJobId === job.id;
                const mins = minutesToSLA(job.appt_date, job.appt_time);
                const idleRidersForAssign = riders
                  .map(r => ({
                    ...r,
                    activeCount: r.active_jobs?.length ?? 0,
                    distKm: job.appt_lat && job.appt_lng
                      ? haversineKm(r.lat, r.lng, job.appt_lat!, job.appt_lng!)
                      : 0,
                  }))
                  .sort((a, b) => a.activeCount - b.activeCount || a.distKm - b.distKm);
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
                                <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>ไม่มีไรเดอร์</p>
                              ) : idleRidersForAssign.slice(0, 3).map(r => {
                                const rName = r.admin_users?.name ?? "ไรเดอร์";
                                const isFull = r.activeCount >= RIDER_CAPACITY;
                                return (
                                  <button
                                    key={r.rider_id}
                                    disabled={assigning === job.id}
                                    onClick={e => { e.stopPropagation(); handleAssign(job.id, r.rider_id, rName); }}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: isFull ? "#FFF7ED" : BLUE, border: isFull ? `1px solid ${ORANGE}40` : "none", borderRadius: 8, padding: "8px 12px", color: isFull ? TEXT : "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                                  >
                                    <span>Assign → {rName}{isFull ? " ⚠" : ""}</span>
                                    <span style={{ opacity: 0.8, fontSize: 11, color: isFull ? ORANGE : undefined }}>{isFull ? `${r.activeCount} งาน · ` : ""}{r.distKm.toFixed(1)} กม.</span>
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
                    {assignedJobs.map(job => {
                      const ridersForReassign = riders
                        .filter(r => r.rider_id !== job.rider_id)
                        .map(r => ({
                          rider_id:    r.rider_id,
                          name:        r.admin_users?.name ?? "ไรเดอร์",
                          activeCount: r.active_jobs?.length ?? 0,
                          distKm:      job.appt_lat && job.appt_lng
                            ? haversineKm(r.lat, r.lng, job.appt_lat!, job.appt_lng!)
                            : 0,
                        }))
                        .sort((a, b) => a.activeCount - b.activeCount || a.distKm - b.distKm);
                      const isReassignOpen = assignDropdownJob === job.id;
                      const isAssigning = assigning === job.id;
                      return (
                        <div key={job.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}` }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>#{job.order_number}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: PURPLE, background: `${PURPLE}12`, padding: "2px 8px", borderRadius: 99 }}>🏍 {job.rider_name}</span>
                              {["confirmed", "pickup_scheduled", "en_route", "inspecting"].includes(job.status) && (
                                <button
                                  disabled={reclaimBusy === job.id}
                                  onClick={async () => {
                                    if (!confirm(`ดึงงาน #${job.order_number} คืนจาก ${job.rider_name ?? "ไรเดอร์"}?`)) return;
                                    setReclaimBusy(job.id);
                                    const res = await adminReclaimJob(job.id);
                                    if (!res.success) alert(res.error);
                                    setReclaimBusy(null);
                                  }}
                                  style={{ background: "none", border: `1px solid ${RED}60`, borderRadius: 6, padding: "2px 7px", fontSize: 11, color: RED, cursor: reclaimBusy === job.id ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}
                                >
                                  <RotateCcw size={10} />
                                  {reclaimBusy === job.id ? "..." : "ดึงคืน"}
                                </button>
                              )}
                              <div style={{ position: "relative" }}>
                                <button
                                  disabled={isAssigning}
                                  onClick={() => setAssignDropdownJob(isReassignOpen ? null : job.id)}
                                  style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "2px 7px", fontSize: 11, color: TEXT2, cursor: isAssigning ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 3 }}
                                >
                                  {isAssigning ? "..." : <>เปลี่ยน <ChevronDown size={10} /></>}
                                </button>
                                {isReassignOpen && (
                                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,.12)", zIndex: 200, minWidth: 180 }}>
                                    {ridersForReassign.length === 0 ? (
                                      <div style={{ padding: "10px 14px", fontSize: 12, color: TEXT2 }}>ไม่มีไรเดอร์คนอื่น</div>
                                    ) : ridersForReassign.map(r => {
                                      const isFull = r.activeCount >= RIDER_CAPACITY;
                                      return (
                                        <button
                                          key={r.rider_id}
                                          onClick={() => handleAssign(job.id, r.rider_id, r.name)}
                                          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", border: "none", background: isFull ? "#FFF7ED" : "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, color: TEXT, textAlign: "left" }}
                                        >
                                          <div>
                                            <span style={{ fontWeight: 600 }}>{r.name}</span>
                                            {r.activeCount > 0 && (
                                              <span style={{ fontSize: 10, marginLeft: 6, fontWeight: 600, color: isFull ? RED : ORANGE }}>
                                                {isFull ? "⚠ งานเต็ม" : `📋 ${r.activeCount} งาน`}
                                              </span>
                                            )}
                                          </div>
                                          <span style={{ color: TEXT2, fontSize: 11 }}>{r.distKm.toFixed(1)} กม.</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.device_model ?? "—"} · {job.customer_name ?? "—"}</p>
                          {job.appt_time && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT3 }}>🕐 {job.appt_date} {job.appt_time} น.</p>}
                        </div>
                      );
                    })}
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
                          <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{s.jobs_completed}/{s.jobs_attempted ?? 0} งาน</span>
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
          onClick={() => router.push("/admin/riders/jobs")}
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
