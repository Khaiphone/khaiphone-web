"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Users, Clock, Navigation, Search, CheckCircle2, XCircle, ClipboardList, Loader2 } from "lucide-react";
import { fetchRiderJobs } from "@/app/actions/admin-requests";
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

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "all",         label: "ทั้งหมด"         },
  { key: "unassigned",  label: "ยังไม่จ่ายงาน"   },
  { key: "waiting",     label: "รอรับงาน"         },
  { key: "in_progress", label: "กำลังดำเนินการ"   },
  { key: "completed",   label: "เสร็จสิ้น"        },
  { key: "cancelled",   label: "ยกเลิก"           },
];

const UNASSIGNED_STATUSES:  RequestStatus[] = ["confirmed"];
const IN_PROGRESS_STATUSES: RequestStatus[] = ["pickup_scheduled", "en_route", "inspecting", "price_negotiation", "contracting", "awaiting_transfer"];
const COMPLETED_STATUSES:   RequestStatus[] = ["completed"];
const CANCELLED_STATUSES:   RequestStatus[] = ["cancelled", "no_show", "rejected"];

function jobCategory(job: AdminRequest): FilterKey {
  if (COMPLETED_STATUSES.includes(job.status))  return "completed";
  if (CANCELLED_STATUSES.includes(job.status))  return "cancelled";
  if (IN_PROGRESS_STATUSES.includes(job.status)) return "in_progress";
  if (job.status === "confirmed" && !job.riderId) return "unassigned";
  if (job.status === "confirmed" &&  job.riderId) return "waiting";
  return "all";
}

function thDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function shiftDate(iso: string, delta: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

type RiderGroup = { riderId: string; riderName: string; jobs: AdminRequest[] };

export default function RiderJobsPage() {
  const router = useRouter();
  const today  = new Date().toISOString().slice(0, 10);

  const [date,    setDate]    = useState(today);
  const [jobs,    setJobs]    = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<FilterKey>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetchRiderJobs(date).then(data => { setJobs(data); setLoading(false); });
  }, [date]);

  const filtered = useMemo(() => {
    if (filter === "all") return jobs;
    return jobs.filter(j => jobCategory(j) === filter);
  }, [jobs, filter]);

  const stats = useMemo(() => ({
    total:       jobs.length,
    unassigned:  jobs.filter(j => jobCategory(j) === "unassigned").length,
    waiting:     jobs.filter(j => jobCategory(j) === "waiting").length,
    in_progress: jobs.filter(j => jobCategory(j) === "in_progress").length,
    completed:   jobs.filter(j => jobCategory(j) === "completed").length,
    cancelled:   jobs.filter(j => jobCategory(j) === "cancelled").length,
  }), [jobs]);

  // Group assigned jobs by rider
  const riderGroups = useMemo<RiderGroup[]>(() => {
    const map = new Map<string, RiderGroup>();
    for (const job of jobs) {
      if (!job.riderId) continue;
      if (!map.has(job.riderId)) {
        map.set(job.riderId, { riderId: job.riderId, riderName: job.riderName ?? "ไรเดอร์", jobs: [] });
      }
      map.get(job.riderId)!.jobs.push(job);
    }
    return [...map.values()].sort((a, b) => b.jobs.length - a.jobs.length);
  }, [jobs]);

  const unassignedJobs = useMemo(() => jobs.filter(j => !j.riderId), [jobs]);

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const statCards = [
    { key: "all"         as FilterKey, label: "ทั้งหมด",        value: stats.total,       color: TEXT,   bg: CARD,       icon: ClipboardList },
    { key: "unassigned"  as FilterKey, label: "ยังไม่จ่ายงาน",  value: stats.unassigned,  color: RED,    bg: "#FEF2F2",  icon: XCircle       },
    { key: "waiting"     as FilterKey, label: "รอรับงาน",        value: stats.waiting,     color: ORANGE, bg: "#FFFBEB",  icon: Clock         },
    { key: "in_progress" as FilterKey, label: "กำลังดำเนินการ",  value: stats.in_progress, color: BLUE,   bg: "#EFF6FF",  icon: Navigation    },
    { key: "completed"   as FilterKey, label: "เสร็จสิ้น",       value: stats.completed,   color: GREEN,  bg: "#F0FDF4",  icon: CheckCircle2  },
    { key: "cancelled"   as FilterKey, label: "ยกเลิก",          value: stats.cancelled,   color: "#9CA3AF", bg: "#F9FAFB", icon: XCircle    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: CARD, borderBottom: `1px solid ${BORDER}`, zIndex: 10, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
            <ArrowLeft size={22} />
          </button>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT, flex: 1 }}>รายงานงานไรเดอร์</h1>
        </div>

        {/* Date nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <button onClick={() => setDate(d => shiftDate(d, -1))} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", display: "flex", color: TEXT2 }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEXT, minWidth: 160, textAlign: "center" }}>
            {thDate(date + "T00:00:00")}
            {date === today && <span style={{ marginLeft: 6, fontSize: 11, color: GOLD, fontWeight: 700 }}>(วันนี้)</span>}
          </span>
          <button onClick={() => setDate(d => shiftDate(d, 1))} disabled={date >= today} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 10px", cursor: date >= today ? "default" : "pointer", display: "flex", color: date >= today ? BORDER : TEXT2, opacity: date >= today ? 0.4 : 1 }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader2 size={28} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Stat cards */}
          <div style={{ padding: "12px 16px 8px", display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
            {statCards.map(({ key, label, value, color, bg, icon: Icon }) => {
              const active = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "10px 14px", borderRadius: 12, border: active ? `2px solid ${color}` : `1px solid ${BORDER}`, background: active ? bg : CARD, cursor: "pointer", fontFamily: "inherit", minWidth: 90 }}
                >
                  <Icon size={18} color={color} />
                  <span style={{ fontSize: 20, fontWeight: 800, color: active ? color : TEXT, lineHeight: 1 }}>{value}</span>
                  <span style={{ fontSize: 10, color: active ? color : TEXT2, fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Per-rider breakdown */}
          {filter === "all" && (
            <div style={{ padding: "0 16px 12px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: TEXT2, letterSpacing: 0.5, textTransform: "uppercase" }}>ไรเดอร์วันนี้ ({riderGroups.length} คน)</p>

              {/* Unassigned group */}
              {unassignedJobs.length > 0 && (
                <div style={{ marginBottom: 6, border: `1px solid ${RED}30`, borderRadius: 12, overflow: "hidden" }}>
                  <button
                    onClick={() => toggleExpand("_unassigned")}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#FEF2F2", border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <XCircle size={16} color="#fff" />
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: RED }}>ยังไม่จ่ายงาน</p>
                      <p style={{ margin: 0, fontSize: 11, color: RED }}>{unassignedJobs.length} งาน รอมอบหมาย</p>
                    </div>
                    {expanded.has("_unassigned") ? <ChevronUp size={16} color={TEXT2} /> : <ChevronDown size={16} color={TEXT2} />}
                  </button>
                  {expanded.has("_unassigned") && unassignedJobs.map(job => (
                    <JobRow key={job.id} job={job} onClick={() => router.push(`/admin/requests/${job.id}`)} />
                  ))}
                </div>
              )}

              {/* Per-rider groups */}
              {riderGroups.map(group => {
                const done     = group.jobs.filter(j => jobCategory(j) === "completed").length;
                const active   = group.jobs.filter(j => jobCategory(j) === "in_progress" || jobCategory(j) === "waiting").length;
                const cancelled = group.jobs.filter(j => jobCategory(j) === "cancelled").length;
                const isOpen   = expanded.has(group.riderId);
                return (
                  <div key={group.riderId} style={{ marginBottom: 6, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                    <button
                      onClick={() => toggleExpand(group.riderId)}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: CARD, border: "none", cursor: "pointer", fontFamily: "inherit" }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: PURPLE + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: PURPLE }}>
                        {group.riderName.slice(0, 1)}
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT }}>{group.riderName}</p>
                        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                          <span style={{ fontSize: 11, color: GREEN }}>✅ {done}</span>
                          <span style={{ fontSize: 11, color: BLUE }}>🏃 {active}</span>
                          {cancelled > 0 && <span style={{ fontSize: 11, color: TEXT3 }}>✗ {cancelled}</span>}
                          <span style={{ fontSize: 11, color: TEXT2 }}>/ {group.jobs.length} งาน</span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={16} color={TEXT2} /> : <ChevronDown size={16} color={TEXT2} />}
                    </button>
                    {isOpen && group.jobs.map(job => (
                      <JobRow key={job.id} job={job} onClick={() => router.push(`/admin/requests/${job.id}`)} />
                    ))}
                  </div>
                );
              })}

              {riderGroups.length === 0 && unassignedJobs.length === 0 && (
                <div style={{ textAlign: "center", padding: "20px 0", color: TEXT3, fontSize: 13 }}>ไม่มีงานวันนี้</div>
              )}
            </div>
          )}

          {/* Job list */}
          <div style={{ padding: "0 16px 24px" }}>
            {filter !== "all" && (
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: TEXT2, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {FILTERS.find(f => f.key === filter)?.label} ({filtered.length} งาน)
              </p>
            )}
            {filter === "all" && jobs.length > 0 && (
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: TEXT2, letterSpacing: 0.5, textTransform: "uppercase" }}>รายการทั้งหมด ({jobs.length} งาน)</p>
            )}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: TEXT3, fontSize: 14 }}>ไม่มีข้อมูล</div>
            ) : filtered.map(job => (
              <JobRow key={job.id} job={job} onClick={() => router.push(`/admin/requests/${job.id}`)} showRider />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobRow({ job, onClick, showRider }: { job: AdminRequest; onClick: () => void; showRider?: boolean }) {
  const price = job.device.actualPrice ?? job.device.estimatedPrice;
  return (
    <div
      onClick={onClick}
      style={{ padding: "10px 14px", borderTop: `1px solid ${BORDER}`, cursor: "pointer", background: "var(--admin-card)", display: "flex", gap: 10, alignItems: "flex-start" }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-text)" }}>{job.orderNumber}</span>
          <StatusBadge status={job.status} size="xs" />
        </div>
        <p style={{ margin: "0 0 2px", fontSize: 13, color: "var(--admin-text)", fontWeight: 600 }}>{job.device.model}</p>
        <p style={{ margin: "0 0 2px", fontSize: 12, color: "var(--admin-text2)" }}>{job.customer.name} · {job.appointment.time ? `${job.appointment.time} น.` : "ไม่ระบุเวลา"}</p>
        {showRider && job.riderName && (
          <p style={{ margin: 0, fontSize: 11, color: "var(--admin-text3)" }}>ไรเดอร์: {job.riderName}</p>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--admin-text)" }}>฿{price.toLocaleString("th-TH")}</p>
        <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--admin-text3)" }}>{job.appointment.date}</p>
      </div>
    </div>
  );
}
