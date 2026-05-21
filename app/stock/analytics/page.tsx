"use client";

import { useEffect, useState } from "react";
import { BarChart2, Users, TrendingUp, Award, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { useThemeColors } from "@/components/stock/ThemeContext";
import StockTopbar from "@/components/stock/Topbar";
import { fetchEstimateAnalytics } from "@/app/actions/analytics";
import type { EstimateAnalytics, DailyCount, FunnelStep, ModelCount } from "@/app/actions/analytics";

// ─── Tiny bar chart (inline, no library) ───────────────────────────────────

function SparkBar({ value, max, color, height = 32 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "flex-end", height }}>
      <div style={{ width: "100%", background: `${color}30`, borderRadius: "3px 3px 0 0", position: "relative", overflow: "hidden", height: "100%" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: color, height: `${pct}%`, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
      </div>
    </div>
  );
}

function DailyChart({ daily, c }: { daily: DailyCount[]; c: ReturnType<typeof useThemeColors> }) {
  const maxStarts = Math.max(...daily.map(d => d.starts), 1);
  const last14 = daily.slice(-14);

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px 20px" }}>
      <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>ประเมินรายวัน (14 วันล่าสุด)</p>
      <div style={{ display: "flex", gap: 4, height: 80, alignItems: "flex-end" }}>
        {last14.map(d => (
          <div key={d.date} style={{ flex: 1, display: "flex", gap: 2, height: "100%", alignItems: "flex-end" }}>
            <SparkBar value={d.starts}   max={maxStarts} color="#3b82f6" height={80} />
            <SparkBar value={d.priceSeen} max={maxStarts} color="#f59e0b" height={80} />
            <SparkBar value={d.submits}  max={maxStarts} color="#22c55e" height={80} />
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
        {last14.map(d => {
          const day = new Date(d.date + "T00:00:00").getDate();
          return (
            <div key={d.date} style={{ flex: 1, textAlign: "center", fontSize: 9, color: c.text3 }}>{day}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
        {[
          { label: "เริ่มประเมิน", color: "#3b82f6" },
          { label: "เห็นราคา",    color: "#f59e0b" },
          { label: "นัดหมาย",     color: "#22c55e" },
        ].map(({ label, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ color: c.text3, fontSize: 11 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelChart({ funnel, c }: { funnel: FunnelStep[]; c: ReturnType<typeof useThemeColors> }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? funnel : funnel.slice(0, 6);

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Funnel การประเมิน</p>
      </div>
      {visible.map((step, i) => {
        const isTop = i === 0;
        const pct = step.pct;
        const barColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
        return (
          <div key={step.stepIndex} style={{ padding: "10px 20px", borderBottom: `1px solid ${c.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ color: isTop ? c.text : c.text2, fontSize: 13, fontWeight: isTop ? 700 : 400 }}>
                {step.stepIndex === 0 ? "🚀 " : step.stepIndex === 10 ? "💰 " : step.stepIndex === 11 ? "✅ " : `${step.stepIndex}. `}
                {step.stepName}
              </span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: c.text3, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{step.count.toLocaleString("th-TH")}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 38, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
              </div>
            </div>
            <div style={{ height: 6, background: `${c.border}`, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>
          </div>
        );
      })}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", padding: "10px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: c.gold, fontSize: 12, fontWeight: 600, fontFamily: "inherit" }}
      >
        {expanded ? <><ChevronUp size={14} /> ย่อ</> : <><ChevronDown size={14} /> ดูทั้งหมด ({funnel.length} ขั้น)</>}
      </button>
    </div>
  );
}

function ModelTable({ models, c }: { models: ModelCount[]; c: ReturnType<typeof useThemeColors> }) {
  if (models.length === 0) return null;
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>รุ่นยอดนิยม (Top 10)</p>
      </div>
      {models.map((m, i) => {
        const rate = m.starts > 0 ? Math.round((m.submits / m.starts) * 100) : 0;
        return (
          <div key={m.model} style={{ padding: "11px 20px", borderBottom: i < models.length - 1 ? `1px solid ${c.border}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ color: c.text3, fontSize: 12, fontWeight: 700, minWidth: 18, fontVariantNumeric: "tabular-nums" }}>#{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{m.model}</p>
              <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>เริ่ม {m.starts.toLocaleString("th-TH")} · นัดหมาย {m.submits.toLocaleString("th-TH")}</p>
            </div>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
              color: rate >= 20 ? "#059669" : rate >= 10 ? "#d97706" : c.text3,
              background: rate >= 20 ? "#05966918" : rate >= 10 ? "#d9770618" : `${c.border}`,
            }}>
              {rate}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function EstimateAnalyticsPage() {
  const c = useThemeColors();
  const [data, setData]       = useState<EstimateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetchEstimateAnalytics();
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const statCards = data ? [
    { label: "เริ่มวันนี้",   value: data.todayStarts,    color: "#3b82f6", icon: Users },
    { label: "เห็นราคาวันนี้", value: data.todayPriceSeen, color: "#f59e0b", icon: BarChart2 },
    { label: "นัดหมายวันนี้",  value: data.todaySubmits,   color: "#22c55e", icon: TrendingUp },
    { label: "สำเร็จ 30 วัน", value: `${data.completionRate}%`, color: "#a855f7", icon: Award },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: c.bg }}>
      <StockTopbar title="วิเคราะห์การประเมิน" subtitle="วิเคราะห์ funnel การประเมินราคา" />

      <div style={{ padding: "24px 28px", maxWidth: 900 }}>
        {/* Refresh */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button
            onClick={load} disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: `1px solid ${c.border}`, background: c.card, color: c.text2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
          >
            <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            รีเฟรช
          </button>
        </div>

        {loading && !data ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: c.text3 }}>
            <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
            <p style={{ margin: 0 }}>กำลังโหลด...</p>
          </div>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {statCards.map(({ label, value, color, icon: Icon }) => (
                <div key={label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={15} color={color} />
                    </div>
                    <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                  </div>
                  <p style={{ color, fontSize: 26, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {typeof value === "number" ? value.toLocaleString("th-TH") : value}
                  </p>
                </div>
              ))}
            </div>

            {/* Extra stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: "14px 18px" }}>
                <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>ทั้งหมด 30 วัน</p>
                <p style={{ color: c.text, fontSize: 22, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>{data.totalStarts.toLocaleString("th-TH")} <span style={{ fontSize: 13, color: c.text2, fontWeight: 400 }}>ครั้ง</span></p>
              </div>
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: "14px 18px" }}>
                <p style={{ color: c.text3, fontSize: 11, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>ออกกลางคันมากสุดที่</p>
                <p style={{ color: "#ef4444", fontSize: 16, fontWeight: 700, margin: 0 }}>{data.topDropStep}</p>
              </div>
            </div>

            {/* Chart */}
            <DailyChart daily={data.daily} c={c} />

            {/* Funnel */}
            <FunnelChart funnel={data.funnel} c={c} />

            {/* Models */}
            <ModelTable models={data.models} c={c} />
          </div>
        ) : null}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
