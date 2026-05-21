"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { StockThemeProvider, useThemeColors } from "@/components/stock/ThemeContext";
import StockSidebar from "@/components/stock/Sidebar";
import MobileBottomNav from "@/components/stock/MobileBottomNav";

function StockLayoutInner({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.bg }}>
      <div className="hidden md:block" style={{ width: 240, flexShrink: 0 }}>
        <StockSidebar />
      </div>
      <div style={{ flex: 1, minWidth: 0 }} className="md:ml-0">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default function StockLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/admin/login"); return; }
      setReady(true);
    });
  }, [router]);

  if (!ready) return <div style={{ minHeight: "100vh", background: "#050505" }} />;

  return (
    <StockThemeProvider>
      <StockLayoutInner>{children}</StockLayoutInner>
    </StockThemeProvider>
  );
}
