"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ChevronRight, Banknote, ArrowUpDown, Package, Wifi, WifiOff, CheckCircle2, Navigation } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchPendingRiderJobs,
  fetchRiderJobs,
  fetchRiderStats,
  riderAcceptJob,
  setRiderOnlineStatus,
  fetchRiderOnlineStatus,
} from "@/app/actions/rider";
import type { AdminRequest } from "@/lib/types/admin";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const CARD2  = "#222224";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const GREEN  = "#30D158";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

const STATUS_LABEL: Record<string, string> = {
  en_route:          "กำลังเดินทาง",
  inspecting:        "กำลังตรวจเครื่อง",
  price_negotiation: "รอยืนยันราคา",
  contracting:       "กำลังทำสัญญา",
};

function fmt(n: number) { return n.toLocaleString("th-TH"); }

export default function RiderHomePage() {
  const router = useRouter();
  const [userId, setUserId]           = useState<string>("");
  const [isOnline, setIsOnline]       = useState(false);
  const [toggling, setToggling]       = useState(false);
  const [pendingJobs, setPendingJobs] = useState<AdminRequest[]>([]);
  const [activeJobs, setActiveJobs]   = useState<AdminRequest[]>([]);
  const [stats, setStats]             = useState({ completedJobs: 0, totalEarnings: 0 });
  const [accepting, setAccepting]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);

  const loadData = useCallback(async (uid: string) => {
    const [pending, active, s, online] = await Promise.all([
      fetchPendingRiderJobs(uid),
      fetchRiderJobs(uid),
      fetchRiderStats(uid),
      fetchRiderOnlineStatus(uid),
    ]);
    setPendingJobs(pending);
    setActiveJobs(active);
    setStats(s);
    setIsOnline(online);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      await loadData(session.user.id);
    });
  }, [loadData]);

  async function toggleOnline() {
    setToggling(true);
    const next = !isOnline;
    setIsOnline(next);
    await setRiderOnlineStatus(next);
    window.dispatchEvent(new CustomEvent("rider-online-change", { detail: next }));
    setToggling(false);
  }

  async function acceptJob(jobId: string) {
    setAccepting(jobId);
    const res = await riderAcceptJob(jobId);
    if (res.success) {
      // Move from pending to active
      const job = pendingJobs.find(j => j.id === jobId);
      if (job) {
        setPendingJobs(prev => prev.filter(j => j.id !== jobId));
        setActiveJobs(prev => [{ ...job, status: "en_route" }, ...prev]);
      }
    }
    setAccepting(null);
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
                  {/* Route */}
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

                  {/* Navigate button */}
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

                  {/* Device */}
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

                  {/* Accept button */}
                  <button
                    onClick={() => acceptJob(job.id)}
                    disabled={isAccepting}
                    style={{
                      width: "100%", padding: "14px 0", borderRadius: 12,
                      background: isAccepting ? "rgba(74,222,128,0.4)" : ACCENT,
                      border: "none", cursor: "pointer", fontFamily: "inherit",
                      fontSize: 15, fontWeight: 700, color: "#000",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {isAccepting
                      ? <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#000", animation: "spin 0.8s linear infinite" }} />
                      : <CheckCircle2 size={18} />
                    }
                    {isAccepting ? "กำลังรับงาน..." : "รับงานนี้"}
                  </button>
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
          { label: "รายได้เดือนนี้", value: `฿${fmt(stats.totalEarnings)}`,        sub: ""    },
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
