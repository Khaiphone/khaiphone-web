"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Home, Clock, Wallet, UserCircle, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import { fetchRiderOnlineStatus, fetchRiderNotifications, fetchRiderHomeData } from "@/app/actions/rider";
import { cacheSet } from "@/app/rider/cache";
import { saveSubscription } from "@/app/actions/push";
import { RiderThemeProvider, useRiderTheme } from "@/app/rider/theme";
import { RiderSessionContext } from "@/app/rider/context";

const NAV = [
  { href: "/rider",          label: "หน้าแรก",   icon: Home       },
  { href: "/rider/earnings", label: "รายได้",    icon: Wallet     },
  { href: "/rider/history",  label: "งานของฉัน", icon: Clock      },
  { href: "/rider/account",  label: "โปรไฟล์",   icon: UserCircle },
] as const;

type Notif = { id: string; requestId: string; orderId: string; title: string; body: string; timestamp: string };

function fmtTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffH  = Math.floor(diffMs / 3600000);
  const diffD  = Math.floor(diffMs / 86400000);
  if (diffH < 1)  return "เมื่อกี้";
  if (diffH < 24) return `${diffH} ชม. ที่แล้ว`;
  if (diffD < 7)  return `${diffD} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function RiderLayoutInner({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { BG, CARD, BORDER, ACCENT, GREEN, TEXT, TEXT2 } = useRiderTheme();

  const [ready, setReady]         = useState(false);
  const [riderName, setRiderName] = useState("");
  const [riderEmail, setRiderEmail] = useState("");
  const [riderRole, setRiderRole] = useState("");
  const [userId, setUserId]       = useState<string>("");
  const [isOnline, setIsOnline]   = useState(false);
  const [notifs, setNotifs]       = useState<Notif[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [lastRead, setLastRead]   = useState<string>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("rider-notif-read") ?? "") : ""
  );

  const unreadCount = notifs.filter(n => n.timestamp > lastRead).length;

  const loadNotifs = useCallback(async (uid: string) => {
    const data = await fetchRiderNotifications(uid);
    setNotifs(data);
  }, []);

  useEffect(() => {
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black");
    setMeta("apple-mobile-web-app-title", "KP Rider");
    setMeta("theme-color", "#4ADE80");

    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Tell iOS to resize layout (not scroll visual viewport) when keyboard opens
    const vp = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (vp && !vp.content.includes("interactive-widget")) {
      vp.content = vp.content + ", interactive-widget=resizes-content";
    }

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) { manifestLink = document.createElement("link"); manifestLink.rel = "manifest"; document.head.appendChild(manifestLink); }
    manifestLink.href = "/rider-manifest.json";

    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) { appleIcon = document.createElement("link"); appleIcon.rel = "apple-touch-icon"; document.head.appendChild(appleIcon); }
    appleIcon.href = "/rider-apple-touch-icon.png";

    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;
        const key = Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          const existingKeyBuf = existing.options.applicationServerKey;
          if (existingKeyBuf) {
            const existingKey = new Uint8Array(existingKeyBuf);
            if (key.length === existingKey.length && key.every((v, i) => v === existingKey[i])) return;
          }
          await existing.unsubscribe();
        }
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const json = sub.toJSON();
        if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
          const { data: { session } } = await supabase.auth.getSession();
          await saveSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth }, userId: session?.user?.id });
        }
      }).catch(e => console.error("SW registration error:", e));
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.background = BG;
    document.body.style.background = BG;
  }, [BG]);

  // iOS Safari scrolls window when keyboard opens even with overflow:hidden,
  // causing the header to disappear offscreen. Reset immediately on every scroll.
  useEffect(() => {
    const resetScroll = () => { if (window.scrollY !== 0) window.scrollTo(0, 0); };
    window.addEventListener("scroll", resetScroll);
    return () => window.removeEventListener("scroll", resetScroll);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/admin/login"); return; }
      const uid = session.user.id;
      const [profile, online] = await Promise.all([
        fetchMyProfile(uid),
        fetchRiderOnlineStatus(uid),
      ]);
      if (!profile || (profile.role !== "owner" && profile.role !== "staff")) {
        router.replace("/admin/login");
        return;
      }
      setRiderName(profile.name ?? "ไรเดอร์");
      setRiderEmail(profile.email ?? "");
      setRiderRole(profile.role ?? "");
      setUserId(uid);
      setIsOnline(online);
      setReady(true);
      loadNotifs(uid);
      // Prefetch home data so first visit to home tab is instant
      fetchRiderHomeData(uid).then(d => cacheSet(`home:${uid}`, d));
    });
  }, [router, loadNotifs]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel("rider-notif-refresh")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "requests" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => { if (payload.new?.rider_id === userId) loadNotifs(userId); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, loadNotifs]);


  function openNotifs() {
    const now = new Date().toISOString();
    setLastRead(now);
    localStorage.setItem("rider-notif-read", now);
    setShowNotifs(true);
  }

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isJobPage = /^\/rider\/job\//.test(pathname);

  return (
    <RiderSessionContext.Provider value={{ userId, riderName, riderEmail, riderRole, isOnline, setIsOnline }}>
    <div style={{ height: "100dvh", background: BG, color: TEXT, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", overscrollBehavior: "none" }}>

      {/* Header */}
      {!isJobPage && (
        <header style={{
          background: CARD, borderBottom: `1px solid ${BORDER}`,
          padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/rider-apple-touch-icon.png" alt="KP Rider" width={32} height={32} style={{ borderRadius: 8 }} unoptimized />
            <span style={{ fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: 0.3 }}>KP Rider</span>
          </div>

          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11, color: TEXT2, letterSpacing: 0.5 }}>สวัสดีครับ,</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{riderName}</p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: isOnline ? GREEN : BORDER, boxShadow: isOnline ? `0 0 6px ${GREEN}` : "none" }} />
            <button onClick={openNotifs} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, position: "relative", display: "flex" }}>
              <Bell size={22} color={unreadCount > 0 ? ACCENT : TEXT2} />
              {unreadCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "#FF453A", borderRadius: "50%", width: 16, height: 16, fontSize: 9, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>
      )}

      {/* Content */}
      <main style={{ paddingBottom: isJobPage ? 0 : "calc(64px + env(safe-area-inset-bottom))", flex: 1, overflowY: "auto", minHeight: 0 }}>
        {children}
      </main>

      {/* Bottom Nav */}
      {!isJobPage && (
        <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD, borderTop: `1px solid ${BORDER}`, display: "flex", paddingBottom: "env(safe-area-inset-bottom)", zIndex: 10 }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0", gap: 3, textDecoration: "none", color: active ? ACCENT : TEXT2 }}>
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      {/* Notification bottom sheet */}
      {showNotifs && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-end" }} onClick={() => setShowNotifs(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: CARD, borderRadius: "20px 20px 0 0", maxHeight: "75vh", display: "flex", flexDirection: "column", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>การแจ้งเตือน</p>
              <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
              {notifs.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center" }}>
                  <Bell size={32} color={BORDER} style={{ marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 14, color: TEXT2 }}>ยังไม่มีการแจ้งเตือน</p>
                </div>
              ) : notifs.map((n, i) => {
                const isUnread = n.timestamp > lastRead;
                return (
                  <div key={n.id} onClick={() => { setShowNotifs(false); router.push(`/rider/job/${n.requestId}`); }}
                    style={{ padding: "14px 20px", borderBottom: i < notifs.length - 1 ? `1px solid ${BORDER}` : "none", background: isUnread ? "rgba(74,222,128,0.05)" : "transparent", cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: isUnread ? ACCENT : "transparent" }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: isUnread ? 700 : 400, color: TEXT }}>{n.title}</p>
                      <p style={{ margin: "0 0 4px", fontSize: 12, color: TEXT2 }}>{n.body}</p>
                      <p style={{ margin: 0, fontSize: 11, color: TEXT2 }}>{fmtTime(n.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
    </RiderSessionContext.Provider>
  );
}

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return (
    <RiderThemeProvider>
      <RiderLayoutInner>{children}</RiderLayoutInner>
    </RiderThemeProvider>
  );
}
