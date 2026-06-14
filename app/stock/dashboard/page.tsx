"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Package, TrendingUp, DollarSign, CheckCircle, Clock, ShoppingBag, Wallet, Truck, BadgeDollarSign, Calendar, Bell } from "lucide-react";
import { saveSubscription } from "@/app/actions/push";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import StockStatusBadge from "@/components/stock/StatusBadge";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { useStockRole } from "@/app/stock/role-context";
import { fetchStockItems, fetchRevenueData, fetchCategoryData } from "@/app/actions/stocks";
import type { StockItem } from "@/lib/stock/types";
import type { RevenuePoint, CategoryPoint } from "@/app/actions/stocks";

type Preset = "all" | "today" | "week" | "month" | "custom";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("th-TH", { month: "short", day: "numeric" }); }
function pad(d: Date) { return d.toISOString().slice(0, 10); }

function computeRange(preset: Preset, customFrom: string, customTo: string): { dateFrom: string; dateTo: string } {
  const today = new Date();
  if (preset === "today") return { dateFrom: pad(today), dateTo: pad(today) };
  if (preset === "week") {
    const from = new Date(today); from.setDate(today.getDate() - 6);
    return { dateFrom: pad(from), dateTo: pad(today) };
  }
  if (preset === "month") {
    return { dateFrom: pad(new Date(today.getFullYear(), today.getMonth(), 1)), dateTo: pad(today) };
  }
  if (preset === "custom") return { dateFrom: customFrom, dateTo: customTo };
  return { dateFrom: "", dateTo: "" };
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "all",    label: "ทั้งหมด" },
  { value: "today",  label: "วันนี้" },
  { value: "week",   label: "7 วัน" },
  { value: "month",  label: "เดือนนี้" },
  { value: "custom", label: "กำหนดเอง" },
];

export default function StockDashboard() {
  const c = useThemeColors();
  const router = useRouter();
  const { canViewFinance } = useStockRole();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryPoint[]>([]);
  const [preset, setPreset] = useState<Preset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [notifStatus, setNotifStatus] = useState<"default" | "granted" | "denied" | "unsupported" | "loading">("loading");

  useEffect(() => {
    fetchStockItems().then(setStocks);
    fetchRevenueData().then(setRevenueData);
    fetchCategoryData().then(setCategoryData);
  }, []);

  useEffect(() => {
    if (!("PushManager" in window) || !("Notification" in window)) { setNotifStatus("unsupported"); return; }
    setNotifStatus(Notification.permission as "default" | "granted" | "denied");
  }, []);

  // iOS requires Notification.requestPermission() to be called from a user gesture (tap).
  async function enableNotifications() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const permission = await Notification.requestPermission();
    setNotifStatus(permission as "default" | "granted" | "denied");
    if (permission !== "granted") return;
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;
      const key = Uint8Array.from(atob(vapidKey.replace(/-/g, "+").replace(/_/g, "/")), ch => ch.charCodeAt(0));
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      const json = sub.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await saveSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
      }
    } catch (e) { console.error("push setup error:", e); }
  }

  const { dateFrom, dateTo } = useMemo(
    () => computeRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  );

  const inRange = (date: string | undefined) => {
    if (!date) return true;
    const d = date.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo   && d > dateTo)   return false;
    return true;
  };

  const isFiltered = preset !== "all";
  const displayStocks = useMemo(
    () => isFiltered ? stocks.filter(s => inRange(s.receivedAt)) : stocks,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stocks, dateFrom, dateTo, isFiltered],
  );

  const INACTIVE = new Set(["ขายแล้ว", "ส่งคืน", "ตีกลับ/ไม่รับซื้อ"]);
  const activeStocks    = displayStocks.filter(s => !INACTIVE.has(s.status));
  const pricedStocks    = activeStocks.filter(s => s.sellingPrice > 0);
  const totalValue      = pricedStocks.reduce((a, s) => a + s.sellingPrice, 0);
  const totalCostProfit = pricedStocks.reduce((a, s) => a + (s.sellingPrice - s.costPrice - s.shippingCost - s.otherCost), 0);
  const readyToSell     = displayStocks.filter(s => s.status === "พร้อมขาย").length;
  const inspecting      = displayStocks.filter(s => s.status === "รอตรวจ").length;
  const noPricedCount   = activeStocks.filter(s => s.sellingPrice === 0).length;
  const totalStockCost  = activeStocks.reduce((a, s) => a + s.costPrice + s.shippingCost + s.otherCost, 0);
  const pendingDelivery = displayStocks.filter(s => s.deliveryStatus === "รอจัดส่ง").length;

  // Sold metrics — filter by soldAt when range is active
  const soldItems = useMemo(() => {
    const base = stocks.filter(s => s.status === "ขายแล้ว");
    return isFiltered ? base.filter(s => inRange(s.soldAt ?? s.receivedAt)) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stocks, dateFrom, dateTo, isFiltered]);

  const soldCount      = soldItems.length;
  const soldRevenue    = soldItems.reduce((a, s) => a + (s.soldPrice ?? 0), 0);
  const realizedProfit = soldItems.reduce((a, s) => a + (s.soldPrice ?? 0) - s.costPrice - s.shippingCost - s.otherCost, 0);

  const soldLabel = isFiltered ? "เครื่องขายแล้ว" : "เครื่องขายแล้ววันนี้";

  // Revenue chart — filter by date range
  const chartData = useMemo(() => {
    if (!isFiltered) return revenueData.slice(-14);
    return revenueData.filter(p => {
      if (dateFrom && p.date < dateFrom) return false;
      if (dateTo   && p.date > dateTo)   return false;
      return true;
    });
  }, [revenueData, dateFrom, dateTo, isFiltered]);

  const recentActivity = displayStocks.slice(0, 10);

  const METRICS = [
    ...(canViewFinance ? [
      { icon: DollarSign,      label: "มูลค่าสต็อกรวม",  value: `฿${fmt(totalValue)}`,       iconColor: c.gold,    sub: "เฉพาะเครื่องที่กำหนดราคาแล้ว" },
      { icon: Wallet,          label: "ต้นทุนสต็อกรวม",  value: `฿${fmt(totalStockCost)}`,   iconColor: "#ef4444", sub: "ต้นทุน + ค่าส่ง + ค่าอื่นๆ" },
    ] : []),
    { icon: Package,           label: "จำนวนเครื่องในสต็อก", value: `${activeStocks.length} เครื่อง`, iconColor: c.info,   sub: noPricedCount > 0 ? `ยังไม่กำหนดราคา ${noPricedCount} เครื่อง` : "ไม่รวมที่ขายแล้ว" },
    ...(canViewFinance ? [
      { icon: TrendingUp,      label: "กำไรคาดการณ์",    value: `฿${fmt(totalCostProfit)}`,  iconColor: "#22c55e", sub: "เฉพาะเครื่องที่กำหนดราคาแล้ว" },
      { icon: BadgeDollarSign, label: isFiltered ? "กำไรจริง" : "กำไรจริงสะสม", value: `฿${fmt(realizedProfit)}`, iconColor: "#a78bfa", sub: `รายได้รวม ฿${fmt(soldRevenue)}` },
    ] : []),
    { icon: CheckCircle,       label: "เครื่องพร้อมขาย", value: `${readyToSell} เครื่อง`,    iconColor: "#22c55e", sub: "สถานะ: พร้อมขาย" },
    { icon: Clock,             label: "เครื่องรอตรวจ",   value: `${inspecting} เครื่อง`,    iconColor: c.orange,  sub: "สถานะ: รอตรวจ" },
    { icon: ShoppingBag,       label: soldLabel,          value: `${soldCount} เครื่อง`,     iconColor: c.info,    sub: soldCount > 0 && canViewFinance ? `ยอดรวม ฿${fmt(soldRevenue)}` : "" },
    { icon: Truck,             label: "รอจัดส่ง",         value: `${pendingDelivery} เครื่อง`, iconColor: "#f59e0b", sub: "ขายแล้วยังไม่ได้ส่ง" },
  ];

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Dashboard" subtitle="ภาพรวมสต็อก" />

      <div style={{ paddingTop: 24, overflowX: "hidden" }} className="px-3 md:px-6">

        {/* Enable notifications — must be a user gesture for iOS */}
        {(notifStatus === "default" || notifStatus === "denied") && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, background: `${c.gold}14`, border: `1px solid ${c.gold}55`, borderRadius: 14, padding: "12px 16px", marginBottom: 20 }}>
            <Bell size={20} color={c.gold} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>เปิดการแจ้งเตือน</p>
              <p style={{ color: c.text2, fontSize: 12, margin: "2px 0 0" }}>
                {notifStatus === "denied" ? "ถูกปิดอยู่ — เปิดในตั้งค่า iOS แล้วลองใหม่" : "รับแจ้งเมื่อมีการขาย / เพิ่มเครื่อง"}
              </p>
            </div>
            {notifStatus === "default" && (
              <button
                onClick={enableNotifications}
                style={{ background: c.gold, border: "none", borderRadius: 10, padding: "8px 14px", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", touchAction: "manipulation" }}
              >
                เปิด
              </button>
            )}
          </div>
        )}

        {/* Date Preset Bar */}
        <div style={{ background: c.card, borderRadius: 16, padding: "12px 16px", marginBottom: 20, border: `1px solid ${c.border}`, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Calendar size={15} color={c.text3} style={{ flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setPreset(p.value)}
                style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 13, cursor: "pointer",
                  border: `1px solid ${preset === p.value ? c.gold : c.border}`,
                  background: preset === p.value ? `${c.gold}18` : "transparent",
                  color: preset === p.value ? c.gold : c.text2,
                  fontWeight: preset === p.value ? 700 : 400,
                  transition: "all 150ms",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {preset === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
              <input
                type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ background: c.card2, border: `1px solid ${customFrom ? c.gold : c.border}`, borderRadius: 8, padding: "5px 10px", color: customFrom ? c.text : c.text3, fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
              />
              <span style={{ color: c.text3, fontSize: 12 }}>–</span>
              <input
                type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ background: c.card2, border: `1px solid ${customTo ? c.gold : c.border}`, borderRadius: 8, padding: "5px 10px", color: customTo ? c.text : c.text3, fontSize: 12, fontFamily: "inherit", outline: "none", cursor: "pointer" }}
              />
            </div>
          )}
          {isFiltered && (
            <span style={{ marginLeft: "auto", color: c.text3, fontSize: 12 }}>
              {displayStocks.length} รายการในช่วงนี้
            </span>
          )}
        </div>

        {/* Metric Cards */}
        <div style={{ display: "grid", gap: 16, marginBottom: 24 }} className="grid-cols-2 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gap: 16, marginBottom: 24 }} className={canViewFinance ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1"}>
          {canViewFinance && (
          <div className="md:col-span-2" style={{ background: c.card, borderRadius: 16, padding: 20, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>รายรับ {isFiltered ? "ในช่วงที่เลือก" : "30 วัน"}</p>
            <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>Revenue vs Profit</p>
            {chartData.length === 0 ? (
              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: c.text3, fontSize: 13 }}>ไม่มีข้อมูลในช่วงนี้</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
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
            )}
          </div>
          )}

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
          <p style={{ color: c.text, fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
            {isFiltered ? "รายการในช่วงที่เลือก" : "กิจกรรมล่าสุด"}
          </p>
          {recentActivity.length === 0 ? (
            <p style={{ color: c.text3, fontSize: 13, textAlign: "center", padding: "20px 0" }}>ไม่มีข้อมูลในช่วงนี้</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["รหัส", "รุ่น · ความจุ", "เกรด", "ราคา", ...(canViewFinance ? ["กำไร"] : []), "สถานะ", "วันที่"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${c.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((s, i) => {
                    const isSold = s.status === "ขายแล้ว";
                    const totalCost = s.costPrice + s.shippingCost + s.otherCost;
                    const price = isSold ? (s.soldPrice ?? 0) : s.sellingPrice;
                    const profit = price > 0 ? price - totalCost : null;
                    const dateLabel = isSold && s.soldAt ? `ขาย ${fmtDate(s.soldAt)}` : fmtDate(s.receivedAt);
                    return (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => router.push(`/stock/inventory/${s.id}`)}
                        style={{ borderBottom: `1px solid ${c.border}`, cursor: "pointer" }}
                        onMouseEnter={e => (e.currentTarget.style.background = c.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "12px 12px", color: c.gold, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.id}</td>
                        <td style={{ padding: "12px 12px", color: c.text, fontSize: 13 }}>
                          {s.model}
                          {s.storage && <span style={{ color: c.text3, fontSize: 11, marginLeft: 4 }}>· {s.storage}</span>}
                        </td>
                        <td style={{ padding: "12px 12px" }}><span style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>{s.grade}</span></td>
                        <td style={{ padding: "12px 12px", color: c.text, fontSize: 13, fontWeight: 600 }}>
                          {price > 0 ? `฿${fmt(price)}` : <span style={{ color: c.text3 }}>—</span>}
                          {isSold && <span style={{ color: c.text3, fontSize: 10, display: "block", fontWeight: 400 }}>ราคาขายจริง</span>}
                        </td>
                        {canViewFinance && (
                          <td style={{ padding: "12px 12px", fontSize: 13, fontWeight: 600, color: profit == null ? c.text3 : profit >= 0 ? "#22c55e" : "#ef4444" }}>
                            {profit == null ? <span style={{ color: c.text3 }}>—</span> : `฿${fmt(profit)}`}
                          </td>
                        )}
                        <td style={{ padding: "12px 12px" }}><StockStatusBadge status={s.status} /></td>
                        <td style={{ padding: "12px 12px", color: c.text3, fontSize: 12, whiteSpace: "nowrap" }}>{dateLabel}</td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
