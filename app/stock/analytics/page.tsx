"use client";

import { useEffect, useState } from "react";
import { BarChart2, Users, TrendingUp, Award, RefreshCw, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { useThemeColors } from "@/components/stock/ThemeContext";
import StockTopbar from "@/components/stock/Topbar";
import { fetchEstimateAnalytics } from "@/app/actions/analytics";
import type { EstimateAnalytics, DailyCount, FunnelStep, ModelCount, ModelFunnel } from "@/app/actions/analytics";

// ─── Daily Bar Chart ────────────────────────────────────────────────────────

function DailyChart({ daily, c }: { daily: DailyCount[]; c: ReturnType<typeof useThemeColors> }) {
  const last14   = daily.slice(-14);
  const maxValue = Math.max(...last14.map(d => d.starts), 1);
  const hasData  = last14.some(d => d.starts > 0);

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "20px 24px" }}>
      <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: "0 0 16px" }}>ประเมินรายวัน (14 วันล่าสุด)</p>

      {!hasData ? (
        <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ color: c.text3, fontSize: 13, margin: 0 }}>ยังไม่มีข้อมูล — เริ่มเก็บหลังจากนี้</p>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 6, height: 100, alignItems: "flex-end" }}>
          {last14.map(d => {
            const total = Math.max(d.starts, 1);
            const h1 = Math.round((d.starts    / maxValue) * 100);
            const h2 = Math.round((d.priceSeen / maxValue) * 100);
            const h3 = Math.round((d.submits   / maxValue) * 100);
            const day = new Date(d.date + "T00:00:00").getDate();
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", display: "flex", gap: 2, height: 88, alignItems: "flex-end" }}>
                  {[
                    { h: h1, color: "#3b82f6" },
                    { h: h2, color: "#f59e0b" },
                    { h: h3, color: "#22c55e" },
                  ].map(({ h, color }, i) => (
                    <div key={i} style={{ flex: 1, height: `${Math.max(h, h > 0 ? 4 : 0)}%`, background: h > 0 ? color : c.border, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
                  ))}
                </div>
                <span style={{ fontSize: 9, color: c.text3 }}>{day}</span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
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

// ─── Funnel ──────────────────────────────────────────────────────────────────

function FunnelChart({ funnel, c }: { funnel: FunnelStep[]; c: ReturnType<typeof useThemeColors> }) {
  const [expanded, setExpanded] = useState(false);
  const visible  = expanded ? funnel : funnel.slice(0, 6);
  const hasData  = funnel[0]?.count > 0;

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>Funnel การประเมิน</p>
      </div>

      {!hasData ? (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <p style={{ color: c.text3, fontSize: 13, margin: 0 }}>ยังไม่มีข้อมูล</p>
        </div>
      ) : (
        <>
          {visible.map((step, i) => {
            const pct      = step.pct;
            const barColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
            const emoji    = step.stepIndex === 0 ? "🚀" : step.stepIndex === 10 ? "💰" : step.stepIndex === 11 ? "✅" : null;
            return (
              <div key={step.stepIndex} style={{ padding: "10px 20px", borderBottom: `1px solid ${c.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ color: i === 0 ? c.text : c.text2, fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>
                    {emoji ? `${emoji} ` : `${step.stepIndex}. `}{step.stepName}
                  </span>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <span style={{ color: c.text3, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{step.count.toLocaleString("th-TH")} คน</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: c.border, borderRadius: 3, overflow: "hidden" }}>
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
        </>
      )}
    </div>
  );
}

// ─── Model Table ─────────────────────────────────────────────────────────────

function ModelTable({ models, c }: { models: ModelCount[]; c: ReturnType<typeof useThemeColors> }) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>รุ่นที่ประเมินมากสุด</p>
      </div>

      {models.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <p style={{ color: c.text3, fontSize: 13, margin: 0 }}>ยังไม่มีข้อมูล</p>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "28px 1fr 70px 70px 60px", gap: 8, padding: "8px 20px", borderBottom: `1px solid ${c.border}`, background: c.card2 ?? c.border }}>
            {["#", "รุ่น", "เริ่ม", "นัดหมาย", "อัตรา"].map(h => (
              <span key={h} style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>

          {models.map((m, i) => {
            const rate     = m.starts > 0 ? Math.round((m.submits / m.starts) * 100) : 0;
            const rateColor = rate >= 20 ? "#059669" : rate >= 10 ? "#d97706" : c.text3;
            const rateBg    = rate >= 20 ? "#05966915" : rate >= 10 ? "#d9770615" : "transparent";
            return (
              <div key={m.model} style={{ display: "grid", gridTemplateColumns: "28px 1fr 70px 70px 60px", gap: 8, padding: "11px 20px", borderBottom: i < models.length - 1 ? `1px solid ${c.border}` : "none", alignItems: "center" }}>
                <span style={{ color: c.text3, fontSize: 12, fontWeight: 700 }}>#{i + 1}</span>
                <span style={{ color: c.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.model}</span>
                <span style={{ color: c.text2, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{m.starts.toLocaleString("th-TH")}</span>
                <span style={{ color: c.text2, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>{m.submits.toLocaleString("th-TH")}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: rateColor, background: rateBg, padding: "2px 7px", borderRadius: 6, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>{rate}%</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── Per-model Funnel ────────────────────────────────────────────────────────

function ModelFunnelSection({ modelFunnels, c }: { modelFunnels: ModelFunnel[]; c: ReturnType<typeof useThemeColors> }) {
  const [selected, setSelected] = useState<string>(modelFunnels[0]?.model ?? "");
  const mf = modelFunnels.find(m => m.model === selected);

  if (modelFunnels.length === 0) return null;

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: "0 0 12px" }}>Funnel แยกตามรุ่น</p>
        {/* Model pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {modelFunnels.map(m => {
            const active = m.model === selected;
            return (
              <button
                key={m.model}
                onClick={() => setSelected(m.model)}
                style={{
                  padding: "5px 12px", borderRadius: 20, fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 400,
                  border: active ? "1px solid rgba(184,134,11,0.4)" : `1px solid ${c.border}`,
                  background: active ? "var(--admin-gold-bg, #FEF3C7)" : "transparent",
                  color: active ? c.gold : c.text2, cursor: "pointer",
                }}
              >
                {m.model}
                <span style={{ marginLeft: 4, opacity: 0.6 }}>({m.funnel[0]?.count ?? 0})</span>
              </button>
            );
          })}
        </div>
      </div>

      {mf && (
        <div>
          {mf.funnel.map((step, i) => {
            const pct      = step.pct;
            const barColor = pct >= 70 ? "#22c55e" : pct >= 40 ? "#f59e0b" : "#ef4444";
            const emoji    = step.stepIndex === 0 ? "🚀" : step.stepIndex === 9 ? "💰" : step.stepIndex === 10 ? "✅" : null;
            const dropFromPrev = i > 0 ? (mf.funnel[i - 1].count - step.count) : 0;
            return (
              <div key={step.stepIndex} style={{ padding: "10px 20px", borderBottom: i < mf.funnel.length - 1 ? `1px solid ${c.border}` : "none" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                  <span style={{ color: i === 0 ? c.text : c.text2, fontSize: 13, fontWeight: i === 0 ? 700 : 400 }}>
                    {emoji ? `${emoji} ` : `${step.stepIndex}. `}{step.stepName}
                  </span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {dropFromPrev > 0 && (
                      <span style={{ fontSize: 11, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>-{dropFromPrev} คน</span>
                    )}
                    <span style={{ color: c.text3, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{step.count} คน</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: barColor, minWidth: 40, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
                  </div>
                </div>
                <div style={{ height: 6, background: c.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EstimateAnalyticsPage() {
  const c = useThemeColors();
  const [data,    setData]    = useState<EstimateAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const d = await fetchEstimateAnalytics();
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const statCards = data ? [
    { label: "เริ่มวันนี้",    value: data.todayStarts,              color: "#3b82f6", icon: Users      },
    { label: "เห็นราคาวันนี้", value: data.todayPriceSeen,           color: "#f59e0b", icon: BarChart2  },
    { label: "นัดหมายวันนี้",  value: data.todaySubmits,             color: "#22c55e", icon: TrendingUp },
    { label: "สำเร็จ 30 วัน", value: `${data.completionRate}%`,      color: "#a855f7", icon: Award      },
    { label: "ทั้งหมด 30 วัน", value: data.totalStarts,              color: c.gold,    icon: BarChart2  },
    { label: "เจอราคา 30 วัน", value: data.funnel[9]?.count ?? 0,    color: "#f59e0b", icon: Minus      },
  ] : [];

  return (
    <div style={{ minHeight: "100vh", background: c.bg }}>
      <StockTopbar title="วิเคราะห์การประเมิน" subtitle="วิเคราะห์ funnel การประเมินราคา" />

      <div style={{ padding: "24px 28px" }}>

        {/* Header row */}
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
          <div style={{ textAlign: "center", padding: "80px 0", color: c.text3 }}>
            <RefreshCw size={28} style={{ margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
            <p style={{ margin: 0 }}>กำลังโหลด...</p>
          </div>
        ) : data ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stat cards — 6 across */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
              {statCards.map(({ label, value, color, icon: Icon }) => (
                <div key={label} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={13} color={color} />
                    </div>
                    <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.3 }}>{label}</p>
                  </div>
                  <p style={{ color, fontSize: 24, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {typeof value === "number" ? value.toLocaleString("th-TH") : value}
                  </p>
                </div>
              ))}
            </div>

            {/* Drop-off highlight */}
            {data.totalStarts > 0 && (
              <div style={{ background: "#ef444415", border: "1px solid #ef444430", borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 700, margin: 0 }}>จุดที่คนออกมากสุด: {data.topDropStep}</p>
                  <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>ควรปรับปรุง UX หรือคำอธิบายที่ขั้นตอนนี้</p>
                </div>
              </div>
            )}

            {/* Daily chart (full width) */}
            <DailyChart daily={data.daily} c={c} />

            {/* Two column: Funnel + Models */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FunnelChart funnel={data.funnel} c={c} />
              <ModelTable  models={data.models}  c={c} />
            </div>

            {/* Per-model funnel */}
            {data.modelFunnels.length > 0 && (
              <ModelFunnelSection modelFunnels={data.modelFunnels} c={c} />
            )}

          </div>
        ) : null}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
