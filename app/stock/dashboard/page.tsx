"use client";

import { useState, useEffect } from "react";
import { Package, TrendingUp, DollarSign, CheckCircle, Clock, ShoppingBag } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import StockStatusBadge from "@/components/stock/StatusBadge";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockItems, fetchRevenueData, fetchCategoryData } from "@/app/actions/stocks";
import type { StockItem, } from "@/lib/stock/types";
import type { RevenuePoint, CategoryPoint } from "@/app/actions/stocks";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("th-TH", { month: "short", day: "numeric" }); }

export default function StockDashboard() {
  const c = useThemeColors();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryPoint[]>([]);

  useEffect(() => {
    fetchStockItems().then(setStocks);
    fetchRevenueData().then(setRevenueData);
    fetchCategoryData().then(setCategoryData);
  }, []);

  const todayStr = new Date().toDateString();
  const INACTIVE = new Set(["ขายแล้ว", "ส่งคืน", "ตีกลับ/ไม่รับซื้อ"]);
  const activeStocks = stocks.filter(s => !INACTIVE.has(s.status));
  const pricedStocks = activeStocks.filter(s => s.sellingPrice > 0);
  const totalValue = pricedStocks.reduce((a, s) => a + s.sellingPrice, 0);
  const totalCostProfit = pricedStocks.reduce((a, s) => a + (s.sellingPrice - s.costPrice - s.shippingCost - s.otherCost), 0);
  const readyToSell = stocks.filter(s => s.status === "พร้อมขาย").length;
  const inspecting = stocks.filter(s => s.status === "รอตรวจ").length;
  const noPricedCount = activeStocks.filter(s => s.sellingPrice === 0).length;
  const soldToday = stocks.filter(s => {
    if (s.status !== "ขายแล้ว") return false;
    if (s.soldAt && new Date(s.soldAt).toDateString() === todayStr) return true;
    return s.statusLog.some(l => l.status === "ขายแล้ว" && new Date(l.timestamp).toDateString() === todayStr);
  }).length;

  const recentActivity = stocks.slice(0, 5);

  const METRICS = [
    { icon: DollarSign, label: "มูลค่าสต็อกรวม",        value: `฿${fmt(totalValue)}`,         iconColor: c.gold,    sub: `เฉพาะเครื่องที่กำหนดราคาแล้ว` },
    { icon: Package,    label: "จำนวนเครื่องในสต็อก",    value: `${activeStocks.length} เครื่อง`, iconColor: c.info,    sub: noPricedCount > 0 ? `ยังไม่กำหนดราคา ${noPricedCount} เครื่อง` : "ไม่รวมที่ขายแล้ว" },
    { icon: TrendingUp, label: "กำไรคาดการณ์",           value: `฿${fmt(totalCostProfit)}`,    iconColor: "#22c55e", sub: "เฉพาะเครื่องที่กำหนดราคาแล้ว" },
    { icon: CheckCircle,label: "เครื่องพร้อมขาย",        value: `${readyToSell} เครื่อง`,     iconColor: "#22c55e", sub: "สถานะ: พร้อมขาย" },
    { icon: Clock,      label: "เครื่องรอตรวจ",           value: `${inspecting} เครื่อง`,     iconColor: c.orange,  sub: "สถานะ: รอตรวจ" },
    { icon: ShoppingBag,label: "เครื่องขายแล้ววันนี้",   value: `${soldToday} เครื่อง`,       iconColor: c.info,    sub: "เฉพาะวันนี้" },
  ];

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Dashboard" subtitle="ภาพรวมสต็อก" />

      <div style={{ padding: "24px 24px 0" }}>
        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
          {/* Revenue Chart */}
          <div style={{ background: c.card, borderRadius: 16, padding: 20, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>รายรับ 30 วัน</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>Revenue vs Profit</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData.slice(-14)}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c.gold} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={c.gold} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                <XAxis dataKey="date" stroke={c.text3} tick={{ fontSize: 11 }} />
                <YAxis stroke={c.text3} tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v) / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, color: c.text }} formatter={(v: unknown) => [`฿${fmt(Number(v))}`, ""]} />
                <Area type="monotone" dataKey="revenue" stroke={c.gold} fill="url(#colorRev)" strokeWidth={2} name="รายรับ" />
                <Area type="monotone" dataKey="profit" stroke="#22c55e" fill="url(#colorProfit)" strokeWidth={2} name="กำไร" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Category Bar */}
          <div style={{ background: c.card, borderRadius: 16, padding: 20, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>สต็อกตามซีรีส์</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>จำนวนเครื่องแต่ละรุ่น</p>
            {categoryData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: c.text3, fontSize: 13 }}>ยังไม่มีข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} horizontal={false} />
                  <XAxis type="number" stroke={c.text3} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke={c.text3} tick={{ fontSize: 10 }} width={90} />
                  <Tooltip contentStyle={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, color: c.text }} />
                  <Bar dataKey="count" fill={c.gold} radius={[0, 6, 6, 0]} name="จำนวน" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ background: c.card, borderRadius: 16, padding: 20, border: `1px solid ${c.border}`, marginBottom: 24 }}>
          <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>กิจกรรมล่าสุด</p>
          {recentActivity.length === 0 ? (
            <p style={{ color: c.text3, fontSize: 13, textAlign: "center", padding: "20px 0" }}>ยังไม่มีข้อมูลสต็อก</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["รหัส", "รุ่น", "เกรด", "ราคาขาย", "สถานะ", "ช่องทาง", "วันรับเข้า"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${c.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((s, i) => (
                    <motion.tr
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      style={{ borderBottom: `1px solid ${c.border}` }}
                    >
                      <td style={{ padding: "12px 12px", color: c.gold, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.id}</td>
                      <td style={{ padding: "12px 12px", color: c.text, fontSize: 13 }}>{s.model}</td>
                      <td style={{ padding: "12px 12px" }}><span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>{s.grade}</span></td>
                      <td style={{ padding: "12px 12px", color: c.text, fontSize: 13, fontWeight: 600 }}>฿{fmt(s.sellingPrice)}</td>
                      <td style={{ padding: "12px 12px" }}><StockStatusBadge status={s.status} /></td>
                      <td style={{ padding: "12px 12px", color: c.text2, fontSize: 12 }}>{s.sourceChannel}</td>
                      <td style={{ padding: "12px 12px", color: c.text3, fontSize: 12 }}>{fmtDate(s.receivedAt)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
