"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  LayoutDashboard, ClipboardList, CalendarDays, Bell, MoreHorizontal, Moon, Sun,
  Map, Users, ArrowLeft, BarChart2, Settings, HelpCircle, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import BottomTabNav from "../components/admin/BottomTabNav";
import { supabase } from "@/lib/supabase";
import { fetchMyRole, fetchMyProfile } from "@/app/actions/admin-users";
import { saveSubscription } from "@/app/actions/push";
import { AdminRoleProvider } from "./role-context";
import { AdminThemeProvider, useAdminTheme, adminCssVars } from "@/lib/admin-theme";
import type { AdminRole } from "@/app/actions/admin-users";

const NAV_ITEMS = [
  { label: "หน้าหลัก",  icon: LayoutDashboard, href: "/admin/dashboard"    },
  { label: "คำขอ",      icon: ClipboardList,   href: "/admin/requests"     },
  { label: "นัดหมาย",   icon: CalendarDays,    href: "/admin/appointments" },
  { label: "แจ้งเตือน", icon: Bell,            href: "/admin/notifications"},
  { label: "เพิ่มเติม", icon: MoreHorizontal,  href: "/admin/more"         },
] as const;

const STAFF_ALLOWED_PREFIXES = [
  "/admin/dashboard",
  "/admin/requests",
  "/admin/appointments",
  "/admin/notifications",
  "/admin/more",
  "/admin/profile",
  "/admin/login",
];

const GOLD = "#B8860B";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const isLogin  = pathname === "/admin/login" || pathname === "/admin/set-password";
  const [ready, setReady]             = useState(false);
  const [role, setRole]               = useState<AdminRole | null>(null);
  const [profileName,   setProfileName]   = useState<string | null>(null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [collapsed, setCollapsed]     = useState(false);
  const { dark, toggle }              = useAdminTheme();
  const sidebarW = collapsed ? 64 : 220;

  useEffect(() => {
    // PWA: swap manifest + add iOS meta tags for admin.khaiphone.com
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = "/admin-manifest.json";

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black-translucent");
    setMeta("apple-mobile-web-app-title", "KP Admin");
    setMeta("theme-color", "#B8860B");

    // Register service worker + subscribe to push notifications
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then(async (reg) => {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;

        // PushManager requires Uint8Array, not raw base64url string
        const key = Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          // If VAPID key changed (or key not readable on iOS), unsubscribe and resubscribe
          const existingKeyBuf = existing.options.applicationServerKey;
          if (existingKeyBuf) {
            const existingKey = new Uint8Array(existingKeyBuf);
            const keyMatches = key.length === existingKey.length && key.every((v, i) => v === existingKey[i]);
            if (keyMatches) return; // same key, subscription is still valid
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
    if (isLogin) { setReady(true); return; }

    let cancelled = false;

    // Optimistic: use cached role to skip black-screen flash on return visits
    const cached = localStorage.getItem("kp_admin_role") as AdminRole | null;
    if (cached) {
      setRole(cached);
      setReady(true);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        localStorage.removeItem("kp_admin_role");
        router.replace("/admin/login");
        return;
      }

      const r = await fetchMyRole(session.user.id);
      if (cancelled) return;
      if (r) localStorage.setItem("kp_admin_role", r);
      setRole(r);

      fetchMyProfile(session.user.id).then(p => { if (p && !cancelled) { setProfileName(p.name); setProfileAvatar(p.avatar_url ?? null); } });

      if (r === "staff") {
        const profile = await fetchMyProfile(session.user.id);
        if (cancelled) return;
        const perms = profile?.permissions ?? [];
        const allowed =
          STAFF_ALLOWED_PREFIXES.some(p => pathname.startsWith(p)) ||
          (perms.includes("manage_prices") && (pathname.startsWith("/admin/prices") || pathname.startsWith("/admin/price-settings"))) ||
          (perms.includes("view_reports")   && pathname.startsWith("/admin/reports"))   ||
          (perms.includes("view_customers") && pathname.startsWith("/admin/customers")) ||
          (perms.includes("view_payments")  && pathname.startsWith("/admin/payments"));
        if (!allowed) { router.replace("/admin/dashboard"); return; }
      }

      if (!cached) setReady(true);
    });

    return () => { cancelled = true; };
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div suppressHydrationWarning style={{ minHeight: "100vh", background: "#0F0F11" }} />;
  if (isLogin) return <AdminRoleProvider>{children}</AdminRoleProvider>;

  const hideBottomNav = /^\/admin\/(requests|prices)\/[^/]+$/.test(pathname) || pathname.startsWith("/admin/riders");
  const sidebarBg     = dark ? "#1C1C1E" : "#FFFFFF";
  const sidebarBorder = dark ? "#2C2C2E" : "#E5E5E5";
  const sidebarText   = dark ? "#F2F2F7" : "#111111";
  const sidebarText2  = dark ? "#AEAEB2" : "#999999";
  const activeBg      = dark ? "rgba(212,168,67,0.15)" : "#FEF3C7";
  const activeColor   = dark ? "#D4A843" : GOLD;

  return (
    <AdminRoleProvider>
      <div style={{ minHeight: "100vh", background: dark ? "#0F0F11" : "#F5F5F7", display: "flex", "--admin-sidebar-w": `${sidebarW}px`, ...adminCssVars(dark) } as React.CSSProperties}>

        {/* ── Desktop Sidebar (md+) ── */}
        <aside
          className="hidden md:flex"
          style={{
            width: sidebarW,
            background: sidebarBg,
            borderRight: `1px solid ${sidebarBorder}`,
            flexDirection: "column",
            flexShrink: 0,
            position: "fixed",
            top: 0, left: 0, bottom: 0,
            zIndex: 10,
            padding: "24px 0",
            transition: "width 0.2s ease",
            overflow: "hidden",
          }}
        >
          {pathname.startsWith("/admin/riders") ? (
            /* ── Rider system sidebar (upgraded) ── */
            <>
              {/* Logo header */}
              <div style={{ padding: collapsed ? "0 0 20px" : "0 20px 20px", borderBottom: `1px solid ${sidebarBorder}`, display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start" }}>
                <Image src="/logo-icon.webp" alt="Khaiphone" width={36} height={36} style={{ borderRadius: 10, flexShrink: 0 }} />
                {!collapsed && (
                  <div>
                    <p style={{ color: sidebarText, fontWeight: 800, fontSize: "14px", margin: 0, letterSpacing: 0.5 }}>KHAIPHONE</p>
                    <p style={{ color: sidebarText2, fontSize: "11px", margin: 0 }}>ระบบไรเดอร์</p>
                  </div>
                )}
              </div>

              {/* Nav items */}
              <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
                {[
                  { href: "/admin/riders",        label: "หน้าควบคุมงาน", icon: Map            },
                  { href: "/admin/riders/manage",  label: "จัดการไรเดอร์", icon: Users          },
                  { href: "/admin/riders/jobs",    label: "รายงาน / สถิติ",icon: BarChart2      },
                  { href: "/admin/riders/settings", label: "ตั้งค่า",        icon: Settings       },
                ].map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== "/admin/riders" && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} title={collapsed ? label : undefined} style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : "10px", padding: "10px 12px", borderRadius: "10px", color: active ? activeColor : sidebarText2, background: active ? activeBg : "transparent", textDecoration: "none", fontSize: "13px", fontWeight: active ? 600 : 400, justifyContent: collapsed ? "center" : "flex-start" }}>
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                      {!collapsed && label}
                    </Link>
                  );
                })}

                <div style={{ height: 1, background: sidebarBorder, margin: "6px 4px" }} />

                <Link href="/admin/riders/help" title={collapsed ? "ช่วยเหลือ" : undefined} style={{ display: "flex", alignItems: "center", gap: collapsed ? 0 : "10px", padding: "10px 12px", borderRadius: "10px", color: sidebarText2, textDecoration: "none", fontSize: "13px", justifyContent: collapsed ? "center" : "flex-start" }}>
                  <HelpCircle size={18} strokeWidth={2} />
                  {!collapsed && "ช่วยเหลือ"}
                </Link>
              </nav>

              {/* Version info */}
              {!collapsed && (
                <div style={{ padding: "10px 20px", borderTop: `1px solid ${sidebarBorder}` }}>
                  <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: sidebarText2 }}>เวอร์ชันระบบ v2.4.0</p>
                  <p style={{ margin: "2px 0 4px", fontSize: "10px", color: sidebarText2 }}>
                    อัพเดตล่าสุด {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                    <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: 600 }}>ระบบปกติ</span>
                  </div>
                </div>
              )}

              {/* User profile */}
              <div
                style={{ padding: collapsed ? "10px 0" : "10px 16px", borderTop: `1px solid ${sidebarBorder}`, display: "flex", alignItems: "center", gap: 10, justifyContent: collapsed ? "center" : "flex-start", cursor: "pointer" }}
                onClick={() => router.push("/admin/profile")}
                title={collapsed ? (profileName ?? "โปรไฟล์") : undefined}
              >
                {/* Avatar */}
                {(() => {
                  if (profileAvatar) {
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profileAvatar} alt={profileName ?? "profile"} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />
                    );
                  }
                  const name = profileName ?? "?";
                  const initials = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
                  const hue = (name.charCodeAt(0) * 47 + (name.charCodeAt(1) ?? 0) * 23) % 360;
                  return (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: `hsl(${hue},55%,50%)`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                      {initials}
                    </div>
                  );
                })()}
                {!collapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: sidebarText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profileName ?? "—"}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: sidebarText2 }}>{role === "owner" ? "Owner" : role === "staff" ? "Staff" : role ?? "—"}</p>
                  </div>
                )}
              </div>

              {/* Collapse toggle */}
              <div style={{ padding: "8px 10px", borderTop: `1px solid ${sidebarBorder}` }}>
                <button
                  onClick={() => setCollapsed(c => !c)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 6, justifyContent: collapsed ? "center" : "flex-start", padding: "7px 10px", borderRadius: 8, border: `1px solid ${sidebarBorder}`, background: "transparent", color: sidebarText2, fontSize: "12px", cursor: "pointer", fontFamily: "inherit" }}
                >
                  {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} /><span>ซ่อนเมนู</span></>}
                </button>
              </div>
            </>
          ) : (
            /* ── Normal admin sidebar ── */
            <>
              <div style={{ padding: "0 20px 24px", borderBottom: `1px solid ${sidebarBorder}` }}>
                <p style={{ color: sidebarText, fontWeight: 700, fontSize: "15px", margin: 0 }}>Khaiphone.com</p>
                <p style={{ color: sidebarText2, fontSize: "12px", margin: "2px 0 0" }}>
                  Admin · {role === "owner" ? "เจ้าของ" : "พนักงาน"}
                </p>
              </div>
              <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
                {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
                  const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", color: active ? activeColor : sidebarText2, background: active ? activeBg : "transparent", textDecoration: "none", fontSize: "14px", fontWeight: active ? 600 : 400 }}>
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                      {label}
                    </Link>
                  );
                })}
                {role === "owner" && (
                  <>
                    <div style={{ height: 1, background: sidebarBorder, margin: "8px 4px" }} />
                    {[
                      { href: "/admin/price-settings", label: "ตั้งค่าราคา" },
                      { href: "/admin/reports",        label: "รายงาน"       },
                      { href: "/admin/staff",          label: "จัดการทีม"   },
                      { href: "/admin/activity",       label: "กิจกรรม"      },
                    ].map(({ href, label }) => {
                      const active = pathname.startsWith(href);
                      return (
                        <Link key={href} href={href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", color: active ? activeColor : sidebarText2, background: active ? activeBg : "transparent", textDecoration: "none", fontSize: "14px", fontWeight: active ? 600 : 400 }}>
                          {label}
                        </Link>
                      );
                    })}
                  </>
                )}
              </nav>
            </>
          )}

          {(() => {
            const isCollapsed = collapsed && pathname.startsWith("/admin/riders");
            return (
              <div style={{ padding: "16px 10px", borderTop: `1px solid ${sidebarBorder}`, display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  onClick={toggle}
                  title={isCollapsed ? (dark ? "Light Mode" : "Dark Mode") : undefined}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: "10px",
                    background: "transparent", border: `1px solid ${sidebarBorder}`,
                    color: sidebarText2, fontSize: "13px", cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center",
                    gap: isCollapsed ? 0 : 8, justifyContent: isCollapsed ? "center" : "flex-start",
                  }}
                >
                  {dark ? <Sun size={14} /> : <Moon size={14} />}
                  {!isCollapsed && (dark ? "Light Mode" : "Dark Mode")}
                </button>
                <button
                  onClick={() => { localStorage.removeItem("kp_admin_role"); supabase.auth.signOut().then(() => router.push("/admin/login")); }}
                  title={isCollapsed ? "ออกจากระบบ" : undefined}
                  style={{
                    width: "100%", padding: "9px 12px", borderRadius: "10px",
                    background: "transparent", border: `1px solid ${sidebarBorder}`,
                    color: sidebarText2, fontSize: "13px", cursor: "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center",
                    gap: isCollapsed ? 0 : 8, justifyContent: isCollapsed ? "center" : "flex-start",
                  }}
                >
                  <LogOut size={14} />
                  {!isCollapsed && "ออกจากระบบ"}
                </button>
              </div>
            );
          })()}
        </aside>

        {/* ── Main Content ── */}
        <main
          className="md:block admin-main-content"
          style={{ flex: 1, minHeight: "100vh", paddingBottom: hideBottomNav ? 0 : "calc(env(safe-area-inset-bottom) + 72px)", transition: "margin-left 0.2s ease" }}
        >
          {children}
        </main>

        {/* ── Mobile Bottom Nav ── */}
        {!hideBottomNav && <BottomTabNav />}
      </div>
    </AdminRoleProvider>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminThemeProvider>
  );
}
