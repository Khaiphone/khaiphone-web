"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { fetchStockItems } from "@/app/actions/stock";
import type { StockItem } from "@/app/actions/stock";

const BG = "var(--admin-bg)";
const CARD = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT = "var(--admin-text)";
const TEXT2 = "var(--admin-text2)";
const TEXT3 = "var(--admin-text3)";
const GOLD = "var(--admin-gold)";

type Period = "month" | "3months" | "year" | "all";
const PERIOD_TABS: Array<{ value: Period; label: string }> = [
  { value: "month",   label: "เดือนนี้"  },
  { value: "3months", label: "3 เดือน"   },
  { value: "year",    label: "ปีนี้"     },
  { value: "all",     label: "ทั้งหมด"   },
];

function periodStart(p: Period): Date | null {
  const now = new Date();
  if (p === "all") return null;
  if (p === "month")   return new Date(now.getFullYear(), now.getMonth(), 1);
  if (p === "3months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (p === "year")    return new Date(now.getFullYear(), 0, 1);
  return null;
}

function fmtDate(iso: string) {
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

export default function AccountingPage() {
  const router  = useRouter();
  const [items,   setItems]   = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period,  setPeriod]  = useState<Period>("month");

  useEffect(() => {
    fetchStockItems().then(d => { setItems(d); setLoading(false); });
  }, []);

  const start = periodStart(period);

  // รายการที่รับซื้อมา (ทุกเครื่องที่ completed ในช่วงเวลา)
  const boughtInPeriod = useMemo(() =>
    items.filter(x => !start || new Date(x.completedAt) >= start),
    [items, start]);

  // รายการที่ขายออกแล้วในช่วงเวลา (ใช้ sell_date)
  const soldInPeriod = useMemo(() =>
    items.filter(x => x.stockStatus === "sold" && x.sellDate && (!start || new Date(x.sellDate + "T00:00:00") >= start))
      .sort((a, b) => (b.sellDate ?? "").localeCompare(a.sellDate ?? "")),
    [items, start]);

  const totalCost    = boughtInPeriod.reduce((s, x) => s + x.costPrice, 0);
  const totalRevenue = soldInPeriod.reduce((s, x) => s + (x.sellPrice ?? 0), 0);
  const soldCost     = soldInPeriod.reduce((s, x) => s + x.costPrice, 0);
  const netProfit    = totalRevenue - soldCost;
  const inventoryValue = items
    .filter(x => x.stockStatus !== "sold")
    .reduce((s, x) => s + x.costPrice, 0);

  const summaryCards = [
    { label: "รับซื้อมา (ต้นทุน)", value: totalCost,      color: "#EF4444", note: `${boughtInPeriod.length} เครื่อง` },
    { label: "ขายออกได้",          value: totalRevenue,   color: "#059669", note: `${soldInPeriod.length} เครื่อง`    },
    { label: "กำไรสุทธิ",         value: netProfit,      color: netProfit >= 0 ? "#059669" : "#EF4444", note: "จากเครื่องที่ขายแล้ว" },
    { label: "มูลค่าในมือ",        value: inventoryValue, color: GOLD,      note: "รอขาย + ซ่อม"  },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 16px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0, flex: 1 }}>บัญชี</h1>
          <Link
            href="/stock/finance"
            style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, background: CARD, color: TEXT2, fontSize: 11, fontWeight: 600, textDecoration: "none" }}
          >
            <ExternalLink size={11} /> ดูบัญชีเต็ม
          </Link>
        </div>

        {/* Period tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {PERIOD_TABS.map(({ value, label }) => {
            const active = period === value;
            return (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: active ? 700 : 500, border: active ? "1px solid rgba(184,134,11,0.3)" : `1px solid ${BORDER}`, background: active ? 'var(--admin-gold-bg)' : CARD, color: active ? 'var(--admin-gold-text)' : TEXT2, cursor: "pointer" }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <p style={{ color: TEXT3, textAlign: "center", padding: "40px 0" }}>กำลังโหลด...</p>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
              {summaryCards.map(({ label, value, color, note }) => (
                <div key={label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px" }}>
                  <p style={{ color: TEXT3, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" }}>{label}</p>
                  <p style={{ color, fontSize: 22, fontWeight: 700, margin: "0 0 4px", fontVariantNumeric: "tabular-nums" }}>
                    {value < 0 ? "-" : ""}฿{Math.abs(value).toLocaleString("th-TH")}
                  </p>
                  <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>{note}</p>
                </div>
              ))}
            </div>

            {/* Sold items table */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ color: TEXT, fontSize: 14, fontWeight: 700, margin: 0 }}>รายการขายออก</p>
              </div>

              {soldInPeriod.length === 0 ? (
                <p style={{ color: TEXT3, textAlign: "center", padding: "32px 0", fontSize: 14 }}>ยังไม่มีรายการขายในช่วงนี้</p>
              ) : (
                soldInPeriod.map((item, i) => {
                  const profit = (item.sellPrice ?? 0) - item.costPrice;
                  const positive = profit >= 0;
                  return (
                    <div
                      key={item.id}
                      style={{ padding: "12px 16px", borderBottom: i < soldInPeriod.length - 1 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: TEXT, fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{item.model} · {item.storage}</p>
                        <p style={{ color: TEXT3, fontSize: 11, margin: 0 }}>
                          ต้นทุน ฿{item.costPrice.toLocaleString("th-TH")} · ขาย ฿{(item.sellPrice ?? 0).toLocaleString("th-TH")}
                          {item.sellDate ? ` · ${fmtDate(item.sellDate)}` : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {positive
                          ? <TrendingUp size={14} color="#059669" />
                          : <TrendingDown size={14} color="#DC2626" />
                        }
                        <span style={{ fontSize: 13, fontWeight: 700, color: positive ? "#059669" : "#DC2626", fontVariantNumeric: "tabular-nums" }}>
                          {positive ? "+" : ""}฿{profit.toLocaleString("th-TH")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Footer total */}
              {soldInPeriod.length > 0 && (
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${BORDER}`, background: BG, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ color: TEXT2, fontSize: 13, fontWeight: 600, margin: 0 }}>กำไรรวม {soldInPeriod.length} เครื่อง</p>
                  <p style={{ color: netProfit >= 0 ? "#059669" : "#DC2626", fontSize: 15, fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
                    {netProfit >= 0 ? "+" : ""}฿{netProfit.toLocaleString("th-TH")}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
