"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { Navigation, Battery, Wifi, AlertTriangle, ChevronRight, Users, CheckCircle2, Clock, Settings, Smartphone } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchActiveRiders, fetchAllRidersShifts, fetchUnassignedJobs } from "@/app/actions/rider-tracking";
import { assignRider, backfillRequestCoords } from "@/app/actions/admin-requests";
import { haversineKm, etaMinutes, fmtDistance, fmtEta, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";

const DARK = "#1a1a2e";
const GOLD = "#c9a84c";
const CARD = "#ffffff";
const BORDER = "#e5e7eb";
const TEXT = "#1a1a1a";
const TEXT2 = "#6b7280";
const GREEN = "#16a34a";
const RED = "#dc2626";
const BLUE = "#2563eb";
const ORANGE = "#ea580c";

const MODE_COLOR: Record<string, string> = {
  idle:    BLUE,
  enroute: ORANGE,
  on_site: GREEN,
  return:  "#7c3aed",
};

const MODE_LABEL: Record<string, string> = {
  idle:    "ว่าง",
  enroute: "เดินทาง",
  on_site: "กับลูกค้า",
  return:  "กลับออฟฟิศ",
};

type ActiveRider = {
  rider_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  tracking_mode: string;
  battery_pct: number | null;
  app_state: string;
  last_heartbeat: string;
  is_online: boolean;
  current_job_id: string | null;
  shift_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin_users: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rider_shifts: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  current_job: any;
};

type UnassignedJob = {
  id: string;
  order_number: string;
  device_model: string | null;
  customer_name: string | null;
  appt_location: string | null;
  appt_date: string | null;
  appt_time: string | null;
  appt_lat: number | null;
  appt_lng: number | null;
};

type AllShift = {
  id: string;
  rider_id: string;
  rider_name: string;
  clocked_in_at: string;
  clocked_out_at: string | null;
  jobs_completed: number;
  total_distance_km: number | null;
  ended_reason: string | null;
};

function shiftDuration(clockedIn: string, clockedOut?: string | null): string {
  const ms = (clockedOut ? new Date(clockedOut) : new Date()).getTime() - new Date(clockedIn).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function lastSeen(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 30) return "เพิ่งอัพเดต";
  if (sec < 120) return `${sec} วิที่แล้ว`;
  const m = Math.floor(sec / 60);
  return `${m} นาทีที่แล้ว`;
}

function thTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function minutesUntilAppt(date: string | null, time: string | null): number | null {
  if (!date || !time) return null;
  return Math.floor((new Date(`${date}T${time}:00`).getTime() - Date.now()) / 60000);
}

function urgencyColor(mins: number | null): string {
  if (mins === null) return TEXT2;
  if (mins < 0) return TEXT2;
  if (mins < 60) return RED;
  if (mins < 180) return ORANGE;
  return GREEN;
}

function urgencyLabel(mins: number | null): string {
  if (mins === null) return "";
  if (mins < 0) return "เลยเวลา";
  if (mins < 60) return `${mins} นาที`;
  return `${Math.floor(mins / 60)} ชม.${mins % 60 > 0 ? ` ${mins % 60} นาที` : ""}`;
}

export default function RidersDashboard() {
  const router = useRouter();
  const [riders, setRiders] = useState<ActiveRider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRider, setSelectedRider] = useState<string | null>(null);
  const [mapCenter] = useState({ lat: OFFICE_LAT, lng: OFFICE_LNG });
  const [sidebarTab, setSidebarTab] = useState<"riders" | "jobs" | "shifts">("riders");
  const [allShifts, setAllShifts] = useState<AllShift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftFilter, setShiftFilter] = useState<string | null>(null);
  const [unassignedJobs, setUnassignedJobs] = useState<UnassignedJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [dragJobId, setDragJobId] = useState<string | null>(null);
  const [dropTargetRider, setDropTargetRider] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchActiveRiders();
    setRiders(data as ActiveRider[]);
    setLoading(false);
  }, []);

  const loadShifts = useCallback(async () => {
    setShiftsLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const data = await fetchAllRidersShifts(today);
    setAllShifts(data as AllShift[]);
    setShiftsLoading(false);
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    const data = await fetchUnassignedJobs();
    setUnassignedJobs(data as UnassignedJob[]);
    setJobsLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadJobs();
    const ch = supabase
      .channel("admin-rider-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, () => load())
      .subscribe();
    const interval = setInterval(load, 30_000);
    return () => { supabase.removeChannel(ch); clearInterval(interval); };
  }, [load, loadJobs]);

  useEffect(() => {
    if (sidebarTab === "shifts") loadShifts();
    if (sidebarTab === "jobs") loadJobs();
  }, [sidebarTab, loadShifts, loadJobs]);

  async function handleAssignDrop(jobId: string, riderId: string, riderName: string) {
    setAssigning(jobId);
    setDropTargetRider(null);
    setDragJobId(null);
    await assignRider(jobId, riderId, riderName);
    setAssigning(null);
    loadJobs();
  }

  const officeToRider = (r: ActiveRider) => haversineKm(OFFICE_LAT, OFFICE_LNG, r.lat, r.lng);

  const onlineCount    = riders.length;
  const returningCount = riders.filter(r => r.tracking_mode === "return").length;
  const busyCount      = riders.filter(r => r.tracking_mode !== "idle").length;

  const selected = riders.find(r => r.rider_id === selectedRider);

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: DARK, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0, color: GOLD, fontSize: 18, fontWeight: 800 }}>Rider Dashboard</h1>
          <p style={{ margin: 0, color: "rgba(255,255,255,.5)", fontSize: 12 }}>Live tracking — อัพเดตทุก 30 วินาที</p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Stat label="ออนไลน์" value={onlineCount} color={GREEN} icon={<Wifi size={14} />} />
          <Stat label="กลับออฟฟิศ" value={returningCount} color="#7c3aed" icon={<Navigation size={14} />} />
          <Stat label="กำลังทำงาน" value={busyCount} color={ORANGE} icon={<Clock size={14} />} />
          <button
            onClick={async () => { setSyncing(true); await backfillRequestCoords(); await loadJobs(); setSyncing(false); }}
            disabled={syncing}
            style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: syncing ? "rgba(255,255,255,.4)" : "#fff", borderRadius: 8, padding: "6px 12px", cursor: syncing ? "default" : "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
          >
            <Navigation size={14} /> {syncing ? "กำลังซิงค์..." : "ซิงค์พิกัด"}
          </button>
          <button onClick={() => router.push("/admin/riders/manage")} style={{ background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
            <Settings size={14} /> จัดการ
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", height: "calc(100vh - 68px)" }}>

        {/* Map */}
        <div style={{ position: "relative" }}>
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={12}
              mapId="22ccc57d606934a9bbe74a52"
              style={{ width: "100%", height: "100%" }}
              disableDefaultUI={false}
            >
              <AdvancedMarker position={{ lat: OFFICE_LAT, lng: OFFICE_LNG }}>
                <div style={{ background: DARK, color: GOLD, fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 6, border: `1px solid ${GOLD}`, whiteSpace: "nowrap" }}>
                  🏠 ออฟฟิศ
                </div>
              </AdvancedMarker>

              {riders.map(r => {
                const color = MODE_COLOR[r.tracking_mode] ?? BLUE;
                const isSelected = r.rider_id === selectedRider;
                const name = r.admin_users?.name ?? "ไรเดอร์";
                return (
                  <AdvancedMarker
                    key={r.rider_id}
                    position={{ lat: r.lat, lng: r.lng }}
                    onClick={() => setSelectedRider(r.rider_id === selectedRider ? null : r.rider_id)}
                  >
                    <div style={{ position: "relative" }}>
                      <Pin background={color} borderColor={isSelected ? "#fff" : color} glyphColor="#fff" />
                      {isSelected && (
                        <div style={{ position: "absolute", top: -36, left: "50%", transform: "translateX(-50%)", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 600, color: TEXT, whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(0,0,0,.15)" }}>
                          {name} · {MODE_LABEL[r.tracking_mode] ?? r.tracking_mode}
                        </div>
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* Job appointment markers */}
              {unassignedJobs.filter(j => j.appt_lat && j.appt_lng).map(job => {
                const mins = minutesUntilAppt(job.appt_date, job.appt_time);
                const uColor = urgencyColor(mins);
                const isSelected = selectedJobId === job.id;
                return (
                  <AdvancedMarker
                    key={job.id}
                    position={{ lat: job.appt_lat!, lng: job.appt_lng! }}
                    onClick={() => setSelectedJobId(isSelected ? null : job.id)}
                  >
                    <div style={{ position: "relative" }}>
                      <div style={{
                        background: uColor, color: "#fff", fontSize: 10, fontWeight: 700,
                        padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap",
                        border: `1.5px solid rgba(255,255,255,0.7)`,
                        boxShadow: "0 2px 6px rgba(0,0,0,.25)",
                        cursor: "pointer",
                      }}>
                        📍 {job.order_number}
                      </div>
                      {isSelected && (
                        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", fontSize: 12, color: TEXT, whiteSpace: "nowrap", boxShadow: "0 4px 12px rgba(0,0,0,.15)", minWidth: 160 }}>
                          <p style={{ margin: "0 0 2px", fontWeight: 700 }}>#{job.order_number}</p>
                          <p style={{ margin: "0 0 2px", color: TEXT2 }}>{job.device_model} · {job.customer_name}</p>
                          {job.appt_time && <p style={{ margin: 0, color: uColor, fontWeight: 600 }}>🕐 {job.appt_time} น.{mins !== null ? ` · ${urgencyLabel(mins)}` : ""}</p>}
                        </div>
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}
            </Map>
          </APIProvider>
        </div>

        {/* Sidebar */}
        <div style={{ background: CARD, borderLeft: `1px solid ${BORDER}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Tab header */}
          <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {(["riders", "jobs", "shifts"] as const).map(tab => {
              const label = tab === "riders" ? "ไรเดอร์" : tab === "jobs" ? `งาน${unassignedJobs.length > 0 ? ` (${unassignedJobs.length})` : ""}` : "Shift";
              const active = sidebarTab === tab;
              return (
                <button key={tab} onClick={() => setSidebarTab(tab)} style={{ flex: 1, padding: "11px 0", border: "none", background: active ? `${BLUE}08` : "transparent", color: active ? BLUE : TEXT2, fontSize: 12, fontWeight: active ? 700 : 400, cursor: "pointer", fontFamily: "inherit", borderBottom: active ? `2px solid ${BLUE}` : "none" }}>
                  {label}
                </button>
              );
            })}
          </div>

          {sidebarTab === "jobs" ? (
            /* Jobs / Planner tab */
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {/* Unassigned jobs */}
              <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>งานรอ Assign</p>
                <button onClick={loadJobs} style={{ background: "none", border: "none", color: TEXT2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>รีเฟรช</button>
              </div>
              {jobsLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: TEXT2, fontSize: 13 }}>กำลังโหลด...</div>
              ) : unassignedJobs.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center" }}>
                  <CheckCircle2 size={28} color={GREEN} style={{ marginBottom: 6 }} />
                  <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>ไม่มีงานรอ Assign</p>
                </div>
              ) : unassignedJobs.map(job => {
                const mins = minutesUntilAppt(job.appt_date, job.appt_time);
                const uColor = urgencyColor(mins);
                const uLabel = urgencyLabel(mins);
                const isAssigning = assigning === job.id;
                return (
                  <div
                    key={job.id}
                    draggable
                    onDragStart={e => { e.dataTransfer.setData("jobId", job.id); e.dataTransfer.setData("jobLabel", `${job.order_number}`); setDragJobId(job.id); }}
                    onDragEnd={() => setDragJobId(null)}
                    style={{
                      margin: "0 10px 8px",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `1.5px solid ${dragJobId === job.id ? uColor : BORDER}`,
                      background: isAssigning ? "#f9fafb" : "#fff",
                      cursor: isAssigning ? "wait" : "grab",
                      opacity: isAssigning ? 0.5 : 1,
                      transition: "border-color 0.1s",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: TEXT }}>#{job.order_number}</span>
                      {uLabel && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: uColor, background: `${uColor}15`, padding: "2px 6px", borderRadius: 6 }}>
                          {mins !== null && mins < 0 ? "⚠ " : mins !== null && mins < 60 ? "🔴 " : mins !== null && mins < 180 ? "🟡 " : "🟢 "}{uLabel}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, color: TEXT }}>{job.device_model ?? "—"} · {job.customer_name ?? "—"}</p>
                    {job.appt_time && <p style={{ margin: "0 0 2px", fontSize: 11, color: TEXT2 }}>🕐 นัด {job.appt_time} น.</p>}
                    {job.appt_location && <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>📍 {job.appt_location}</p>}
                    <p style={{ margin: "6px 0 0", fontSize: 10, color: TEXT2 }}>↖ ลากไปวางที่ไรเดอร์ด้านล่าง</p>
                  </div>
                );
              })}

              {/* Online riders as drop targets */}
              <div style={{ borderTop: `2px dashed ${BORDER}`, margin: "4px 0 0", padding: "10px 16px 6px", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {dragJobId ? "⬇ วางที่ไรเดอร์" : "ไรเดอร์ออนไลน์"}
                </p>
              </div>
              {riders.length === 0 ? (
                <div style={{ padding: "12px 16px", textAlign: "center" }}>
                  <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>ยังไม่มีไรเดอร์ออนไลน์</p>
                </div>
              ) : riders.map(r => {
                const riderName = r.admin_users?.name ?? "ไรเดอร์";
                const color = MODE_COLOR[r.tracking_mode] ?? BLUE;
                const isTarget = dropTargetRider === r.rider_id;
                return (
                  <div
                    key={r.rider_id}
                    onDragOver={e => { e.preventDefault(); setDropTargetRider(r.rider_id); }}
                    onDragLeave={() => setDropTargetRider(null)}
                    onDrop={e => { e.preventDefault(); const jobId = e.dataTransfer.getData("jobId"); if (jobId) handleAssignDrop(jobId, r.rider_id, riderName); }}
                    style={{
                      margin: "0 10px 8px",
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: `${isTarget ? "2px" : "1.5px"} ${isTarget ? "solid" : "dashed"} ${isTarget ? BLUE : BORDER}`,
                      background: isTarget ? `${BLUE}08` : "#f9fafb",
                      transition: "all 0.1s",
                      flexShrink: 0,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{riderName}</span>
                      <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: `${color}15`, color }}>{MODE_LABEL[r.tracking_mode] ?? r.tracking_mode}</span>
                    </div>
                    {isTarget && <p style={{ margin: "4px 0 0", fontSize: 11, color: BLUE, fontWeight: 600 }}>วางที่นี่เพื่อ Assign →</p>}
                  </div>
                );
              })}
            </div>
          ) : sidebarTab === "riders" ? (
            <>
              {/* Selected rider detail */}
              {selected && (
                <div style={{ background: `${MODE_COLOR[selected.tracking_mode] ?? BLUE}10`, borderBottom: `2px solid ${MODE_COLOR[selected.tracking_mode] ?? BLUE}`, padding: "14px 16px", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{selected.admin_users?.name ?? "ไรเดอร์"}</p>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: MODE_COLOR[selected.tracking_mode] ?? BLUE, color: "#fff" }}>
                      {MODE_LABEL[selected.tracking_mode] ?? selected.tracking_mode}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, color: TEXT2 }}>
                    <span>📡 {lastSeen(selected.last_heartbeat)}</span>
                    {selected.battery_pct != null && <span>🔋 {selected.battery_pct}%</span>}
                    <span>📏 {fmtDistance(officeToRider(selected))} จากออฟฟิศ</span>
                    <span>🕐 {fmtEta(etaMinutes(officeToRider(selected)))}</span>
                  </div>
                  {/* Current job */}
                  {selected.current_job && (
                    <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(255,255,255,.6)", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <Smartphone size={13} color={BLUE} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: BLUE }}>#{selected.current_job.order_number}</p>
                        <p style={{ margin: 0, fontSize: 12, color: TEXT }}>{selected.current_job.device_model ?? "—"} · {selected.current_job.customer_name ?? "—"}</p>
                        {selected.current_job.appt_location && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>{selected.current_job.appt_location}</p>}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => router.push(`/admin/riders/${selected.rider_id}`)}
                    style={{ marginTop: 10, width: "100%", padding: "8px 0", borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", color: TEXT, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                    ดูรายละเอียด →
                  </button>
                </div>
              )}

              {/* Rider list */}
              <div style={{ flex: 1 }}>
                <div style={{ padding: "12px 16px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={14} color={TEXT2} />
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    ออนไลน์ {onlineCount} คน
                  </p>
                </div>

                {loading ? (
                  <div style={{ padding: 32, textAlign: "center", color: TEXT2, fontSize: 14 }}>กำลังโหลด...</div>
                ) : riders.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <WifiOff size={32} color={BORDER} style={{ marginBottom: 8 }} />
                    <p style={{ margin: 0, fontSize: 14, color: TEXT2 }}>ยังไม่มีไรเดอร์ออนไลน์</p>
                  </div>
                ) : riders.map(r => {
                  const color = MODE_COLOR[r.tracking_mode] ?? BLUE;
                  const name = r.admin_users?.name ?? "ไรเดอร์";
                  const shift = r.rider_shifts;
                  const distKm = officeToRider(r);
                  const isReturn = r.tracking_mode === "return";
                  const isSelected = r.rider_id === selectedRider;

                  return (
                    <div
                      key={r.rider_id}
                      onClick={() => setSelectedRider(r.rider_id === selectedRider ? null : r.rider_id)}
                      style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}`, cursor: "pointer", background: isSelected ? `${color}08` : "transparent", borderLeft: isSelected ? `3px solid ${color}` : "3px solid transparent", transition: "background 0.1s" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{name}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: `${color}15`, color }}>{MODE_LABEL[r.tracking_mode] ?? r.tracking_mode}</span>
                          <ChevronRight size={14} color={TEXT2} />
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 12, fontSize: 11, color: TEXT2 }}>
                        {shift?.clocked_in_at && <span><Clock size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />{shiftDuration(shift.clocked_in_at)}</span>}
                        {shift?.jobs_completed > 0 && <span><CheckCircle2 size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />{shift.jobs_completed} งาน</span>}
                        {r.battery_pct != null && (
                          <span style={{ color: r.battery_pct < 20 ? RED : TEXT2 }}>
                            <Battery size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />{r.battery_pct}%
                          </span>
                        )}
                      </div>

                      {r.current_job && (
                        <div style={{ marginTop: 4, fontSize: 11, color: BLUE, fontWeight: 600 }}>
                          <Smartphone size={10} style={{ verticalAlign: "middle", marginRight: 3 }} />
                          #{r.current_job.order_number} · {r.current_job.device_model ?? "—"}
                        </div>
                      )}

                      {isReturn && (
                        <div style={{ marginTop: 4, fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>
                          🏠 กลับออฟฟิศ · {fmtDistance(distKm)} · {fmtEta(etaMinutes(distKm))}
                        </div>
                      )}

                      {r.battery_pct != null && r.battery_pct < 20 && (
                        <div style={{ marginTop: 4, fontSize: 11, color: RED, fontWeight: 600 }}>
                          <AlertTriangle size={10} style={{ verticalAlign: "middle", marginRight: 2 }} />แบตใกล้หมด
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Shifts tab */
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {/* Rider filter pills */}
              {allShifts.length > 0 && (() => {
                const names = [...new Set(allShifts.map(s => s.rider_name))];
                if (names.length < 2) return null;
                return (
                  <div style={{ padding: "10px 12px 0", display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0 }}>
                    <button
                      onClick={() => setShiftFilter(null)}
                      style={{ padding: "4px 10px", borderRadius: 99, border: `1px solid ${shiftFilter === null ? BLUE : BORDER}`, background: shiftFilter === null ? `${BLUE}12` : "transparent", color: shiftFilter === null ? BLUE : TEXT2, fontSize: 12, fontWeight: shiftFilter === null ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}
                    >ทั้งหมด</button>
                    {names.map(name => (
                      <button
                        key={name}
                        onClick={() => setShiftFilter(name === shiftFilter ? null : name)}
                        style={{ padding: "4px 10px", borderRadius: 99, border: `1px solid ${shiftFilter === name ? BLUE : BORDER}`, background: shiftFilter === name ? `${BLUE}12` : "transparent", color: shiftFilter === name ? BLUE : TEXT2, fontSize: 12, fontWeight: shiftFilter === name ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}
                      >{name}</button>
                    ))}
                  </div>
                );
              })()}
              <div style={{ padding: "8px 16px 4px" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Shift ทั้งหมดวันนี้
                </p>
              </div>
              {shiftsLoading ? (
                <div style={{ padding: 32, textAlign: "center", color: TEXT2, fontSize: 14 }}>กำลังโหลด...</div>
              ) : allShifts.length === 0 ? (
                <div style={{ padding: 32, textAlign: "center" }}>
                  <Clock size={32} color={BORDER} style={{ marginBottom: 8 }} />
                  <p style={{ margin: 0, fontSize: 14, color: TEXT2 }}>ยังไม่มี Shift วันนี้</p>
                </div>
              ) : allShifts.filter(s => shiftFilter === null || s.rider_name === shiftFilter).map((s, i, arr) => (
                <div key={s.id} style={{ padding: "12px 16px", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{s.rider_name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: GREEN }}>{s.jobs_completed} งาน</span>
                  </div>
                  <div style={{ fontSize: 12, color: TEXT2 }}>
                    {thTime(s.clocked_in_at)} – {s.clocked_out_at ? thTime(s.clocked_out_at) : <span style={{ color: GREEN, fontWeight: 600 }}>กำลังทำงาน</span>}
                    {" · "}{shiftDuration(s.clocked_in_at, s.clocked_out_at)}
                    {s.total_distance_km != null && s.total_distance_km > 0 && ` · ${s.total_distance_km.toFixed(0)} กม.`}
                  </div>
                  {s.ended_reason === "admin_closed" && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>ปิดโดย Admin</p>}
                  {s.ended_reason === "auto_timeout" && <p style={{ margin: "2px 0 0", fontSize: 11, color: ORANGE }}>⚠ ปิดอัตโนมัติ</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", color, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
        {icon}{label}
      </div>
      <p style={{ margin: 0, color, fontSize: 20, fontWeight: 800 }}>{value}</p>
    </div>
  );
}

function WifiOff({ size, color, style }: { size: number; color: string; style?: React.CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.56 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>;
}
