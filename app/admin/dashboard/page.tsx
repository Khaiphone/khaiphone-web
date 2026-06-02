"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ArrowRight, Phone, CalendarPlus, ClipboardList, Tag, SlidersHorizontal, PlusCircle, Moon, Sun } from "lucide-react";
import { fetchDashboardData, fetchRequests, fetchRecentActivity } from "@/app/actions/admin-requests";
import { saveSubscription, sendTestPush } from "@/app/actions/push";
import { supabase } from "@/lib/supabase";
import { useAdminTheme } from "@/lib/admin-theme";
import type { AdminRequest } from "@/lib/types/admin";
import type { AdminRole } from "@/app/actions/admin-users";
import type { Permission } from "@/lib/admin-permissions";
import RequestCard from "../../components/admin/RequestCard";

const GOLD   = "var(--admin-gold)";
const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const router = useRouter();
  return (
    <div
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onClick={() => href && router.push(href)}
      style={{ background: CARD, borderRadius: "16px", padding: "16px", border: `1px solid ${BORDER}`, cursor: href ? "pointer" : "default", touchAction: "manipulation" }}
    >
      <p style={{ color: TEXT2, fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 10px" }}>{label}</p>
      <p style={{ color, fontSize: "36px", fontWeight: 700, margin: 0, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [requests,    setRequests]    = useState<AdminRequest[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [role,        setRole]        = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [unreadCount,  setUnreadCount]  = useState(0);
  const [activity,     setActivity]     = useState<Awaited<ReturnType<typeof fetchRecentActivity>>>([]);
  const [notifStatus,  setNotifStatus]  = useState<"default" | "granted" | "denied" | "unsupported" | "loading">("loading");
  const staffUserIdRef  = useRef<string | undefined>(undefined);
  const lastRefetchRef  = useRef(0);
  const { dark, toggle } = useAdminTheme();

  useEffect(() => {
    // getSession() reads from localStorage — no network call
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      const data = await fetchDashboardData(session.user.id);
      setRole(data.role);
      setPermissions(data.permissions);
      staffUserIdRef.current = data.staffUserId;
      setRequests(data.requests);
      setLoading(false);
      fetchRecentActivity().then(setActivity);
    });
  }, []);

  useEffect(() => {
    const refetch = () => {
      const now = Date.now();
      if (now - lastRefetchRef.current < 30_000) return;
      lastRefetchRef.current = now;
      fetchRequests(staffUserIdRef.current).then(d => setRequests(d));
    };
    window.addEventListener("focus", refetch);
    return () => window.removeEventListener("focus", refetch);
  }, []);

  useEffect(() => {
    if (!requests.length) return;
    try {
      const readIds = new Set<string>(JSON.parse(localStorage.getItem("khaiphone_admin_read_notifs") ?? "[]"));
      const t = new Date().toISOString().slice(0, 10);
      let count = 0;
      for (const r of requests) {
        if (!readIds.has(`nr-${r.id}`)) count++;
        r.statusLog.filter(l => l.status !== "new").forEach((_, i) => {
          if (!readIds.has(`sc-${r.id}-${i}`)) count++;
        });
        if (r.appointment.date === t && !readIds.has(`appt-${r.id}`)) count++;
      }
      setUnreadCount(Math.min(count, 99));
    } catch {}
  }, [requests]);

  const today          = new Date().toISOString().slice(0, 10);
  const newCount       = requests.filter(r => r.status === "new").length;
  const pendingCount   = requests.filter(r => r.status === "pending").length;
  const todayAppt      = requests.filter(r => r.appointment.date === today).length;
  const completedToday = requests.filter(r =>
    r.statusLog.some(l => l.status === "completed" && l.timestamp.startsWith(today))
  ).length;

  const getLastActivity = (r: AdminRequest) => r.statusLog.at(-1)?.timestamp ?? r.createdAt;
  const recent = [...requests]
    .sort((a, b) => getLastActivity(b).localeCompare(getLastActivity(a)))
    .slice(0, 5);

  useEffect(() => {
    if (!("PushManager" in window) || !("Notification" in window)) {
      setNotifStatus("unsupported");
      return;
    }
    setNotifStatus(Notification.permission as "default" | "granted" | "denied");
  }, []);

  async function enableNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission as "default" | "granted" | "denied");
    if (permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const existing = await reg.pushManager.getSubscription();
      if (existing) return;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const key = Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const json = sub.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await saveSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      }
    } catch (e) { console.error("push setup error:", e); }
  }

  const canManagePrices = role === "owner" || permissions.includes("manage_prices");

  const quickActions = [
    { label: role === "staff" ? "งานของฉัน" : "คำขอทั้งหมด", icon: ClipboardList, href: "/admin/requests",     color: "#3B82F6" },
    { label: "นัดหมาย",     icon: CalendarPlus,  href: "/admin/appointments", color: "#8B5CF6" },
    ...(canManagePrices ? [
      { label: "จัดการราคา",    icon: Tag,               href: "/admin/prices",      color: "#10B981" },
      { label: "ตั้งค่าคำนวณ", icon: SlidersHorizontal, href: "/admin/deductions",  color: "#8B5CF6" },
    ] : []),
    { label: "โทรล่าสุด",   icon: Phone,         href: "tel:0955535167",      color: GOLD      },
  ];

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      <div style={{ padding: "52px 16px 0", paddingTop: "max(52px, calc(env(safe-area-inset-top) + 16px))" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <p style={{ color: TEXT2, fontSize: "12px", margin: "0 0 4px" }}>
              {new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 style={{ color: TEXT, fontSize: "26px", fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
              {role === "staff" ? "งานของฉัน" : "หน้าหลัก"}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => router.push("/admin/requests/new")}
              style={{ display: "flex", alignItems: "center", gap: 5, background: GOLD, border: "none", borderRadius: "12px", padding: "9px 13px", cursor: "pointer", color: "#fff", fontSize: "13px", fontWeight: 600, fontFamily: "inherit", touchAction: "manipulation", whiteSpace: "nowrap" }}
            >
              <PlusCircle size={16} /> สร้างคิว
            </button>
            <button
              onClick={toggle}
              style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "9px 11px", cursor: "pointer", display: "flex", color: TEXT2, touchAction: "manipulation" }}
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            {role === "owner" && notifStatus === "granted" && (
              <button
                onClick={async () => {
                  // Ensure subscription exists on this device first
                  if ("serviceWorker" in navigator && "PushManager" in window) {
                    try {
                      const reg = await navigator.serviceWorker.register("/sw.js");
                      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                      if (vapidKey) {
                        const b64 = vapidKey.replace(/-/g, "+").replace(/_/g, "/");
                        const padded = b64 + "=".repeat((4 - b64.length % 4) % 4);
                        const key = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
                        let existing = await reg.pushManager.getSubscription();
                        if (existing) {
                          const buf = existing.options.applicationServerKey;
                          if (!buf || !new Uint8Array(buf).every((v, i) => v === key[i])) {
                            await existing.unsubscribe();
                            existing = null;
                          }
                        }
                        if (!existing) {
                          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
                          const json = sub.toJSON();
                          if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
                            await saveSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
                          }
                        }
                      }
                    } catch (e) { alert("Subscribe error: " + String(e)); return; }
                  }
                  const r = await sendTestPush();
                  if (!r.ok) alert("ส่งไม่ได้: " + r.error);
                  else alert("ส่งแล้ว รอดูการแจ้งเตือน");
                }}
                title="ทดสอบ push"
                style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "9px 11px", cursor: "pointer", display: "flex", color: TEXT2, touchAction: "manipulation", fontSize: 16 }}
              >
                🔔
              </button>
            )}
            <button
              onClick={() => router.push("/admin/notifications")}
              style={{ position: "relative", background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "9px 11px", cursor: "pointer", display: "flex", color: TEXT2, touchAction: "manipulation" }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: "absolute", top: -5, right: -5,
                  background: "#EF4444", color: "#fff",
                  fontSize: "10px", fontWeight: 700, lineHeight: 1,
                  padding: "2px 5px", borderRadius: 999,
                  border: `2px solid ${CARD}`,
                }}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notification permission banner */}
        {notifStatus === "default" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(184,134,11,0.1)", border: "1px solid rgba(184,134,11,0.3)", borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
            <Bell size={20} color={GOLD} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: 0 }}>เปิดการแจ้งเตือน</p>
              <p style={{ color: TEXT2, fontSize: 12, margin: "2px 0 0" }}>รับแจ้งทันทีเมื่อมีคำขอใหม่</p>
            </div>
            <button
              onClick={enableNotifications}
              style={{ background: GOLD, border: "none", borderRadius: 10, padding: "8px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", touchAction: "manipulation" }}
            >
              เปิด
            </button>
          </div>
        )}

        {loading ? (
          <div className="animate-pulse">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ background: CARD, borderRadius: 16, padding: 16, border: `1px solid ${BORDER}` }}>
                  <div style={{ height: 10, background: BORDER, borderRadius: 6, width: "55%", marginBottom: 14 }} />
                  <div style={{ height: 28, background: BORDER, borderRadius: 6, width: "35%" }} />
                </div>
              ))}
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: CARD, borderRadius: 16, height: 72, marginBottom: 10, border: `1px solid ${BORDER}` }} />
            ))}
          </div>
        ) : (
          <>
            {/* Stats 2×2 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "28px" }}>
              <StatCard label={role === "staff" ? "งานใหม่" : "คำขอใหม่"} value={newCount} color="#F59E0B" href="/admin/requests" />
              <StatCard label="รอดำเนินการ"    value={pendingCount}   color="#3B82F6" href="/admin/requests" />
              <StatCard label="นัดหมายวันนี้"  value={todayAppt}      color="#8B5CF6" href="/admin/appointments" />
              <StatCard label="เสร็จสิ้นวันนี้" value={completedToday} color="#10B981" href="/admin/requests" />
            </div>

            {/* Recent */}
            <div style={{ marginBottom: "28px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <h2 style={{ color: TEXT, fontSize: "17px", fontWeight: 700, margin: 0 }}>
                  {role === "staff" ? "งานล่าสุด" : "คำขอล่าสุด"}
                </h2>
                <button
                  onClick={() => router.push("/admin/requests")}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: GOLD, fontSize: "13px", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 600, touchAction: "manipulation" }}
                >
                  ดูทั้งหมด <ArrowRight size={14} />
                </button>
              </div>
              {recent.length === 0 ? (
                <p style={{ color: TEXT3, fontSize: "14px", textAlign: "center", padding: "24px 0" }}>
                  {role === "staff" ? "ยังไม่มีงานที่ถูก assign ให้คุณ" : "ยังไม่มีคำขอ"}
                </p>
              ) : (
                recent.map(r => <RequestCard key={r.id} request={r} />)
              )}
            </div>

            {/* Activity log */}
            {role === "owner" && activity.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <h2 style={{ color: TEXT, fontSize: "17px", fontWeight: 700, margin: 0 }}>กิจกรรมล่าสุด</h2>
                  <button onClick={() => router.push("/admin/activity")} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: GOLD, fontSize: "13px", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 600 }}>ดูทั้งหมด <ArrowRight size={14} /></button>
                </div>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "16px", overflow: "hidden" }}>
                  {activity.slice(0, 10).map((log, i) => {
                    const actionColor = log.action === "ลบคำขอ" ? "#EF4444" : log.action === "สร้างคำขอ" ? "#10B981" : GOLD;
                    return (
                      <div key={log.id} style={{ padding: "12px 16px", borderBottom: i < Math.min(activity.length, 10) - 1 ? `1px solid ${BORDER}` : "none", display: "flex", gap: "12px", alignItems: "flex-start" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: actionColor, marginTop: 6, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                            <span style={{ color: TEXT, fontSize: "13px", fontWeight: 600 }}>{log.action}</span>
                            <span style={{ color: TEXT3, fontSize: "11px", whiteSpace: "nowrap" }}>
                              {new Date(log.created_at).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {log.order_number && <span style={{ color: actionColor, fontSize: "12px", fontWeight: 700 }}>{log.order_number} </span>}
                          {log.detail && <span style={{ color: TEXT2, fontSize: "12px" }}>{log.detail}</span>}
                          <p style={{ color: TEXT3, fontSize: "11px", margin: "2px 0 0" }}>โดย {log.performed_by_name}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick actions */}
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ color: TEXT, fontSize: "17px", fontWeight: 700, margin: "0 0 14px" }}>ทางลัด</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {quickActions.map(({ label, icon: Icon, href, color }) => (
                  <button
                    key={label}
                    onClick={() => href.startsWith("tel") ? window.open(href) : router.push(href)}
                    style={{ display: "flex", alignItems: "center", gap: "12px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: "16px", padding: "16px", cursor: "pointer", touchAction: "manipulation", color: TEXT, fontFamily: "inherit", fontSize: "14px", fontWeight: 500, textAlign: "left" }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: "10px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={18} color={color} />
                    </div>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
