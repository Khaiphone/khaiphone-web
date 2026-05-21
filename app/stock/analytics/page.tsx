"use client";

import { useEffect, useState } from "react";
import { BarChart2, Users, TrendingUp, Award, RefreshCw, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { useThemeColors } from "@/components/stock/ThemeContext";
import StockTopbar from "@/components/stock/Topbar";
import { fetchEstimateAnalytics } from "@/app/actions/analytics";
import type { EstimateAnalytics, DailyCount, FunnelStep, ModelCount, ModelFunnel, HourlyCount, WeekdayCount, StorageCount, AvgPrice } from "@/app/actions/analytics";

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

// ─── Hour of Day Chart ───────────────────────────────────────────────────────

function HourlyChart({ hourly, c }: { hourly: HourlyCount[]; c: ReturnType<typeof useThemeColors> }) {
  const max = Math.max(...hourly.map(h => h.count), 1);
  const hasData = hourly.some(h => h.count > 0);
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px 20px" }}>
      <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>ช่วงเวลาที่ประเมิน (เวลาไทย)</p>
      {!hasData ? (
        <p style={{ color: c.text3, fontSize: 13, margin: 0, textAlign: "center", padding: "20px 0" }}>ยังไม่มีข้อมูล</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 3, height: 64, alignItems: "flex-end" }}>
            {hourly.map(h => {
              const pct = Math.round((h.count / max) * 100);
              const isMorning   = h.hour >= 6  && h.hour < 12;
              const isAfternoon = h.hour >= 12 && h.hour < 18;
              const isEvening   = h.hour >= 18 && h.hour < 24;
              const barColor    = isEvening ? c.gold : isAfternoon ? "#3b82f6" : isMorning ? "#22c55e" : c.text3;
              return (
                <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: "100%", height: `${Math.max(pct, pct > 0 ? 6 : 0)}%`, background: pct > 0 ? barColor : c.border, borderRadius: "3px 3px 0 0", transition: "height 0.4s ease" }} />
                  <span style={{ fontSize: 7, color: c.text3, transform: h.hour % 3 === 0 ? "none" : "scale(0)", display: "block" }}>{h.hour}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            {[{ label: "เช้า 6–12", color: "#22c55e" }, { label: "บ่าย 12–18", color: "#3b82f6" }, { label: "เย็น–ดึก 18–24", color: c.gold }].map(({ label, color }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ color: c.text3, fontSize: 10 }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Day of Week Chart ───────────────────────────────────────────────────────

function WeekdayChart({ weekday, c }: { weekday: WeekdayCount[]; c: ReturnType<typeof useThemeColors> }) {
  const max = Math.max(...weekday.map(d => d.count), 1);
  const hasData = weekday.some(d => d.count > 0);
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px 20px" }}>
      <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: "0 0 14px" }}>วันในสัปดาห์</p>
      {!hasData ? (
        <p style={{ color: c.text3, fontSize: 13, margin: 0, textAlign: "center", padding: "20px 0" }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={{ display: "flex", gap: 8, height: 80, alignItems: "flex-end" }}>
          {weekday.map(d => {
            const pct = Math.round((d.count / max) * 100);
            const isWeekend = d.day >= 5;
            return (
              <div key={d.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                {d.count > 0 && <span style={{ color: c.text3, fontSize: 10 }}>{d.count}</span>}
                <div style={{ width: "100%", height: `${Math.max(pct, pct > 0 ? 8 : 4)}%`, background: pct > 0 ? (isWeekend ? c.gold : "#3b82f6") : c.border, borderRadius: "4px 4px 0 0", transition: "height 0.4s ease" }} />
                <span style={{ fontSize: 11, color: isWeekend ? c.gold : c.text2, fontWeight: isWeekend ? 700 : 400 }}>{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Storage Breakdown ───────────────────────────────────────────────────────

function StorageChart({ storages, selectedModel, c }: { storages: StorageCount[]; selectedModel: string | null; c: ReturnType<typeof useThemeColors> }) {
  const filtered = selectedModel ? storages.filter(s => s.model === selectedModel) : storages;
  const max = Math.max(...filtered.map(s => s.count), 1);
  const COLORS = ["#3b82f6", "#f59e0b", "#22c55e", "#a855f7", "#ef4444", "#06b6d4"];

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>
          ความจุที่ประเมิน{selectedModel ? ` — ${selectedModel}` : ""}
        </p>
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: c.text3, fontSize: 13, margin: 0, textAlign: "center", padding: "28px 0" }}>ยังไม่มีข้อมูล</p>
      ) : (
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.slice(0, 10).map((s, i) => {
            const pct = Math.round((s.count / max) * 100);
            const color = COLORS[i % COLORS.length];
            return (
              <div key={`${s.model}-${s.storage}`}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: c.text2, fontSize: 12 }}>{selectedModel ? s.storage : `${s.model} ${s.storage}`}</span>
                  <span style={{ color: c.text3, fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{s.count} ครั้ง</span>
                </div>
                <div style={{ height: 8, background: c.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Average Price Table ─────────────────────────────────────────────────────

function AvgPriceTable({ avgPrices, selectedModel, c }: { avgPrices: AvgPrice[]; selectedModel: string | null; c: ReturnType<typeof useThemeColors> }) {
  const filtered = selectedModel ? avgPrices.filter(p => p.model === selectedModel) : avgPrices;
  const fmt = (n: number) => "฿" + n.toLocaleString("th-TH");
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>ราคาที่ระบบเสนอ</p>
      </div>
      {filtered.length === 0 ? (
        <p style={{ color: c.text3, fontSize: 13, margin: 0, textAlign: "center", padding: "28px 0" }}>ยังไม่มีข้อมูล</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 50px", gap: 8, padding: "8px 20px", borderBottom: `1px solid ${c.border}`, background: c.card2 ?? c.border }}>
            {["รุ่น", "เฉลี่ย", "ต่ำสุด", "สูงสุด", "n"].map(h => (
              <span key={h} style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{h}</span>
            ))}
          </div>
          {filtered.map((p, i) => (
            <div key={p.model} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 90px 50px", gap: 8, padding: "11px 20px", borderBottom: i < filtered.length - 1 ? `1px solid ${c.border}` : "none", alignItems: "center" }}>
              <span style={{ color: c.text, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.model}</span>
              <span style={{ color: c.gold, fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmt(p.avgPrice)}</span>
              <span style={{ color: c.text3, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(p.minPrice)}</span>
              <span style={{ color: c.text3, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{fmt(p.maxPrice)}</span>
              <span style={{ color: c.text3, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>{p.count}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Model Bar Chart ─────────────────────────────────────────────────────────

function ModelBarChart({ models, total, c }: { models: ModelCount[]; total: number; c: ReturnType<typeof useThemeColors> }) {
  const maxStarts = Math.max(...models.map(m => m.starts), 1);

  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>รุ่นยอดนิยม</p>
      </div>

      {models.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <p style={{ color: c.text3, fontSize: 13, margin: 0 }}>ยังไม่มีข้อมูล</p>
        </div>
      ) : (
        <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          {models.map((m, i) => {
            const barPct    = (m.starts / maxStarts) * 100;
            const sharePct  = total > 0 ? Math.round((m.starts / total) * 100) : 0;
            const isTop     = i === 0;
            const isLow     = m.starts <= Math.floor(maxStarts * 0.2);
            const barColor  = isTop ? c.gold : isLow ? c.text3 : "#3b82f6";
            return (
              <div key={m.model}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {isTop && <span style={{ fontSize: 11 }}>🔥</span>}
                    {isLow && <span style={{ fontSize: 11 }}>📉</span>}
                    {!isTop && !isLow && <span style={{ color: c.text3, fontSize: 11, minWidth: 14 }}>#{i + 1}</span>}
                    <span style={{ color: isTop ? c.text : c.text2, fontSize: 13, fontWeight: isTop ? 700 : 400 }}>{m.model}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ color: c.text3, fontSize: 11 }}>{sharePct}% ของทั้งหมด</span>
                    <span style={{ color: c.text2, fontSize: 12, fontWeight: 600, fontVariantNumeric: "tabular-nums", minWidth: 24, textAlign: "right" }}>{m.starts}</span>
                  </div>
                </div>
                <div style={{ height: 8, background: c.border, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${barPct}%`, background: barColor, borderRadius: 4, transition: "width 0.5s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
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
                  border: active ? "1px solid transparent" : `1px solid ${c.border}`,
                  background: active ? c.gold : "transparent",
                  color: active ? "#1a1a1a" : c.text2, cursor: "pointer",
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

type Period = { label: string; days: number };
const PERIODS: Period[] = [
  { label: "วันนี้",   days: 1  },
  { label: "7 วัน",   days: 7  },
  { label: "30 วัน",  days: 30 },
  { label: "90 วัน",  days: 90 },
];

function StatCard({ label, value, color, icon: Icon, c }: {
  label: string; value: number | string; color: string;
  icon: React.ElementType; c: ReturnType<typeof useThemeColors>;
}) {
  return (
    <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "14px 16px" }}>
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
  );
}

export default function EstimateAnalyticsPage() {
  const c = useThemeColors();
  const [data,          setData]          = useState<EstimateAnalytics | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [period,        setPeriod]        = useState<Period>(PERIODS[2]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  async function load(p: Period) {
    setLoading(true);
    const d = await fetchEstimateAnalytics(p.days);
    setData(d);
    setLoading(false);
  }

  useEffect(() => { load(period); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function changePeriod(p: Period) {
    setPeriod(p);
    load(p);
  }

  // Model-specific funnel when selected, else overall
  const activeFunnel = selectedModel && data
    ? (data.modelFunnels.find(m => m.model === selectedModel)?.funnel ?? data.funnel)
    : data?.funnel ?? [];

  const activeStarts    = activeFunnel[0]?.count  ?? 0;
  const activePriceSeen = activeFunnel[9]?.count  ?? 0;
  const activeSubmits   = activeFunnel[10]?.count ?? 0;
  const activeRate      = activeStarts > 0 ? Math.round((activeSubmits / activeStarts) * 100) : 0;
  const activeDropStep  = selectedModel && data
    ? (data.modelFunnels.find(m => m.model === selectedModel)
        ? (() => {
            const f = data.modelFunnels.find(m => m.model === selectedModel)!.funnel;
            let top = "ไม่มีข้อมูล"; let max = 0;
            for (let i = 1; i < f.length; i++) {
              const drop = f[i-1].count - f[i].count;
              if (drop > max) { max = drop; top = f[i].stepName; }
            }
            return top;
          })()
        : data.topDropStep)
    : data?.topDropStep ?? "ไม่มีข้อมูล";

  return (
    <div style={{ minHeight: "100vh", background: c.bg }}>
      <StockTopbar title="วิเคราะห์การประเมิน" subtitle="วิเคราะห์ funnel การประเมินราคา" />

      <div style={{ padding: "24px 28px" }}>

        {/* Period tabs + refresh */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 6 }}>
            {PERIODS.map(p => {
              const active = p.days === period.days;
              return (
                <button key={p.days} onClick={() => changePeriod(p)} style={{
                  padding: "8px 18px", borderRadius: 10, fontFamily: "inherit", fontSize: 13,
                  fontWeight: active ? 700 : 500, cursor: "pointer",
                  border: active ? "1px solid transparent" : `1px solid ${c.border}`,
                  background: active ? c.gold : c.card,
                  color: active ? "#1a1a1a" : c.text2,
                }}>{p.label}</button>
              );
            })}
          </div>
          <button onClick={() => load(period)} disabled={loading}
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

            {/* Model filter */}
            {data.modelFunnels.length > 0 && (
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 14, padding: "12px 16px" }}>
                <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>กรองตามรุ่น</p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setSelectedModel(null)}
                    style={{
                      padding: "5px 14px", borderRadius: 20, fontFamily: "inherit", fontSize: 12,
                      fontWeight: !selectedModel ? 700 : 400, cursor: "pointer",
                      border: !selectedModel ? "1px solid transparent" : `1px solid ${c.border}`,
                      background: !selectedModel ? c.gold : "transparent",
                      color: !selectedModel ? "#1a1a1a" : c.text2,
                    }}
                  >ทั้งหมด</button>
                  {data.modelFunnels.map(m => {
                    const active = selectedModel === m.model;
                    return (
                      <button key={m.model} onClick={() => setSelectedModel(active ? null : m.model)} style={{
                        padding: "5px 14px", borderRadius: 20, fontFamily: "inherit", fontSize: 12,
                        fontWeight: active ? 700 : 400, cursor: "pointer",
                        border: active ? "1px solid transparent" : `1px solid ${c.border}`,
                        background: active ? c.gold : "transparent",
                        color: active ? "#1a1a1a" : c.text2,
                      }}>
                        {m.model} <span style={{ opacity: 0.6 }}>({m.funnel[0]?.count ?? 0})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stat cards — 4 cards based on selected model or overall */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <StatCard label={`ประเมิน (${period.label})`}  value={activeStarts}    color="#3b82f6" icon={Users}      c={c} />
              <StatCard label="เห็นราคา"                      value={activePriceSeen} color="#f59e0b" icon={BarChart2}  c={c} />
              <StatCard label="นัดหมาย"                       value={activeSubmits}   color="#22c55e" icon={TrendingUp} c={c} />
              <StatCard label="อัตราสำเร็จ"                   value={`${activeRate}%`} color="#a855f7" icon={Award}     c={c} />
            </div>

            {/* Drop-off banner */}
            {activeStarts > 0 && (
              <div style={{ background: "#ef444415", border: "1px solid #ef444430", borderRadius: 14, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <p style={{ color: "#ef4444", fontSize: 13, fontWeight: 700, margin: 0 }}>
                    จุดที่คนออกมากสุด{selectedModel ? ` (${selectedModel})` : ""}: {activeDropStep}
                  </p>
                  <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>ควรปรับปรุง UX หรือคำอธิบายที่ขั้นตอนนี้</p>
                </div>
              </div>
            )}

            {/* Daily chart (full width, always overall) */}
            <DailyChart daily={data.daily} c={c} />

            {/* Two column: Funnel (filtered) + Model bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <FunnelChart funnel={activeFunnel} c={c} />
              <ModelBarChart models={data.models} total={data.totalStarts} c={c} />
            </div>

            {/* Hour + Weekday side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
              <HourlyChart  hourly={data.hourly}   c={c} />
              <WeekdayChart weekday={data.weekday} c={c} />
            </div>

            {/* Storage + Avg price side by side */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <StorageChart  storages={data.storages}   selectedModel={selectedModel} c={c} />
              <AvgPriceTable avgPrices={data.avgPrices} selectedModel={selectedModel} c={c} />
            </div>

          </div>
        ) : null}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
