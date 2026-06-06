"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Banknote, ArrowUpDown, Package, Wifi, WifiOff, CheckCircle2, Navigation, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchRiderHomeData, riderAcceptJob, riderRejectJob } from "@/app/actions/rider";
import { openShift, closeShift, riderPingLocation, fetchActiveShift } from "@/app/actions/rider-tracking";
import { startTracking, stopTracking, setTrackingMode, isTracking } from "@/lib/rider-tracking";
import { Sk } from "@/app/rider/skeleton";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";
import { cacheGet, cacheSet } from "@/app/rider/cache";
import type { AdminRequest } from "@/lib/types/admin";

const STATUS_LABEL: Record<string, string> = {
  pickup_scheduled:  "รับงานแล้ว — รอออกเดินทาง",
  en_route:          "กำลังเดินทาง",
  inspecting:        "กำลังตรวจเครื่อง",
  price_negotiation: "รอยืนยันราคา",
  contracting:       "กำลังทำสัญญา",
  awaiting_transfer: "รอ Finance โอน",
};

function fmt(n: number) { return n.toLocaleString("th-TH"); }

type HomeData = { pending: AdminRequest[]; active: AdminRequest[]; stats: { completedJobs: number; totalEarnings: number } };

export default function RiderHomePage() {
  const router = useRouter();
  const { CARD, CARD2, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2 } = useRiderTheme();
  const { userId, isOnline, setIsOnline } = useRiderSession();
  const [toggling, setToggling]       = useState(false);
  const [shiftId, setShiftId]         = useState<string | null>(null);
  const [pendingJobs, setPendingJobs] = useState<AdminRequest[]>([]);
  const [activeJobs, setActiveJobs]   = useState<AdminRequest[]>([]);
  const [stats, setStats]             = useState({ completedJobs: 0, totalEarnings: 0 });
  const [accepting, setAccepting]     = useState<string | null>(null);
  const [rejecting, setRejecting]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  const loadData = useCallback(async (uid: string) => {
    const homeData = await fetchRiderHomeData(uid);
    setPendingJobs(homeData.pending);
    setActiveJobs(homeData.active);
    setStats(homeData.stats);
    cacheSet<HomeData>(`home:${uid}`, homeData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const cached = cacheGet<HomeData>(`home:${userId}`);
    if (cached) {
      setPendingJobs(cached.pending);
      setActiveJobs(cached.active);
      setStats(cached.stats);
      setLoading(false);
    }
    loadData(userId);

    // Real-time: reload when any request is updated (broadcast uses "request-updates" channel)
    const ch = supabase
      .channel("request-updates")
      .on("broadcast", { event: "updated" }, () => loadData(userId))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => { if (payload.new?.rider_id === userId) loadData(userId); })
      .subscribe();

    const onVisible = () => { if (document.visibilityState === "visible") loadData(userId); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, loadData]);

  // ── Auto-resume tracking (Grab-style) ────────────────────────────────────────
  useEffect(() => {
    if (!userId || !isOnline || isTracking()) return;

    fetchActiveShift().then(shift => {
      if (!shift) { setIsOnline(false); return; } // shift closed server-side
      setShiftId(shift.shiftId);
      const sid = shift.shiftId;
      const jid = shift.currentJobId;
      startTracking(async (payload) => {
        await riderPingLocation({ ...payload, shiftId: sid, currentJobId: jid });
      }).catch(() => {}); // GPS may be denied — silently skip, rider can retry via toggle
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOnline]);

  // ── Reconnect when app comes back to foreground ───────────────────────────────
  useEffect(() => {
    if (!userId || !isOnline) return;

    async function onVisible() {
      if (document.visibilityState !== "visible" || isTracking()) return;
      const shift = await fetchActiveShift();
      if (!shift) { setIsOnline(false); return; }
      setShiftId(shift.shiftId);
      const sid = shift.shiftId;
      const jid = shift.currentJobId;
      await startTracking(async (payload) => {
        await riderPingLocation({ ...payload, shiftId: sid, currentJobId: jid });
      }).catch(() => {});
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isOnline]);

  async function toggleOnline() {
    setToggling(true);
    const next = !isOnline;
    if (next) {
      // Going online: get GPS first
      const gpsOk = await new Promise<boolean>((resolve) => {
        if (!("geolocation" in navigator)) { resolve(false); return; }
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { enableHighAccuracy: true, timeout: 8_000 }
        );
      });
      if (!gpsOk) {
        alert("ไม่สามารถรับพิกัด GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในการตั้งค่า");
        setToggling(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const res = await openShift(pos.coords.latitude, pos.coords.longitude);
        if (res.success) {
          setShiftId(res.shiftId);
          setIsOnline(true);
          const sid = res.shiftId;
          await startTracking(async (payload) => {
            await riderPingLocation({ ...payload, shiftId: sid, currentJobId: null });
          });
        }
        setToggling(false);
      }, () => setToggling(false), { enableHighAccuracy: true, timeout: 8_000 });
    } else {
      // Going offline
      stopTracking();
      const pos = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 3_000 });
      });
      await closeShift(pos?.coords.latitude ?? null, pos?.coords.longitude ?? null);
      setShiftId(null);
      setIsOnline(false);
      setToggling(false);
    }
  }

  async function acceptJob(jobId: string) {
    setAccepting(jobId);
    const res = await riderAcceptJob(jobId);
    if (res.success) {
      const job = pendingJobs.find(j => j.id === jobId);
      if (job) {
        setPendingJobs(prev => prev.filter(j => j.id !== jobId));
        setActiveJobs(prev => [{ ...job, status: "pickup_scheduled" }, ...prev]);
      }
      if (userId) loadData(userId);
    }
    setAccepting(null);
  }

  if (loading) return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Sk w={22} h={22} r={11} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Sk w={90} h={14} />
            <Sk w={120} h={11} />
          </div>
        </div>
        <Sk w={52} h={30} r={15} />
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <Sk w={60} h={15} />
          <Sk w={40} h={20} r={10} />
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Sk w="70%" h={13} />
            <Sk w="85%" h={13} />
          </div>
          <Sk h={38} r={10} />
          <Sk h={46} r={12} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
            <Sk w="80%" h={10} />
            <Sk w="60%" h={20} />
          </div>
        ))}
      </div>
      <div>
        <Sk w={80} h={15} style={{ marginBottom: 12 }} />
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <Sk w="60%" h={14} />
            <Sk w="40%" h={11} />
          </div>
          <Sk w={70} h={26} r={8} />
        </div>
      </div>
    </div>
  );

  const cashTotal = activeJobs
    .filter(j => j.payment.method === "cash")
    .reduce((s, j) => s + (j.device.actualPrice ?? j.device.estimatedPrice), 0);

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Online toggle card */}
      <div style={{
        background: CARD,
        border: `1px solid ${isOnline ? "rgba(74,222,128,0.3)" : BORDER}`,
        borderRadius: 16, padding: "16px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {isOnline
            ? <Wifi size={22} color={ACCENT} />
            : <WifiOff size={22} color={TEXT2} />
          }
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>
              {isOnline ? "พร้อมรับงาน" : "ออฟไลน์"}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: isOnline ? ACCENT : TEXT2 }}>
              {isOnline ? "คุณพร้อมรับงานแล้ว" : "กดเพื่อเปิดรับงาน"}
            </p>
          </div>
        </div>
        <button
          onClick={toggleOnline}
          disabled={toggling}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <div style={{
            width: 52, height: 30, borderRadius: 15,
            background: isOnline ? ACCENT : BORDER,
            position: "relative", transition: "background 0.2s",
            opacity: toggling ? 0.6 : 1,
          }}>
            <div style={{
              position: "absolute", top: 4, left: isOnline ? 26 : 4,
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
        </button>
      </div>

      {/* Pending jobs (new) */}
      {pendingJobs.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>งานใหม่</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: "rgba(74,222,128,0.12)", padding: "3px 10px", borderRadius: 20 }}>
              {pendingJobs.length} งาน
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {pendingJobs.map(job => {
              const price = job.device.actualPrice ?? job.device.estimatedPrice;
              const isAccepting = accepting === job.id;
              return (
                <div key={job.id} style={{ background: CARD, border: `1px solid rgba(74,222,128,0.25)`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: TEXT2, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>รับที่</p>
                        <p style={{ margin: 0, fontSize: 13, color: TEXT }}>Khaiphone Store</p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <MapPin size={10} color={ACCENT} style={{ marginTop: 3, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>ส่งที่</p>
                        <p style={{ margin: 0, fontSize: 13, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {job.appointment.location || "ไม่ระบุที่อยู่"}
                        </p>
                        {job.distanceKm != null && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: TEXT2 }}>{job.distanceKm} กม.</p>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: ACCENT, flexShrink: 0, marginLeft: 8 }}>฿{fmt(price)}</p>
                    </div>
                  </div>

                  {job.appointment.location && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.appointment.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "10px 0", borderRadius: 10,
                        background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)",
                        textDecoration: "none", color: ACCENT, fontSize: 13, fontWeight: 600,
                      }}
                    >
                      <Navigation size={14} />
                      นำทาง
                    </a>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD2, borderRadius: 10, padding: "8px 12px" }}>
                    <Package size={14} color={TEXT2} />
                    <span style={{ fontSize: 13, color: TEXT, flex: 1 }}>{job.device.model} {job.device.storage}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: job.payment.method === "cash" ? "rgba(48,209,88,0.12)" : "rgba(10,132,255,0.12)", borderRadius: 6, padding: "3px 8px" }}>
                      {job.payment.method === "cash"
                        ? <Banknote size={11} color={GREEN} />
                        : <ArrowUpDown size={11} color="#0A84FF" />}
                      <span style={{ fontSize: 11, fontWeight: 600, color: job.payment.method === "cash" ? GREEN : "#0A84FF" }}>
                        {job.payment.method === "cash" ? "สด" : "โอน"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={async () => {
                        if (!confirm("ปฏิเสธงานนี้?")) return;
                        setRejecting(job.id);
                        await riderRejectJob(job.id);
                        setRejecting(null);
                        if (userId) loadData(userId);
                      }}
                      disabled={isAccepting || rejecting === job.id}
                      style={{
                        flex: "0 0 auto", padding: "14px 18px", borderRadius: 12,
                        background: "transparent", border: `1.5px solid ${RED}`,
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: 14, fontWeight: 700, color: RED,
                        opacity: (isAccepting || rejecting === job.id) ? 0.5 : 1,
                      }}
                    >
                      {rejecting === job.id ? "..." : "ปฏิเสธ"}
                    </button>
                    <button
                      onClick={() => acceptJob(job.id)}
                      disabled={isAccepting || rejecting === job.id}
                      style={{
                        flex: 1, padding: "14px 0", borderRadius: 12,
                        background: isAccepting ? "rgba(74,222,128,0.4)" : ACCENT,
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                        fontSize: 15, fontWeight: 700, color: "#000",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        opacity: rejecting === job.id ? 0.5 : 1,
                      }}
                    >
                      {isAccepting
                        ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.8s linear infinite" }} />
                        : <CheckCircle2 size={18} />
                      }
                      {isAccepting ? "กำลังรับงาน..." : "รับงานนี้"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "งานเดือนนี้",   value: `${stats.completedJobs}`,              sub: "งาน" },
          { label: "มูลค่าเดือนนี้",  value: `฿${fmt(stats.totalEarnings)}`,        sub: ""    },
          { label: "งานในมือ",      value: `${activeJobs.length + pendingJobs.length}`, sub: "งาน" },
        ].map(({ label, value, sub }) => (
          <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 12px" }}>
            <p style={{ margin: 0, fontSize: 10, color: TEXT2, lineHeight: 1.3 }}>{label}</p>
            <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, color: ACCENT }}>{value}</p>
            {sub && <p style={{ margin: 0, fontSize: 10, color: TEXT2 }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Cash to carry */}
      {cashTotal > 0 && (
        <div style={{ background: "rgba(48,209,88,0.08)", border: "1px solid rgba(48,209,88,0.2)", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Banknote size={20} color={GREEN} />
          <div>
            <p style={{ margin: 0, fontSize: 12, color: GREEN }}>เตรียมเงินสด</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: GREEN }}>฿{fmt(cashTotal)}</p>
          </div>
        </div>
      )}

      {/* Active jobs */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>งานที่กำลังดำเนินการ</p>
          {activeJobs.length > 0 && (
            <span style={{ fontSize: 12, color: TEXT2 }}>{activeJobs.length} งาน</span>
          )}
        </div>
        {activeJobs.length === 0 ? (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 32, textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: TEXT2 }}>ไม่มีงานที่กำลังดำเนินการ</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeJobs.map(job => (
              <button
                key={job.id}
                onClick={() => router.push(`/rider/job/${job.id}`)}
                style={{ width: "100%", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", cursor: "pointer" }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ACCENT, boxShadow: `0 0 6px ${ACCENT}`, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: TEXT }}>{job.orderNumber}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: TEXT2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {job.customer.name} · {job.device.model}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: ACCENT, background: "rgba(74,222,128,0.12)", padding: "3px 8px", borderRadius: 6 }}>
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                  <ChevronRight size={14} color={TEXT2} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
