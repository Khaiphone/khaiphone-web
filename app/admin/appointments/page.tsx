"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Clock, Loader2, Ban, ChevronDown } from "lucide-react";
import { fetchActiveDashboardData } from "@/app/actions/admin-requests";
import { fetchDayBlocks, setSlotBlock } from "@/app/actions/booking-slots";
import type { AdminRequest } from "@/lib/types/admin";
import { useAdminRole } from "@/app/admin/role-context";
import { cacheGet, cacheSet } from "@/app/admin/cache";
import StatusBadge from "../../components/admin/StatusBadge";

// ช่วงเวลารับถึงที่ทั้งหมด (09:00–23:00 ทุก 30 นาที) — ตรงกับหน้าจองลูกค้า
const ALL_SLOTS: string[] = (() => {
  const s: string[] = [];
  for (let h = 9; h <= 23; h++) { s.push(`${String(h).padStart(2, "0")}:00`); if (h < 23) s.push(`${String(h).padStart(2, "0")}:30`); }
  return s;
})();
const NOT_COUNTED_STATUS = new Set(["cancelled", "rejected", "no_show", "out_of_area", "unreachable", "merged"]);

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
  const [blocks,       setBlocks]       = useState<{ wholeDay: boolean; times: string[] }>({ wholeDay: false, times: [] });
  const [blocksOpen,   setBlocksOpen]   = useState(false);
  const [savingBlock,  setSavingBlock]  = useState(false);

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

  // โหลดสถานะการปิดเวลาของวันที่เลือก
  useEffect(() => {
    fetchDayBlocks(selectedDate).then(setBlocks).catch(() => {});
  }, [selectedDate]);

  // จำนวนคิว "รับถึงที่" ที่ยัง active ของแต่ละช่วงเวลา (วันที่เลือก)
  const riderCount = (t: string) =>
    requests.filter(r =>
      r.appointment.date === selectedDate &&
      r.appointment.method === "rider" &&
      r.appointment.time === t &&
      !NOT_COUNTED_STATUS.has(r.status)
    ).length;

  async function toggleWholeDay() {
    setSavingBlock(true);
    const next = !blocks.wholeDay;
    const res = await setSlotBlock(selectedDate, null, next);
    if (res.success) setBlocks(await fetchDayBlocks(selectedDate));
    else alert(res.error);
    setSavingBlock(false);
  }

  async function toggleSlot(t: string) {
    setSavingBlock(true);
    const next = !blocks.times.includes(t);
    const res = await setSlotBlock(selectedDate, t, next);
    if (res.success) setBlocks(await fetchDayBlocks(selectedDate));
    else alert(res.error);
    setSavingBlock(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, overflowX: "hidden", maxWidth: "100vw" }}>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, borderBottom: `1px solid ${BORDER}`, overflowX: "hidden", paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "12px 16px 0", maxWidth: 760, margin: "0 auto" }}>
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

      {/* เนื้อหา — จำกัดความกว้างไม่ให้ยืดเต็มจอ desktop */}
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* Date heading */}
      <div style={{ padding: "14px 16px 8px" }}>
        <p style={{ color: TEXT2, fontSize: "13px", margin: 0 }}>
          {new Date(selectedDate + "T00:00:00").toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* จัดการเวลารับถึงที่ (เปิด/ปิดชั่วคราว) */}
      <div style={{ padding: "0 16px 8px" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
            <Ban size={15} color={blocks.wholeDay ? "#EF4444" : GOLD} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>คิวรับถึงที่ — เปิด/ปิดเวลา</p>
              <p style={{ margin: "1px 0 0", fontSize: 11, color: TEXT3 }}>
                {blocks.wholeDay ? "วันนี้งดรับถึงที่ทั้งวัน" : blocks.times.length > 0 ? `ปิดอยู่ ${blocks.times.length} ช่วง` : "เปิดรับปกติ"}
              </p>
            </div>
            <button
              onClick={toggleWholeDay} disabled={savingBlock}
              style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, fontFamily: "inherit", padding: "7px 12px", borderRadius: 9, cursor: savingBlock ? "wait" : "pointer",
                border: `1px solid ${blocks.wholeDay ? "#EF4444" : BORDER}`,
                background: blocks.wholeDay ? "#FEF2F2" : CARD, color: blocks.wholeDay ? "#EF4444" : TEXT2 }}
            >
              {blocks.wholeDay ? "เปิดรับทั้งวัน" : "ปิดรับทั้งวัน"}
            </button>
          </div>

          {!blocks.wholeDay && (
            <>
              <button
                onClick={() => setBlocksOpen(o => !o)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px", borderTop: `1px solid ${BORDER}`, background: "none", border: "none", borderBottomLeftRadius: 14, borderBottomRightRadius: 14, cursor: "pointer", color: GOLD, fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}
              >
                จัดการรายช่วงเวลา
                <ChevronDown size={14} style={{ transform: blocksOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
              {blocksOpen && (
                <div style={{ padding: "4px 14px 14px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {ALL_SLOTS.map(t => {
                    const off = blocks.times.includes(t);
                    const c = riderCount(t);
                    return (
                      <button
                        key={t} onClick={() => toggleSlot(t)} disabled={savingBlock}
                        title={off ? "ปิดอยู่ — กดเพื่อเปิด" : "เปิดอยู่ — กดเพื่อปิด"}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 9px", borderRadius: 9, cursor: savingBlock ? "wait" : "pointer", fontFamily: "inherit",
                          border: `1px solid ${off ? "#FECACA" : BORDER}`,
                          background: off ? "#FEF2F2" : CARD,
                          color: off ? "#EF4444" : TEXT,
                          textDecoration: off ? "line-through" : "none" }}
                      >
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>{t}</span>
                        {c > 0 && <span style={{ fontSize: 9.5, color: off ? "#EF4444" : TEXT3 }}>{c} คิว</span>}
                      </button>
                    );
                  })}
                  <p style={{ width: "100%", margin: "6px 0 0", fontSize: 11, color: TEXT3 }}>กดช่วงเวลาเพื่อปิด (ลูกค้าจะจองช่วงนั้นไม่ได้) · กดซ้ำเพื่อเปิดคืน · มีผลเฉพาะ &ldquo;รับถึงที่&rdquo;</p>
                </div>
              )}
            </>
          )}
        </div>
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

      </div>{/* /เนื้อหา */}

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
