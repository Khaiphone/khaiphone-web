"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, RefreshCw, Calendar, Settings, Loader2 } from "lucide-react";
import { fetchMyRequests } from "@/app/actions/admin-requests";
import type { AdminRequest } from "@/lib/types/admin";
import type { AdminNotification, NotificationType } from "../../../lib/types/admin";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";

const STATUS_LABELS: Record<string, string> = {
  new:               "คำขอใหม่",
  pending:           "รอตรวจสอบ",
  contacted:         "เจ้าหน้าที่ติดต่อกลับแล้ว",
  inspecting:        "กำลังตรวจสอบ",
  confirmed:         "ยืนยันนัดหมาย",
  price_negotiation: "รอยืนยันราคา",
  completed:         "เสร็จสิ้น",
  cancelled:         "ยกเลิก",
  no_show:           "ลูกค้าไม่อยู่",
  rejected:          "ปฏิเสธ",
  awaiting_transfer: "รอโอนเงิน",
  pickup_scheduled:  "ไรเดอร์รับงานแล้ว",
};

const FILTER_TABS: Array<{ value: NotificationType | "all"; label: string }> = [
  { value: "all",           label: "ทั้งหมด"      },
  { value: "new_request",   label: "คำขอใหม่"     },
  { value: "status_change", label: "เปลี่ยนสถานะ" },
  { value: "appointment",   label: "นัดหมาย"      },
  { value: "system",        label: "ระบบ"         },
];

const TYPE_ICON: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  new_request:   { icon: Bell,      color: "#92400E", bg: "#FEF3C7" },
  status_change: { icon: RefreshCw, color: "#1E40AF", bg: "#DBEAFE" },
  appointment:   { icon: Calendar,  color: "#5B21B6", bg: "#EDE9FE" },
  system:        { icon: Settings,  color: "#666666", bg: "#F0F0F0" },
};

const LS_KEY = "khaiphone_admin_read_notifs";

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function saveReadIds(ids: Set<string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch {}
}

function buildNotifications(requests: AdminRequest[], readIds: Set<string>): AdminNotification[] {
  const today = new Date().toISOString().slice(0, 10);
  const items: AdminNotification[] = [];

  for (const r of requests) {
    // new_request — one per request
    items.push({
      id:        `nr-${r.id}`,
      type:      "new_request",
      title:     "คำขอใหม่",
      body:      `มีคำขอใหม่ ${r.orderNumber} จาก ${r.customer.name} — ${r.device.model}`,
      requestId: r.id,
      read:      readIds.has(`nr-${r.id}`),
      createdAt: r.createdAt,
    });

    // status_change — one per statusLog entry (skip "new" which is redundant with new_request)
    r.statusLog
      .filter(log => log.status !== "new")
      .forEach((log, i) => {
        const id = `sc-${r.id}-${i}`;
        items.push({
          id,
          type:      "status_change",
          title:     "เปลี่ยนสถานะ",
          body:      `${r.orderNumber} เปลี่ยนเป็น ${STATUS_LABELS[log.status] ?? log.status}`,
          requestId: r.id,
          read:      readIds.has(id),
          createdAt: log.timestamp,
        });
      });

    // appointment — requests scheduled for today
    if (r.appointment.date === today) {
      const id = `appt-${r.id}`;
      items.push({
        id,
        type:      "appointment",
        title:     "นัดหมายวันนี้",
        body:      `${r.customer.name} · ${r.appointment.time} น. — ${r.appointment.location || r.device.model}`,
        requestId: r.id,
        read:      readIds.has(id),
        createdAt: r.createdAt,
      });
    }
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "เมื่อกี้";
  if (mins < 60)  return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs} ชั่วโมงที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [tab,     setTab]     = useState<NotificationType | "all">("all");
  const [items,   setItems]   = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const readIds = loadReadIds();
    fetchMyRequests().then(requests => {
      setItems(buildNotifications(requests, readIds));
      setLoading(false);
    });
  }, []);

  const filtered = tab === "all" ? items : items.filter(n => n.type === tab);
  const unread   = items.filter(n => !n.read).length;

  function markRead(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const readIds = loadReadIds();
    readIds.add(id);
    saveReadIds(readIds);
  }

  function markAllRead() {
    const readIds = loadReadIds();
    items.forEach(n => readIds.add(n.id));
    saveReadIds(readIds);
    setItems(prev => prev.map(n => ({ ...n, read: true })));
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>

      {/* Sticky header */}
      <div style={{ position: "sticky", top: 0, background: CARD, zIndex: 10, borderBottom: `1px solid ${BORDER}`, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ padding: "12px 16px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <button
              onClick={() => router.back()}
              style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}
            >
              <ArrowLeft size={22} />
            </button>
            <h1 style={{ color: TEXT, fontSize: "18px", fontWeight: 700, margin: 0, flex: 1 }}>
              แจ้งเตือน {unread > 0 && <span style={{ color: "#EF4444", fontSize: "14px" }}>({unread})</span>}
            </h1>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                style={{ background: "none", border: "none", color: GOLD, fontSize: "12px", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "12px", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
            {FILTER_TABS.map(({ value, label }) => {
              const active = tab === value;
              return (
                <button
                  key={value}
                  onClick={() => setTab(value)}
                  style={{
                    flexShrink: 0, padding: "6px 12px", borderRadius: "999px", fontFamily: "inherit",
                    border: active ? "1px solid rgba(184,134,11,0.3)" : `1px solid ${BORDER}`,
                    cursor: "pointer", fontSize: "12px", fontWeight: active ? 700 : 400,
                    background: active ? "var(--admin-gold-bg)" : CARD,
                    color: active ? "var(--admin-gold-text)" : TEXT2,
                    touchAction: "manipulation", whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* List */}
      <div style={{ padding: "8px 16px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
            <Loader2 size={24} style={{ color: GOLD, animation: "spin 1s linear infinite" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: "60px" }}>
            <p style={{ color: TEXT3, fontSize: "15px" }}>ไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          filtered.map(n => {
            const cfg  = TYPE_ICON[n.type];
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  markRead(n.id);
                  if (n.requestId) router.push(`/admin/requests/${n.requestId}`);
                }}
                onKeyDown={e => e.key === "Enter" && markRead(n.id)}
                style={{
                  display: "flex", gap: "12px", padding: "14px", borderRadius: "14px",
                  marginBottom: "6px", cursor: "pointer", touchAction: "manipulation", position: "relative",
                  background: n.read ? CARD : "var(--admin-gold-bg)",
                  border: n.read ? `1px solid ${BORDER}` : "1px solid rgba(184,134,11,0.25)",
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: "12px", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={18} color={cfg.color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: n.read ? TEXT2 : TEXT, fontSize: "14px", fontWeight: n.read ? 400 : 600, margin: "0 0 3px", lineHeight: 1.4 }}>
                    {n.title}
                  </p>
                  <p style={{ color: TEXT2, fontSize: "12px", margin: "0 0 4px", lineHeight: 1.4 }}>{n.body}</p>
                  <p style={{ color: TEXT3, fontSize: "11px", margin: 0 }}>{fmtRelative(n.createdAt)}</p>
                </div>

                {!n.read && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", flexShrink: 0, marginTop: "4px" }} />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
