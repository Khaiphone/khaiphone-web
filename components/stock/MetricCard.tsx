"use client";

import { motion } from "framer-motion";
import { useThemeColors } from "./ThemeContext";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  iconColor?: string;
  trend?: number;
}

export default function MetricCard({ icon: Icon, label, value, sub, iconColor, trend }: MetricCardProps) {
  const c = useThemeColors();
  const color = iconColor ?? c.gold;
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      style={{
        background: c.card, border: `1px solid ${c.border}`, borderRadius: 16,
        padding: "20px 22px", cursor: "default",
        boxShadow: c.dark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={22} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 12, fontWeight: 600, color: trendUp ? "#22c55e" : "#ef4444", background: trendUp ? "#22c55e18" : "#ef444418", borderRadius: 8, padding: "2px 8px" }}>
            {trendUp ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p style={{ color: c.text, fontSize: 26, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.02em" }}>{value}</p>
      <p style={{ color: c.text2, fontSize: 13, margin: 0, fontWeight: 500 }}>{label}</p>
      {sub && <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>{sub}</p>}
    </motion.div>
  );
}
