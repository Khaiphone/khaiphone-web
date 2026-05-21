"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useThemeColors } from "@/components/stock/ThemeContext";

export default function StockFinancePage() {
  const c = useThemeColors();
  const router = useRouter();

  useEffect(() => {
    router.replace("/finance/dashboard");
  }, [router]);

  return (
    <div style={{ background: c.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: c.text3, fontSize: 14 }}>กำลังไปยังหน้า Finance...</p>
    </div>
  );
}
