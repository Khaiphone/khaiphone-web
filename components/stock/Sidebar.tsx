"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart2,
  Settings, Bell, TrendingUp, FileText, UserCog, Tag,
  ChevronRight, ClipboardList, LineChart, Activity,
} from "lucide-react";
import { useThemeColors } from "./ThemeContext";
import { fetchRequestStats, fetchStockSummary } from "@/app/actions/stock-requests";
import { supabase } from "@/lib/supabase";

const NAV_BASE = [
  { icon: LayoutDashboard, label: "Dashboard",  href: "/stock/dashboard"  },
  { icon: FileText,        label: "Requests",   href: "/stock/requests",  showBadge: true },
  { icon: Users,           label: "Customers",  href: "/stock/customers"  },
  { icon: Package,         label: "Stock",      href: "/stock/inventory"  },
  { icon: ShoppingCart,    label: "Sales",      href: "/stock/sales"      },
  { icon: TrendingUp,      label: "Finance",    href: "/stock/finance"    },
  { icon: Tag,             label: "Pricing",    href: "/stock/pricing"    },
  { icon: BarChart2,       label: "Reports",    href: "/stock/reports"    },
  { icon: ClipboardList,   label: "Audit Log",  href: "/stock/audit"      },
  { icon: LineChart,       label: "วิเคราะห์ประเมิน", href: "/stock/analytics" },
  { icon: Activity,        label: "Health",     href: "/stock/health"     },
  { icon: UserCog,         label: "Users",      href: "/stock/users"      },
  { icon: Settings,        label: "Settings",   href: "/stock/settings"   },
];

function fmt(n: number) { return n.toLocaleString("th-TH"); }

export default function StockSidebar() {
  const c = useThemeColors();
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [summary, setSummary] = useState<{ todayRevenue: number; todayProfit: number } | null>(null);
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    fetchRequestStats().then(s => setPendingCount(s.pending));
    fetchStockSummary().then(setSummary);
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const email = session.user.email ?? "";
        const name = email.split("@")[0] || "Admin";
        setUserInfo({ email, name });
      }
    });
  }, [pathname]);

  const displayName = userInfo?.name ?? "—";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div style={{
      width: 240, minHeight: "100vh", background: c.card,
      borderRight: `1px solid ${c.border}`,
      display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 40,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.goldBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 18 }}>K</span>
          </div>
          <div>
            <p style={{ color: c.gold, fontSize: 14, fontWeight: 800, margin: 0, letterSpacing: "0.05em" }}>KHAIPHONE</p>
            <p style={{ color: c.text3, fontSize: 10, margin: 0 }}>Stock Management</p>
          </div>
        </div>
      </div>

      {/* User Card */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${c.gold}, ${c.goldHov})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#000", fontSize: 14, fontWeight: 700 }}>{initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
            <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>Administrator</p>
          </div>
          <Bell size={16} color={c.text3} />
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {NAV_BASE.map(({ icon: Icon, label, href, showBadge }) => {
          const active = pathname.startsWith(href);
          const badge = showBadge && pendingCount ? pendingCount : null;
          return (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 10, border: "none",
                background: active ? c.goldBg : "transparent",
                color: active ? c.gold : c.text2,
                cursor: "pointer", marginBottom: 2, transition: "all 150ms",
                fontFamily: "inherit", textAlign: "left",
              }}
            >
              <Icon size={18} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>
              {badge ? (
                <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px", minWidth: 18, textAlign: "center" }}>
                  {badge}
                </span>
              ) : active ? (
                <ChevronRight size={14} color={c.gold} />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* Quick Summary */}
      <div style={{ padding: "16px", borderTop: `1px solid ${c.border}` }}>
        <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>Quick Summary</p>
        {[
          { label: "ยอดวันนี้",   value: summary ? `฿${fmt(summary.todayRevenue)}` : "—", color: c.gold },
          { label: "กำไรวันนี้",  value: summary ? `฿${fmt(summary.todayProfit)}` : "—", color: summary && summary.todayProfit >= 0 ? "#22c55e" : "#ef4444" },
          { label: "รอดำเนินการ", value: pendingCount !== null ? `${pendingCount} คำขอ` : "—", color: pendingCount ? "#f97316" : c.text3 },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ color: c.text2, fontSize: 12 }}>{label}</span>
            <span style={{ color, fontSize: 12, fontWeight: 600 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
