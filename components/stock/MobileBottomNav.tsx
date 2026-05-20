"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Package, FileText, Users, MoreHorizontal } from "lucide-react";
import { useThemeColors } from "./ThemeContext";

const TABS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/stock/dashboard" },
  { icon: Package,         label: "Stock",     href: "/stock/inventory"  },
  { icon: FileText,        label: "Requests",  href: "/stock/requests"   },
  { icon: Users,           label: "Customers", href: "/stock/customers"  },
  { icon: MoreHorizontal,  label: "More",      href: "/stock/settings"   },
];

export default function MobileBottomNav() {
  const c = useThemeColors();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="md:hidden" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: c.card, borderTop: `1px solid ${c.border}`,
      display: "flex", paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map(({ icon: Icon, label, href }) => {
        const active = pathname.startsWith(href);
        return (
          <button
            key={href}
            onClick={() => router.push(href)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "10px 0", background: "none", border: "none",
              color: active ? c.gold : c.text3, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
