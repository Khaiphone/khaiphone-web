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

type InsightT = { level: "good" | "warn" | "danger" | "info"; text: string };
const INSIGHT_STYLE: Record<string, { bg: string; bd: string; fg: string; icon: string }> = {
  danger: { bg: "#fef2f2", bd: "#fecaca", fg: "#b91c1c", icon: "🔴" },
  warn:   { bg: "#fffbeb", bd: "#fde68a", fg: "#b45309", icon: "🟠" },
  good:   { bg: "#f0fdf4", bd: "#bbf7d0", fg: "#15803d", icon: "🟢" },
  info:   { bg: "#eff6ff", bd: "#bfdbfe", fg: "#1d4ed8", icon: "💡" },
};

// Executive Insight — กล่องคำแนะนำ "ควรทำอะไรต่อ"
export function InsightBox({ insights, max = 5 }: { insights: InsightT[]; max?: number }) {
  if (!insights || insights.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
      {insights.slice(0, max).map((ins, i) => {
        const s = INSIGHT_STYLE[ins.level];
        return (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: s.bg, border: `1px solid ${s.bd}`, borderRadius: 12, padding: "12px 14px" }}>
            <span style={{ fontSize: 14, lineHeight: 1.4 }}>{s.icon}</span>
            <p style={{ margin: 0, fontSize: 13.5, color: s.fg, fontWeight: 600, lineHeight: 1.55 }}>{ins.text}</p>
          </div>
        );
      })}
    </div>
  );
}

// Business Score — คะแนนสุขภาพธุรกิจ 0-100
export function ScoreCard({ score, level, breakdown }: { score: number; level: string; breakdown: { label: string; pct: number }[] }) {
  const color = score >= 75 ? GREEN : score >= 50 ? GOLD : RED;
  return (
    <Card style={{ background: "linear-gradient(135deg,#1b1b20,#26262d)", border: "none", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
        <div style={{ position: "relative", width: 104, height: 104, flexShrink: 0 }}>
          <svg width="104" height="104" viewBox="0 0 104 104">
            <circle cx="52" cy="52" r="46" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
            <circle cx="52" cy="52" r="46" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 2 * Math.PI * 46} ${2 * Math.PI * 46}`}
              transform="rotate(-90 52 52)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 30, fontWeight: 800, color }}>{score}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>/ 100</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>คะแนนสุขภาพธุรกิจ</p>
          <p style={{ margin: "2px 0 12px", fontSize: 20, fontWeight: 800, color }}>{level}</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px,1fr))", gap: "6px 16px" }}>
            {breakdown.map(b => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{b.label}</span>
                  <span style={{ color: "#fff", fontWeight: 600 }}>{b.pct}</span>
                </div>
                <div style={{ height: 5, borderRadius: 4, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                  <div style={{ width: `${b.pct}%`, height: "100%", background: b.pct >= 75 ? GREEN : b.pct >= 50 ? GOLD : RED }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Loading() {
  return <p style={{ color: "#9ca3af", fontSize: 14, padding: "40px 0", textAlign: "center" }}>กำลังโหลด...</p>;
}
