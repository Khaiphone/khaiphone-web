"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, FileText, Users, ScanSearch } from "lucide-react";
import { useThemeColors } from "./ThemeContext";
import { useStockNavReady } from "@/app/stock/nav-ready-context";

const TABS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/stock/dashboard" },
  { icon: Package,         label: "Stock",     href: "/stock/inventory"  },
  { icon: FileText,        label: "Requests",  href: "/stock/requests"   },
  { icon: Users,           label: "Customers", href: "/stock/customers"  },
  { icon: ScanSearch,      label: "Check",     href: "/stock/check"      },
];

export default function MobileBottomNav() {
  const c = useThemeColors();
  const pathname = usePathname();
  const { navReady } = useStockNavReady();

  return (
    <div className="flex md:hidden" style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
      background: c.card, borderTop: `1px solid ${c.border}`,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map(({ icon: Icon, label, href }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            prefetch={navReady ? undefined : false}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "10px 0", background: "none", border: "none", textDecoration: "none",
              color: active ? c.gold : c.text3, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Icon size={22} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 400 }}>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
