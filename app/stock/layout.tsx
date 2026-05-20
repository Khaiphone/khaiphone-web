"use client";

import { useState } from "react";
import { StockThemeProvider, useThemeColors } from "@/components/stock/ThemeContext";
import StockSidebar from "@/components/stock/Sidebar";
import MobileBottomNav from "@/components/stock/MobileBottomNav";

function StockLayoutInner({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  const [, setSidebarOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.bg }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:block" style={{ width: 240, flexShrink: 0 }}>
        <StockSidebar />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, minWidth: 0, marginLeft: 0 }} className="md:ml-0">
        {children}
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}

export default function StockLayout({ children }: { children: React.ReactNode }) {
  return (
    <StockThemeProvider>
      <StockLayoutInner>{children}</StockLayoutInner>
    </StockThemeProvider>
  );
}
