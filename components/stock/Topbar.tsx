"use client";

import { Bell, Sun, Moon, Search, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStockTheme, useThemeColors } from "./ThemeContext";
import { useMobileMenu } from "./MobileMenuContext";

interface TopbarProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onMenuClick?: () => void;
}

export default function StockTopbar({ title, subtitle, children, onMenuClick }: TopbarProps) {
  const { theme, toggle } = useStockTheme();
  const c = useThemeColors();
  const { toggle: toggleMenu } = useMobileMenu();
  const router = useRouter();

  return (
    <div style={{
      background: c.card,
      borderBottom: `1px solid ${c.border}`,
      position: "sticky", top: 0, zIndex: 30,
      paddingTop: "env(safe-area-inset-top)",
    }}>
    <div style={{
      height: 64, display: "flex", alignItems: "center", gap: 16,
      padding: "0 24px",
    }}>
      {/* Mobile menu */}
      <button onClick={onMenuClick ?? toggleMenu} className="md:hidden" style={{ background: "none", border: "none", color: c.text2, cursor: "pointer", padding: 4, display: "flex" }}>
        <Menu size={22} />
      </button>

      {/* Title */}
      <div style={{ flex: 1 }}>
        <h1 style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:flex" style={{ position: "relative", alignItems: "center" }}>
        <Search size={15} style={{ position: "absolute", left: 12, color: c.text3 }} />
        <input
          placeholder="ค้นหา..."
          style={{
            background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10,
            padding: "8px 14px 8px 36px", color: c.text, fontSize: 13,
            width: 220, outline: "none", fontFamily: "inherit",
          }}
        />
      </div>

      {/* Actions */}
      {children}

      {/* Theme toggle */}
      <button
        onClick={toggle}
        style={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: 8, cursor: "pointer", color: c.text2, display: "flex", transition: "all 150ms" }}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Bell */}
      <button onClick={() => router.push("/stock/requests")} style={{ background: "none", border: "none", cursor: "pointer", color: c.text2, position: "relative", display: "flex", padding: 4 }}>
        <Bell size={20} />
        <span style={{ position: "absolute", top: 0, right: 0, width: 8, height: 8, background: "#ef4444", borderRadius: "50%" }} />
      </button>
    </div>
    </div>
  );
}
