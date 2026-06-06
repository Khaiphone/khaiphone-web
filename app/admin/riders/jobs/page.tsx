"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Clock, CheckCircle2, ClipboardList, Loader2,
  AlertTriangle, Package, Truck, PackageCheck, RotateCcw,
} from "lucide-react";
import { fetchRiderJobs, adminConfirmReturn } from "@/app/actions/admin-requests";
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

type RiderRow = {
  riderId: string; riderName: string;
  total: number; completed: number; inProgress: number; cancelled: number; waiting: number;
  pendingReturn: number;
};

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ["#8B5CF6","#3B82F6","#10B981","#F59E0B","#EF4444","#06B6D4","#EC4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "25", border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color }}>
      {name.slice(0, 1)}
    </div>
  );
}

export default function RiderJobsPage() {
  const router = useRouter();
  const today  = new Date().toISOString().slice(0, 10);

  const [date,        setDate]       = useState(today);
  const [jobs,        setJobs]       = useState<AdminRequest[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [filter,      setFilter]     = useState<FilterKey>("all");
  const [expanded,    setExpanded]   = useState(true);
  const [confirmBusy, setConfirmBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchRiderJobs(date).then(d => { setJobs(d); setLoading(false); });
  }, [date]);

  const stats = useMemo(() => {
    const completed  = jobs.filter(j => jobCategory(j) === "completed");
    const cancelled  = jobs.filter(j => jobCategory(j) === "cancelled");
    const inProgress = jobs.filter(j => jobCategory(j) === "in_progress");
    const waiting    = jobs.filter(j => jobCategory(j) === "waiting");
    const unassigned = jobs.filter(j => jobCategory(j) === "unassigned");
    // Device custody tracking
    const withRider      = inProgress;
    const pendingSubmit  = completed.filter(j => !j.returnSubmittedAt);
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

  const unassignedJobs = useMemo(() => jobs.filter(j => !j.riderId), [jobs]);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter(j => jobCategory(j) === filter);
  }, [jobs, filter]);

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
            {/* Date nav */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button onClick={() => setDate(d => shiftDate(d, -1))} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: "pointer", display: "flex", color: TEXT2 }}><ChevronLeft size={15} /></button>
              <span style={{ fontSize: 13, fontWeight: 600, color: TEXT, whiteSpace: "nowrap" }}>
                {date === today ? <><span style={{ color: GOLD }}>วันนี้</span></> : new Date(date + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
              </span>
              <button onClick={() => setDate(d => shiftDate(d, 1))} disabled={date >= today} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "5px 8px", cursor: date >= today ? "default" : "pointer", display: "flex", color: date >= today ? BORDER : TEXT2, opacity: date >= today ? 0.4 : 1 }}><ChevronRight size={15} /></button>
            </div>
          </div>
          <p style={{ margin: "0 0 10px", fontSize: 12, color: TEXT3 }}>{thDate(date + "T00:00:00")}</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
          <Loader2 size={28} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Device custody tracking ── */}
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

          {/* ── Status cards ── */}
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

          {/* ── Unassigned alert ── */}
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

          {/* ── Rider performance table ── */}
          {riderRows.length > 0 && (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, overflow: "hidden" }}>
              <button
                onClick={() => setExpanded(e => !e)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", borderBottom: expanded ? `1px solid ${BORDER}` : "none" }}
              >
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT, flex: 1, textAlign: "left" }}>ประสิทธิภาพไรเดอร์ ({riderRows.length} คน)</p>
                {expanded ? <ChevronUp size={16} color={TEXT2} /> : <ChevronDown size={16} color={TEXT2} />}
              </button>

              {expanded && (
                <>
                  {/* Table header */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 44px 44px 44px 44px 60px", gap: 0, padding: "8px 16px", borderBottom: `1px solid ${BORDER}`, background: BG }}>
                    {["ไรเดอร์", "รับ", "เสร็จ", "กำลัง", "ยกเลิก", "รอคืน"].map((h, i) => (
                      <span key={h} style={{ fontSize: 10, fontWeight: 700, color: TEXT3, textAlign: i > 0 ? "center" : "left", textTransform: "uppercase", letterSpacing: 0.3 }}>{h}</span>
                    ))}
                  </div>

                  {riderRows.map((r, i) => {
                    const successPct = r.total > 0 ? Math.round((r.completed / r.total) * 100) : 0;
                    return (
                      <div key={r.riderId} style={{ display: "grid", gridTemplateColumns: "1fr 44px 44px 44px 44px 60px", gap: 0, padding: "12px 16px", borderBottom: i < riderRows.length - 1 ? `1px solid ${BORDER}` : "none", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar name={r.riderName} size={30} />
                          <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: TEXT }}>{r.riderName}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                              <div style={{ width: 48, height: 4, borderRadius: 2, background: BORDER, overflow: "hidden" }}>
                                <div style={{ width: `${successPct}%`, height: "100%", background: successPct >= 80 ? GREEN : successPct >= 50 ? ORANGE : RED, borderRadius: 2 }} />
                              </div>
                              <span style={{ fontSize: 10, color: TEXT3 }}>{successPct}%</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: TEXT, textAlign: "center" }}>{r.total}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: GREEN, textAlign: "center" }}>{r.completed}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: BLUE, textAlign: "center" }}>{r.inProgress + r.waiting}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: r.cancelled > 0 ? RED : TEXT3, textAlign: "center" }}>{r.cancelled}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: r.pendingReturn > 0 ? ORANGE : TEXT3, textAlign: "center" }}>{r.pendingReturn}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── Job list ── */}
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
              const price = job.device.actualPrice ?? job.device.estimatedPrice;
              const cat   = jobCategory(job);
              const catColor = cat === "completed" ? GREEN : cat === "cancelled" ? TEXT3 : cat === "unassigned" ? RED : cat === "waiting" ? ORANGE : BLUE;
              return (
                <div
                  key={job.id}
                  style={{ padding: "12px 16px", borderBottom: i < filtered.length - 1 ? `1px solid ${BORDER}` : "none" }}
                >
                  <div
                    onClick={() => router.push(`/admin/requests/${job.id}`)}
                    style={{ cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}
                  >
                    {/* Left accent */}
                    <div style={{ width: 3, borderRadius: 2, background: catColor, alignSelf: "stretch", flexShrink: 0, minHeight: 40 }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT2 }}>{job.orderNumber}</span>
                        <StatusBadge status={job.status} size="xs" />
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
                      <p style={{ margin: 0, fontSize: 12, color: TEXT2 }}>{job.customer.name}{job.riderName ? <span style={{ color: TEXT3 }}> · ไรเดอร์: {job.riderName}</span> : <span style={{ color: RED, fontWeight: 600 }}> · ยังไม่จ่ายงาน</span>}</p>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: cat === "completed" ? GREEN : TEXT }}>฿{fmt(price)}</p>
                      {job.device.actualPrice && job.device.actualPrice !== job.device.estimatedPrice && (
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: TEXT3, textDecoration: "line-through" }}>฿{fmt(job.device.estimatedPrice)}</p>
                      )}
                    </div>
                  </div>

                  {/* Confirm return button */}
                  {cat === "completed" && job.returnSubmittedAt && !job.returnedToOfficeAt && (
                    <div style={{ marginTop: 10, marginLeft: 15 }}>
                      <button
                        disabled={confirmBusy === job.id}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setConfirmBusy(job.id);
                          const res = await adminConfirmReturn(job.id);
                          if (res.success) {
                            fetchRiderJobs(date).then(d => setJobs(d));
                          } else {
                            alert(res.error);
                          }
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
