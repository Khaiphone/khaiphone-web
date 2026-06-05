"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { APIProvider, Map, AdvancedMarker, Polyline } from "@vis.gl/react-google-maps";
import { ArrowLeft, Battery, MapPin, Clock, CheckCircle2, AlertTriangle, Settings, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderShiftStats, fetchRiderTrail, fetchActiveRiders, adminCloseRiderShift } from "@/app/actions/rider-tracking";
import { fmtDistance, fmtEta, etaMinutes, distanceToOfficeKm, OFFICE_LAT, OFFICE_LNG } from "@/lib/geo-utils";

const DARK = "#1a1a2e";
const GOLD = "#c9a84c";
const BORDER = "#e5e7eb";
const TEXT = "#1a1a1a";
const TEXT2 = "#6b7280";
const GREEN = "#16a34a";
const ACCENT = "#2563eb";
const RED = "#dc2626";

type Shift = {
  id: string;
  clocked_in_at: string;
  clocked_out_at: string | null;
  jobs_completed: number;
  total_distance_km: number;
  ended_reason: string | null;
};

type TrailPoint = { lat: number; lng: number; recorded_at: string };

function shiftDuration(start: string, end?: string | null): string {
  const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

function thDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });
}

function thTime(iso: string) {
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

export default function RiderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [riderName, setRiderName] = useState("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; mode: string; battery: number | null } | null>(null);
  const [currentJob, setCurrentJob] = useState<{ order_number: string; device_model: string | null; customer_name: string | null; appt_location: string | null } | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [tab, setTab] = useState<"today" | "week" | "month">("today");
  const [loading, setLoading] = useState(true);
  const [closingShift, setClosingShift] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const dateRange = useCallback(() => {
    const now = new Date();
    const to = now.toISOString().split("T")[0];
    if (tab === "today") return { from: to, to };
    if (tab === "week") {
      const d = new Date(now); d.setDate(d.getDate() - 6);
      return { from: d.toISOString().split("T")[0], to };
    }
    const d = new Date(now); d.setDate(1);
    return { from: d.toISOString().split("T")[0], to };
  }, [tab]);

  const load = useCallback(async () => {
    const { from, to } = dateRange();
    const [shiftData, allRiders] = await Promise.all([
      fetchRiderShiftStats(id, from, to),
      fetchActiveRiders(),
    ]);
    setShifts(shiftData as Shift[]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const me = (allRiders as any[]).find(r => r.rider_id === id);
    if (me) {
      setRiderName(me.admin_users?.name ?? "ไรเดอร์");
      setCurrentLocation({ lat: me.lat, lng: me.lng, mode: me.tracking_mode, battery: me.battery_pct });
      setCurrentJob(me.current_job ?? null);

      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const trailData = await fetchRiderTrail(id, since24h);
      setTrail(trailData as TrailPoint[]);
    }
    setLoading(false);
  }, [id, dateRange]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`rider-detail-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rider_locations" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  async function handleCloseShift() {
    setClosingShift(true);
    await adminCloseRiderShift(id);
    setShowCloseConfirm(false);
    setClosingShift(false);
    load();
  }

  const totalJobs   = shifts.reduce((s, sh) => s + (sh.jobs_completed ?? 0), 0);
  const totalDistKm = shifts.reduce((s, sh) => s + (sh.total_distance_km ?? 0), 0);
  const openShift   = shifts.find(s => !s.clocked_out_at);
  const distOffice  = currentLocation ? distanceToOfficeKm(currentLocation.lat, currentLocation.lng) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f7", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
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

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16, maxWidth: 900, margin: "0 auto" }}>

        {/* Current shift */}
        {openShift && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>Shift ปัจจุบัน</p>
              <button
                onClick={() => setShowCloseConfirm(true)}
                style={{ fontSize: 12, fontWeight: 600, color: RED, background: "rgba(220,38,38,0.08)", border: `1px solid rgba(220,38,38,0.2)`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
              >
                ปิด Shift แทน
              </button>
            </div>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <Info label="เริ่มทำงาน" value={thTime(openShift.clocked_in_at)} />
              <Info label="ระยะเวลา" value={shiftDuration(openShift.clocked_in_at)} />
              <Info label="งานสำเร็จ" value={`${openShift.jobs_completed} งาน`} />
            </div>
            {/* Current job */}
            {currentJob && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: `${ACCENT}08`, border: `1px solid ${ACCENT}20`, borderRadius: 8 }}>
                <p style={{ margin: "0 0 2px", fontSize: 11, fontWeight: 700, color: ACCENT }}>งานปัจจุบัน — #{currentJob.order_number}</p>
                <p style={{ margin: 0, fontSize: 13, color: TEXT }}>
                  {currentJob.device_model ?? "—"} · {currentJob.customer_name ?? "—"}
                </p>
                {currentJob.appt_location && <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>{currentJob.appt_location}</p>}
              </div>
            )}
          </div>
        )}

        {/* Tab stats */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ borderBottom: `1px solid ${BORDER}`, display: "flex" }}>
            {(["today", "week", "month"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ flex: 1, padding: "10px 0", border: "none", background: tab === t ? `${ACCENT}10` : "transparent", color: tab === t ? ACCENT : TEXT2, fontSize: 13, fontWeight: tab === t ? 700 : 400, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === t ? `2px solid ${ACCENT}` : "none" }}>
                {t === "today" ? "วันนี้" : t === "week" ? "สัปดาห์" : "เดือนนี้"}
              </button>
            ))}
          </div>
          <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Kpi label="งานสำเร็จ" value={String(totalJobs)} icon={<CheckCircle2 size={16} color={GREEN} />} />
            <Kpi label="ระยะทาง" value={totalDistKm > 0 ? `${totalDistKm.toFixed(0)} กม.` : "—"} icon={<MapPin size={16} color={ACCENT} />} />
            <Kpi label="จำนวน Shift" value={String(shifts.length)} icon={<Clock size={16} color={GOLD} />} />
          </div>
        </div>

        {/* Trail map */}
        {currentLocation && (
          <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>เส้นทาง 24 ชั่วโมงที่ผ่านมา</p>
            </div>
            <div style={{ height: 320 }}>
              <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? ""}>
                <Map
                  defaultCenter={{ lat: currentLocation.lat, lng: currentLocation.lng }}
                  defaultZoom={13}
                  mapId="22ccc57d606934a9a2ae7032"
                  style={{ width: "100%", height: "100%" }}
                  disableDefaultUI
                >
                  <AdvancedMarker position={{ lat: OFFICE_LAT, lng: OFFICE_LNG }}>
                    <div style={{ background: DARK, color: GOLD, fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>🏠</div>
                  </AdvancedMarker>
                  <AdvancedMarker position={{ lat: currentLocation.lat, lng: currentLocation.lng }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: ACCENT, border: "2px solid #fff", boxShadow: "0 0 6px rgba(37,99,235,.5)" }} />
                  </AdvancedMarker>
                  {trail.length > 1 && (
                    <Polyline
                      path={trail.map(p => ({ lat: p.lat, lng: p.lng }))}
                      strokeColor={ACCENT}
                      strokeWeight={3}
                      strokeOpacity={0.7}
                    />
                  )}
                </Map>
              </APIProvider>
            </div>
          </div>
        )}

        {/* Shift history */}
        <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: TEXT2, textTransform: "uppercase" }}>ประวัติ Shift</p>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: TEXT2 }}>กำลังโหลด...</div>
          ) : shifts.filter(s => s.clocked_out_at).length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: TEXT2, fontSize: 14 }}>ยังไม่มีประวัติ</div>
          ) : (
            shifts.filter(s => s.clocked_out_at).map((s, i) => (
              <div key={s.id} style={{ padding: "12px 16px", borderBottom: i < shifts.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600, color: TEXT }}>{thDate(s.clocked_in_at)}</p>
                  <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{thTime(s.clocked_in_at)} – {s.clocked_out_at ? thTime(s.clocked_out_at) : "กำลังทำงาน"} · {shiftDuration(s.clocked_in_at, s.clocked_out_at)}</p>
                  {s.ended_reason === "auto_timeout" && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: "#f97316" }}><AlertTriangle size={10} style={{ verticalAlign: "middle" }} /> ปิด shift อัตโนมัติ</p>
                  )}
                  {s.ended_reason === "admin_closed" && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>ปิดโดย Admin</p>
                  )}
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

      {/* Close shift confirm */}
      {showCloseConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setShowCloseConfirm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 360 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>ปิด Shift แทนไรเดอร์?</p>
              <button onClick={() => setShowCloseConfirm(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: TEXT2 }}><X size={18} /></button>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: TEXT2, lineHeight: 1.6 }}>
              ระบบจะ clock-out ให้ <strong>{riderName}</strong> ทันที และบันทึกว่า "ปิดโดย Admin"
            </p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: "0 0 2px", fontSize: 11, color: TEXT2 }}>{label}</p>
      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{value}</p>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>{icon}</div>
      <p style={{ margin: "0 0 2px", fontSize: 18, fontWeight: 800, color: TEXT }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{label}</p>
    </div>
  );
}
