"use client";

import { useEffect, useState } from "react";
import { BarChart2, TrendingUp, ShoppingBag, DollarSign } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { motion } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockReportData } from "@/app/actions/stocks";
import type { StockReportData } from "@/app/actions/stocks";

function fmt(n: number) { return n.toLocaleString("th-TH"); }

const COLORS = ["#D4AF37", "#3b82f6", "#22c55e", "#a855f7", "#f97316", "#ef4444", "#06b6d4", "#facc15"];

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.25 },
};

export default function ReportsPage() {
  const c = useThemeColors();
  const [data, setData] = useState<StockReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStockReportData().then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div style={{ background: c.bg, minHeight: "100vh" }}>
        <StockTopbar title="Reports" subtitle="รายงานและวิเคราะห์" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: c.text3, fontSize: 14 }}>กำลังโหลด...</div>
      </div>
    );
  }

  const avgProfitPerUnit = data.totalSold > 0 ? Math.round(data.totalProfit / data.totalSold) : 0;

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Reports" subtitle="รายงานและวิเคราะห์" />

      <div style={{ padding: 24 }}>
        <motion.div {...fadeUp} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Summary KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
            <MetricCard icon={ShoppingBag} label="เครื่องที่ขายแล้วทั้งหมด" value={`${data.totalSold} เครื่อง`}    iconColor={c.gold}    sub="ตลอดทุกช่วงเวลา" />
            <MetricCard icon={DollarSign}  label="รายรับรวมทั้งหมด"         value={`฿${fmt(data.totalRevenue)}`}   iconColor="#22c55e"   sub="จากการขายทุกรายการ" />
            <MetricCard icon={TrendingUp}  label="กำไรรวมทั้งหมด"           value={`฿${fmt(data.totalProfit)}`}    iconColor={data.totalProfit >= 0 ? "#22c55e" : "#ef4444"} sub="หลังหักต้นทุน" />
            <MetricCard icon={BarChart2}   label="กำไรเฉลี่ย/เครื่อง"       value={`฿${fmt(avgProfitPerUnit)}`}    iconColor={c.info}    sub="เฉลี่ยต่อเครื่อง" />
          </div>

          {/* Monthly Chart */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <p style={{ color: c.text, fontWeight: 700, fontSize: 15, margin: "0 0 4px" }}>รายรับ / กำไร รายเดือน (12 เดือน)</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>เปรียบเทียบรายรับและกำไรสุทธิ</p>
            {data.monthly.every(m => m.revenue === 0) ? (
              <p style={{ color: c.text3, textAlign: "center", padding: "40px 0", fontSize: 13 }}>ยังไม่มีข้อมูลการขาย</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data.monthly}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c.gold} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={c.gold} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={c.border} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: c.text3, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: c.text3, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} width={44} />
                  <Tooltip
                    contentStyle={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text }}
                    formatter={(v: unknown) => [`฿${fmt(Number(v))}`, ""]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={c.gold} fill="url(#revGrad)" strokeWidth={2} name="รายรับ" />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" fill="url(#profGrad)" strokeWidth={2} name="กำไร" />
                </AreaChart>
              </ResponsiveContainer>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {[{ color: c.gold, label: "รายรับ" }, { color: "#22c55e", label: "กำไร" }].map(({ color, label }) => (
                <span key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: c.text2 }}>
                  <span style={{ width: 12, height: 3, borderRadius: 2, background: color, display: "inline-block" }} /> {label}
                </span>
              ))}
            </div>
          </div>

          {/* Row: Top Models + By Grade */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
            {/* Top Models */}
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "20px 24px" }}>
              <p style={{ color: c.text, fontWeight: 700, fontSize: 15, margin: "0 0 20px" }}>Top รุ่นที่ทำกำไรสูงสุด</p>
              {data.byModel.length === 0 ? (
                <p style={{ color: c.text3, textAlign: "center", padding: "30px 0", fontSize: 13 }}>ยังไม่มีข้อมูล</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byModel.slice(0, 6)} layout="vertical">
                    <CartesianGrid stroke={c.border} horizontal={false} />
                    <XAxis type="number" tick={{ fill: c.text3, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                    <YAxis type="category" dataKey="model" tick={{ fill: c.text2, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip
                      contentStyle={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text }}
                      formatter={(v: unknown) => [`฿${fmt(Number(v))}`, ""]}
                    />
                    <Bar dataKey="totalProfit" radius={[0, 4, 4, 0]} name="กำไรรวม">
                      {data.byModel.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* By Grade */}
            <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "20px 24px" }}>
              <p style={{ color: c.text, fontWeight: 700, fontSize: 15, margin: "0 0 16px" }}>สัดส่วนตามเกรด</p>
              {data.byGrade.length === 0 ? (
                <p style={{ color: c.text3, textAlign: "center", padding: "30px 0", fontSize: 13 }}>ยังไม่มีข้อมูล</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {data.byGrade.map((g, i) => {
                    const pct = Math.round((g.count / data.totalSold) * 100) || 0;
                    return (
                      <div key={g.grade}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>เกรด {g.grade}</span>
                          <span style={{ color: c.text2, fontSize: 12 }}>{g.count} เครื่อง ({pct}%)</span>
                        </div>
                        <div style={{ height: 6, background: c.card2, borderRadius: 3 }}>
                          <div style={{ height: "100%", width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3, transition: "width 0.5s ease" }} />
                        </div>
                        <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>กำไรเฉลี่ย ฿{fmt(g.avgProfit)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* By Channel */}
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <p style={{ color: c.text, fontWeight: 700, fontSize: 15, margin: "0 0 16px" }}>ช่องทางการรับซื้อ</p>
            {data.byChannel.length === 0 ? (
              <p style={{ color: c.text3, textAlign: "center", padding: "20px 0", fontSize: 13 }}>ยังไม่มีข้อมูล</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {data.byChannel.map((ch, i) => (
                  <div key={ch.channel} style={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: c.text2, fontSize: 12, fontWeight: 600 }}>{ch.channel}</span>
                    </div>
                    <p style={{ color: c.text, fontSize: 22, fontWeight: 800, margin: 0 }}>{ch.count}</p>
                    <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>เครื่อง · ฿{fmt(ch.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
