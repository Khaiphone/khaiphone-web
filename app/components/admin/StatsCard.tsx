import type { ReactNode } from "react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: ReactNode;
  color: string;
}

export default function StatsCard({ title, value, change, icon, color }: StatsCardProps) {
  const isPositive = change.startsWith("+");
  const isNegative = change.startsWith("-");

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #E5E7EB",
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: "#9CA3AF", fontSize: "13px", marginBottom: "4px" }}>{title}</p>
          <p style={{ color: "#111111", fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{value}</p>
        </div>
        <div
          style={{
            backgroundColor: color,
            borderRadius: "10px",
            width: "44px",
            height: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <p
        style={{
          fontSize: "12px",
          color: isPositive ? "#16A34A" : isNegative ? "#EF4444" : "#9CA3AF",
          margin: 0,
        }}
      >
        {change}
      </p>
    </div>
  );
}
