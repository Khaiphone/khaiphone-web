"use client";

export const GOLD = "#B8860B";
export const GREEN = "#16a34a";
export const RED = "#dc2626";
export const BLUE = "#2563eb";

export function baht(n: number) { return "฿" + Math.round(n).toLocaleString("th-TH"); }
export function num(n: number) { return Math.round(n).toLocaleString("th-TH"); }

export function PageTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#111" }}>{title}</h1>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b7280" }}>{sub}</p>}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e7e7ea", borderRadius: 16, padding: 18, ...style }}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, color = "#111", accent }: { label: string; value: string; sub?: string; color?: string; accent?: string }) {
  return (
    <Card style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, color, letterSpacing: -0.5 }}>{value}</p>
      {sub && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>{sub}</p>}
    </Card>
  );
}

export function Grid({ children, min = 200 }: { children: React.ReactNode; min?: number }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`, gap: 14 }}>{children}</div>;
}

// แถบความคืบหน้าเทียบเป้า
export function Progress({ label, value, target, fmt = num }: { label: string; value: number; target: number; fmt?: (n: number) => string }) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const done = pct >= 100;
  const color = done ? GREEN : pct >= 60 ? GOLD : RED;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, color: "#111" }}>
          <strong style={{ color }}>{fmt(value)}</strong>
          <span style={{ color: "#9ca3af" }}> / {target > 0 ? fmt(target) : "ยังไม่ตั้งเป้า"}</span>
          {target > 0 && <span style={{ color, fontWeight: 700 }}> · {pct}%</span>}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 6, background: "#eef0f2", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 6, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

export function Loading() {
  return <p style={{ color: "#9ca3af", fontSize: 14, padding: "40px 0", textAlign: "center" }}>กำลังโหลด...</p>;
}
