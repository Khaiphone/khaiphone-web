"use client";

import { useState, useEffect, useMemo } from "react";
import { ShoppingBag, TrendingUp, DollarSign, Search, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import { GradeBadge } from "@/components/stock/StatusBadge";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchSoldItems } from "@/app/actions/stocks";
import type { SoldItem } from "@/app/actions/stocks";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function SalesPage() {
  const c = useThemeColors();
  const [items, setItems] = useState<SoldItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  useEffect(() => {
    fetchSoldItems().then(d => { setItems(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.model.toLowerCase().includes(q) ||
        s.buyerName.toLowerCase().includes(q) ||
        s.buyerPhone.includes(q) ||
        s.id.toLowerCase().includes(q),
      );
    }
    if (dateFilter !== "all") {
      const now = new Date();
      list = list.filter(s => {
        if (!s.soldAt) return false;
        const d = new Date(s.soldAt);
        if (dateFilter === "today") return d.toDateString() === now.toDateString();
        if (dateFilter === "week") {
          const week = new Date(now); week.setDate(now.getDate() - 7);
          return d >= week;
        }
        if (dateFilter === "month") {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        return true;
      });
    }
    return list;
  }, [items, search, dateFilter]);

  const totalRevenue = filtered.reduce((a, s) => a + s.soldPrice, 0);
  const totalProfit = filtered.reduce((a, s) => a + s.profit, 0);
  const avgProfit = filtered.length > 0 ? Math.round(totalProfit / filtered.length) : 0;

  function handleExport() {
    const header = "รหัสสต็อก,รุ่น,เกรด,ต้นทุนรวม,ราคาขาย,กำไร,ชื่อผู้ซื้อ,เบอร์,ช่องทาง,วันที่ขาย\n";
    const rows = filtered.map(s =>
      [s.id, s.model, s.grade, s.costPrice + s.shippingCost + s.otherCost, s.soldPrice, s.profit, s.buyerName, s.buyerPhone, s.sourceChannel, s.soldAt].join(",")
    ).join("\n");
    const blob = new Blob(["﻿" + header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `sales-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  }

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Sales" subtitle="ประวัติการขาย">
        <button
          onClick={handleExport}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}
        >
          <Download size={14} /> Export CSV
        </button>
      </StockTopbar>

      <div style={{ paddingTop: 24, paddingBottom: 24 }} className="px-3 md:px-6">
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <MetricCard icon={ShoppingBag} label="เครื่องที่ขายแล้ว"  value={`${filtered.length} เครื่อง`} iconColor={c.gold}    sub="ตามตัวกรองที่เลือก" />
          <MetricCard icon={DollarSign}  label="รายรับรวม"           value={`฿${fmt(totalRevenue)}`}       iconColor="#22c55e"   sub="ราคาขายรวมทั้งหมด" />
          <MetricCard icon={TrendingUp}  label="กำไรรวม"             value={`฿${fmt(totalProfit)}`}        iconColor={totalProfit >= 0 ? "#22c55e" : "#ef4444"} sub="หลังหักต้นทุนทั้งหมด" />
          <MetricCard icon={TrendingUp}  label="กำไรเฉลี่ย/เครื่อง"  value={`฿${fmt(avgProfit)}`}          iconColor={c.info}    sub="เฉลี่ยต่อเครื่องที่ขาย" />
        </div>

        {/* Filters */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px 20px", marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 220px" }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหารุ่น, ชื่อผู้ซื้อ, เบอร์, รหัสสต็อก..."
              style={{ width: "100%", background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: "9px 12px 9px 34px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["all", "today", "week", "month"] as const).map(v => (
              <button key={v} onClick={() => setDateFilter(v)}
                style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${dateFilter === v ? c.gold : c.border}`, background: dateFilter === v ? c.goldBg : c.card2, color: dateFilter === v ? c.gold : c.text2, fontSize: 12, fontWeight: dateFilter === v ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
                {v === "all" ? "ทั้งหมด" : v === "today" ? "วันนี้" : v === "week" ? "7 วัน" : "เดือนนี้"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
              <p style={{ margin: 0, fontSize: 14 }}>ยังไม่มีรายการขาย</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: c.card2 }}>
                    {["รหัสสต็อก", "รุ่น / สเปค", "เกรด", "ต้นทุนรวม", "ราคาขาย", "กำไร", "ผู้ซื้อ", "ช่องทาง", "วันที่ขาย"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((s, i) => {
                      const totalCost = s.costPrice + s.shippingCost + s.otherCost;
                      return (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                          style={{ borderBottom: `1px solid ${c.border}` }}
                        >
                          <td style={{ padding: "12px 14px", color: c.gold, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.id}</td>
                          <td style={{ padding: "12px 14px" }}>
                            <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>{s.model}</p>
                            <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{[s.storage, s.color].filter(Boolean).join(" · ")}</p>
                          </td>
                          <td style={{ padding: "12px 14px" }}><GradeBadge grade={s.grade} /></td>
                          <td style={{ padding: "12px 14px", color: c.text2, fontSize: 13, whiteSpace: "nowrap" }}>฿{fmt(totalCost)}</td>
                          <td style={{ padding: "12px 14px", color: c.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>฿{fmt(s.soldPrice)}</td>
                          <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                            <span style={{ color: s.profit >= 0 ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700 }}>
                              {s.profit >= 0 ? "+" : ""}฿{fmt(s.profit)}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <p style={{ color: c.text, fontSize: 13, margin: 0 }}>{s.buyerName || "—"}</p>
                            <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{s.buyerPhone}</p>
                          </td>
                          <td style={{ padding: "12px 14px", color: c.text2, fontSize: 12 }}>{s.sourceChannel}</td>
                          <td style={{ padding: "12px 14px", color: c.text3, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(s.soldAt)}</td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ color: c.text3, fontSize: 12, textAlign: "center", marginTop: 16 }}>
          แสดง {filtered.length} จาก {items.length} รายการ
        </p>
      </div>
    </div>
  );
}
