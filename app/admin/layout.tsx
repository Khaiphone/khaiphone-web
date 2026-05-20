"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, ClipboardList, CalendarDays, Bell, MoreHorizontal,
} from "lucide-react";
import BottomTabNav from "../components/admin/BottomTabNav";
import { supabase } from "@/lib/supabase";
import { fetchMyRole, fetchMyProfile } from "@/app/actions/admin-users";
import { AdminRoleProvider } from "./role-context";
import type { AdminRole } from "@/app/actions/admin-users";

const NAV_ITEMS = [
  { label: "หน้าหลัก",  icon: LayoutDashboard, href: "/admin/dashboard"    },
  { label: "คำขอ",      icon: ClipboardList,   href: "/admin/requests"     },
  { label: "นัดหมาย",   icon: CalendarDays,    href: "/admin/appointments" },
  { label: "แจ้งเตือน", icon: Bell,            href: "/admin/notifications"},
  { label: "เพิ่มเติม", icon: MoreHorizontal,  href: "/admin/more"         },
] as const;

// Routes accessible by staff only — everything else is owner-only
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const isLogin  = pathname === "/admin/login" || pathname === "/admin/set-password";
  const [ready, setReady] = useState(false);
  const [role, setRole]   = useState<AdminRole | null>(null);

  useEffect(() => {
    if (isLogin) { setReady(true); return; }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/admin/login"); return; }

      const r = await fetchMyRole(session.user.id);
      setRole(r);

      if (r === "staff") {
        const profile = await fetchMyProfile(session.user.id);
        const perms = profile?.permissions ?? [];
        const allowed =
          STAFF_ALLOWED_PREFIXES.some(p => pathname.startsWith(p)) ||
          (perms.includes("manage_prices") && (pathname.startsWith("/admin/prices") || pathname.startsWith("/admin/price-settings"))) ||
          (perms.includes("view_reports")   && pathname.startsWith("/admin/reports"))   ||
          (perms.includes("view_customers") && pathname.startsWith("/admin/customers")) ||
          (perms.includes("view_payments")  && pathname.startsWith("/admin/payments"));
        if (!allowed) { router.replace("/admin/dashboard"); return; }
      }

      setReady(true);
    });
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div style={{ minHeight: "100vh", background: "#F5F5F7" }} />;
  if (isLogin) return <AdminRoleProvider>{children}</AdminRoleProvider>;

  const hideBottomNav = /^\/admin\/(requests|prices)\/[^/]+$/.test(pathname);

  return (
    <AdminRoleProvider>
      <div style={{ minHeight: "100vh", background: "#F5F5F7", display: "flex" }}>

        {/* ── Desktop Sidebar (md+) ── */}
        <aside
          className="hidden md:flex"
          style={{
            width: 220,
            background: "#FFFFFF",
            borderRight: "1px solid #E5E5E5",
            flexDirection: "column",
            flexShrink: 0,
            position: "fixed",
            top: 0, left: 0, bottom: 0,
            zIndex: 10,
            padding: "24px 0",
          }}
        >
          <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #F0F0F0" }}>
            <p style={{ color: "#111111", fontWeight: 700, fontSize: "15px", margin: 0 }}>ขายไอโฟน.com</p>
            <p style={{ color: "#999999", fontSize: "12px", margin: "2px 0 0" }}>
              Admin · {role === "owner" ? "เจ้าของ" : "พนักงาน"}
            </p>
          </div>

          <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
              const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "10px",
                    color: active ? GOLD : "#666666",
                    background: active ? "#FEF3C7" : "transparent",
                    textDecoration: "none", fontSize: "14px",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  {label}
                </Link>
              );
            })}

            {/* Owner-only sidebar links */}
            {role === "owner" && (
              <>
                <div style={{ height: 1, background: "#F0F0F0", margin: "8px 4px" }} />
                {[
                  { href: "/admin/price-settings", label: "ตั้งค่าราคา"  },
                  { href: "/admin/stock",          label: "สต็อคเครื่อง" },
                  { href: "/admin/accounting",     label: "บัญชี"         },
                  { href: "/admin/reports",        label: "รายงาน"        },
                  { href: "/admin/staff",          label: "จัดการทีม"    },
                ].map(({ href, label }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      style={{
                        display: "flex", alignItems: "center", gap: "10px",
                        padding: "10px 12px", borderRadius: "10px",
                        color: active ? GOLD : "#666666",
                        background: active ? "#FEF3C7" : "transparent",
                        textDecoration: "none", fontSize: "14px",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          <div style={{ padding: "16px 12px", borderTop: "1px solid #F0F0F0" }}>
            <button
              onClick={() => { supabase.auth.signOut().then(() => router.push("/admin/login")); }}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: "10px",
                background: "transparent", border: "1px solid #E5E5E5",
                color: "#999999", fontSize: "13px", cursor: "pointer",
                textAlign: "left", fontFamily: "inherit",
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main
          className="md:ml-[220px]"
          style={{ flex: 1, minHeight: "100vh", paddingBottom: hideBottomNav ? 0 : "calc(env(safe-area-inset-bottom) + 72px)" }}
        >
          {children}
        </main>

        {/* ── Mobile Bottom Nav ── */}
        {!hideBottomNav && <BottomTabNav />}
      </div>
    </AdminRoleProvider>
  );
}
