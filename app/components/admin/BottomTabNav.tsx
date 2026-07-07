"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, CalendarDays, Bell, MoreHorizontal } from "lucide-react";
import { fetchNewRequestCount } from "@/app/actions/admin-requests";
import { useAdminTheme } from "@/lib/admin-theme";
import { cacheGet } from "@/app/admin/cache";
import type { AdminRequest } from "@/lib/types/admin";
import { useAdminNavReady } from "@/app/admin/nav-ready-context";
import { perfStart } from "@/lib/perf";

const TABS = [
  { label: "หน้าหลัก",  icon: Home,           href: "/admin/dashboard"     },
  { label: "คำขอ",      icon: ClipboardList,  href: "/admin/requests"      },
  { label: "นัดหมาย",   icon: CalendarDays,   href: "/admin/appointments"  },
  { label: "แจ้งเตือน", icon: Bell,           href: "/admin/notifications" },
  { label: "เพิ่มเติม", icon: MoreHorizontal, href: "/admin/more"          },
] as const;

export default function BottomTabNav() {
  const pathname  = usePathname();
  const { dark }  = useAdminTheme();
  const { navReady } = useAdminNavReady();
  // ใช้ค่าจาก cache ก่อน (ไม่ยิง network ตอน first-open)
  const [newCount, setNewCount] = useState<number>(() => {
    const cached = cacheGet<AdminRequest[]>("admin:requests");
    return cached ? cached.filter(r => r.status === "new").length : 0;
  });

  useEffect(() => {
    if (!navReady) return; // เลื่อน refresh badge ออกจาก critical path ตอนเปิดแอป
    const end = perfStart("bottom-nav:badge-fetch");
    // นับอย่างเดียว (HEAD count) — เดิมดึงทั้งตารางมาแค่ filter นับ ซ้ำกับข้อมูล dashboard
    fetchNewRequestCount().then(count => {
      end();
      setNewCount(count);
    });
  }, [pathname, navReady]);

  const GOLD     = dark ? "#D4A843" : "#B8860B";
  const INACTIVE = dark ? "#636366" : "#6B7280";
  const BG       = dark ? "#1C1C1E" : "#FFFFFF";
  const BORDER   = dark ? "#2C2C2E" : "#E5E7EB";

  return (
    <nav
      className="md:hidden"
      style={{
        flexShrink: 0,
        background: BG,
        borderTop: `1px solid ${BORDER}`,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div style={{ display: "flex", height: "56px" }}>
        {TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
          const badge  =
            href === "/admin/requests" ? newCount : 0;

          return (
            <Link
              key={href}
              href={href}
              prefetch={navReady ? undefined : false}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "3px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: active ? GOLD : INACTIVE,
                touchAction: "manipulation",
                position: "relative",
                minHeight: "44px",
                padding: 0,
                textDecoration: "none",
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={21} strokeWidth={active ? 2.5 : 1.75} />
                {badge > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-5px",
                      right: "-8px",
                      background: "#EF4444",
                      color: "#fff",
                      fontSize: "9px",
                      fontWeight: 700,
                      padding: "1px 4px",
                      borderRadius: "999px",
                      minWidth: "15px",
                      textAlign: "center",
                      lineHeight: "14px",
                    }}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
              <span style={{ fontSize: "10px", fontWeight: active ? 700 : 400, lineHeight: 1, color: active ? GOLD : INACTIVE }}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
