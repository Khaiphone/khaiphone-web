"use client";

import type { StockStatus } from "@/lib/stock/types";
import { STOCK_STATUS_COLORS } from "@/lib/stock/constants";

export default function StockStatusBadge({ status }: { status: StockStatus }) {
  const color = STOCK_STATUS_COLORS[status] ?? "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {status}
    </span>
  );
}

export function GradeBadge({ grade }: { grade: string }) {
  const map: Record<string, string> = { A: "#22c55e", "A-": "#84cc16", "B+": "#facc15", B: "#f97316", "B-": "#ef4444", C: "#dc2626" };
  const color = map[grade] ?? "#6b7280";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 32, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 700,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {grade}
    </span>
  );
}
