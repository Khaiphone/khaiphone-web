"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Clock, Loader2 } from "lucide-react";
import { fetchActiveDashboardData } from "@/app/actions/admin-requests";
import type { AdminRequest } from "@/lib/types/admin";
import { useAdminRole } from "@/app/admin/role-context";
import { cacheGet, cacheSet } from "@/app/admin/cache";
import StatusBadge from "../../components/admin/StatusBadge";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const GOLD   = "var(--admin-gold)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtWeekday(d: Date) {
  return d.toLocaleDateString("th-TH", { weekday: "short" });
}

function fmtMonth(d: Date) {
  return d.toLocaleDateString("th-TH", { month: "short" });
}

export default function AppointmentsPage() {
  const router  = useRouter();
  const { userId } = useAdminRole();
  const baseDay = new Date();
  baseDay.setHours(0, 0, 0, 0);

  const days     = Array.from({ length: 60 }, (_, i) => addDays(baseDay, i - 7));
  const todayStr = toISODate(baseDay);

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const stripRef   = useRef<HTMLDivElement>(null);
  const todayRef   = useRef<HTMLButtonElement>(null);
  const [requests,     setRequests]     = useState<AdminRequest[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!userId) return;
    const cached = cacheGet<AdminRequest[]>("admin:requests");
    if (cached) { setRequests(cached); setLoading(false); }
    fetchActiveDashboardData().then(data => {
      setRequests(data.requests);
      cacheSet("admin:requests", data.requests);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    if (todayRef.current && stripRef.current) {
      const strip = stripRef.current;
      const btn   = todayRef.current;
      strip.scrollLeft = btn.offsetLeft - strip.clientWidth / 2 + btn.offsetWidth / 2;
    }
  }, []);

  const appts = requests
    .filter(r => r.appointment.date === selectedDate)
    .sort((a, b) => a.appointment.time.localeCompare(b.appointment.time));

  return (
    <div style={{ minHeight: "100vh", background: BG, overflowX: "hidden", maxWidth: "100vw" }}>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, borderBottom: `1px solid ${BORDER}`, overflowX: "hidden", paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <button
              onClick={() => router.back()}
              style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}
            >
              <ArrowLeft size={22} />
            </button>
            <h1 style={{ color: TEXT, fontSize: "18px", fontWeight: 700, margin: 0, flex: 1 }}>นัดหมาย</h1>
          </div>

          {/* Date tabs */}
          <div ref={stripRef} style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch", marginLeft: "-2px", paddingLeft: "2px", marginRight: "-2px", paddingRight: "2px" } as React.CSSProperties}>
            {days.map(d => {
              const iso    = toISODate(d);
              const active = iso === selectedDate;
              const isToday = iso === todayStr;
              const count  = requests.filter(r => r.appointment.date === iso).length;
              return (
                <button
                  key={iso}
                  ref={isToday ? todayRef : undefined}
                  onClick={() => setSelectedDate(iso)}
                  style={{
                    flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
                    padding: "8px 10px", borderRadius: "12px", minWidth: "50px", fontFamily: "inherit",
                    border: active ? "1px solid rgba(184,134,11,0.3)" : `1px solid ${BORDER}`,
                    cursor: "pointer", touchAction: "manipulation",
                    background: active ? "#FEF3C7" : CARD,
                  }}
                >
                  <span style={{ fontSize: "10px", fontWeight: 500, color: active ? "#92400E" : TEXT3 }}>{fmtWeekday(d)}</span>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: active ? "#92400E" : isToday ? GOLD : TEXT }}>{d.getDate()}</span>
                  <span style={{ fontSize: "10px", color: active ? "#B45309" : TEXT3 }}>{fmtMonth(d)}</span>
                  {count > 0 && (
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#B45309" : GOLD, marginTop: "2px" }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Date heading */}
      <div style={{ padding: "14px 16px 8px" }}>
        <p style={{ color: TEXT2, fontSize: "13px", margin: 0 }}>
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Timeline */}
      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
          </div>
        ) : appts.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ color: TEXT3, fontSize: "15px" }}>ไม่มีนัดหมายในวันนี้</p>
          </div>
        ) : (
          appts.map((r, i) => (
            <div key={r.id} style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 50, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={11} color={TEXT3} />
                  <span style={{ color: TEXT2, fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {r.appointment.time}
                  </span>
                </div>
                {i < appts.length - 1 && (
                  <div style={{ width: 1, flex: 1, background: BORDER, marginTop: "6px" }} />
                )}
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/admin/requests/${r.id}`)}
                onKeyDown={e => e.key === "Enter" && router.push(`/admin/requests/${r.id}`)}
                style={{ flex: 1, background: CARD, borderRadius: "14px", padding: "12px 14px", border: `1px solid ${BORDER}`, cursor: "pointer", touchAction: "manipulation" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ color: GOLD, fontSize: "12px", fontWeight: 700 }}>{r.orderNumber}</span>
                    {r.appointment.method === "parcel" && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#1E40AF", background: "#DBEAFE", padding: "1px 6px", borderRadius: 5, whiteSpace: "nowrap" }}>📦 พัสดุ</span>
                    )}
                    {r.appointment.method === "rider" && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#5B21B6", background: "#EDE9FE", padding: "1px 6px", borderRadius: 5, whiteSpace: "nowrap" }}>🛵 รับถึงที่</span>
                    )}
                  </div>
                  <StatusBadge status={r.status} size="xs" />
                </div>
                <p style={{ color: TEXT, fontWeight: 600, fontSize: "14px", margin: "0 0 2px" }}>{r.customer.name}</p>
                <p style={{ color: TEXT2, fontSize: "12px", margin: 0 }}>{r.device.model} · {r.device.storage}</p>
                <p style={{ color: TEXT3, fontSize: "11px", margin: "4px 0 0" }}>{r.appointment.location}</p>
                {r.assignedToName && (
                  <p style={{ color: TEXT3, fontSize: "11px", margin: "2px 0 0" }}>👤 {r.assignedToName}</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push("/admin/requests")}
        style={{ position: "fixed", bottom: "calc(env(safe-area-inset-bottom) + 76px)", right: "16px", width: 52, height: 52, borderRadius: "50%", background: GOLD, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", touchAction: "manipulation", boxShadow: "0 2px 12px rgba(184,134,11,0.35)", zIndex: 20 }}
      >
        <Plus size={22} color="#fff" />
      </button>
    </div>
  );
}
