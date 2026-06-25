"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { Users, DollarSign, Search, Phone, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockCustomers, fetchStockCustomerHistory } from "@/app/actions/stocks";
import { cacheGet, cacheSet } from "@/app/stock/cache";
import type { StockCustomer, StockCustomerHistoryItem } from "@/app/actions/stocks";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

type SortKey = "name" | "phone" | "totalItems" | "totalPaid" | "avgPrice" | "channel" | "lastSeen";
const COLUMNS: { label: string; key?: SortKey }[] = [
  { label: "#" },
  { label: "ชื่อ", key: "name" },
  { label: "เบอร์โทร", key: "phone" },
  { label: "จำนวนครั้ง", key: "totalItems" },
  { label: "ยอดรวมที่ขาย", key: "totalPaid" },
  { label: "ราคาเฉลี่ย", key: "avgPrice" },
  { label: "ช่องทาง", key: "channel" },
  { label: "ล่าสุด", key: "lastSeen" },
  { label: "" },
];

const CHANNEL_COLOR: Record<string, string> = {
  "หน้าร้าน": "#22c55e", "เว็บไซต์": "#3b82f6", "LINE OA": "#22c55e",
  "Facebook": "#3b82f6", "Shopee": "#f97316", "โทรศัพท์": "#a855f7",
};

export default function CustomersPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [customers, setCustomers] = useState<StockCustomer[]>(() => cacheGet<StockCustomer[]>("stock:customers") ?? []);
  const [loading, setLoading] = useState(() => cacheGet<StockCustomer[]>("stock:customers") === null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [historyMap, setHistoryMap] = useState<Record<string, StockCustomerHistoryItem[]>>({});
  const [sortKey, setSortKey] = useState<SortKey>("totalItems");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function clickSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" || k === "phone" || k === "channel" ? "asc" : "desc"); }
  }

  function toggleRow(phone: string) {
    setExpanded(prev => prev === phone ? null : phone);
    if (!historyMap[phone]) {
      fetchStockCustomerHistory(phone).then(h => setHistoryMap(m => ({ ...m, [phone]: h })));
    }
  }

  useEffect(() => {
    fetchStockCustomers().then(d => { setCustomers(d); cacheSet("stock:customers", d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.channel.toLowerCase().includes(q),
    );
  }, [customers, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "name":    cmp = a.name.localeCompare(b.name, "th"); break;
        case "phone":   cmp = a.phone.localeCompare(b.phone); break;
        case "channel": cmp = (a.channel || "").localeCompare(b.channel || "", "th"); break;
        case "lastSeen":cmp = (a.lastSeen || "").localeCompare(b.lastSeen || ""); break;
        default:        cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalPaid = filtered.reduce((a, c) => a + c.totalPaid, 0);
  const totalItems = filtered.reduce((a, c) => a + c.totalItems, 0);
  const repeatCustomers = filtered.filter(c => c.totalItems >= 2).length;

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Customers" subtitle="ลูกค้าที่ขายเครื่องให้เรา" />

      <div style={{ paddingTop: 24, paddingBottom: 24 }} className="px-3 md:px-6">
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <MetricCard icon={Users}     label="ลูกค้าทั้งหมด"      value={`${filtered.length} คน`}       iconColor={c.gold}    sub="เฉพาะที่มีเบอร์โทร" />
          <MetricCard icon={DollarSign} label="ยอดรับซื้อรวม"     value={`฿${fmt(totalPaid)}`}           iconColor="#22c55e"   sub="ต้นทุนที่จ่ายออกไป" />
          <MetricCard icon={Phone}      label="เครื่องที่รับซื้อ"  value={`${totalItems} เครื่อง`}        iconColor={c.info}    sub="จากลูกค้าที่กรอง" />
          <MetricCard icon={Users}      label="ลูกค้าประจำ"       value={`${repeatCustomers} คน`}        iconColor={c.purple}  sub="ขายให้เรา 2 ครั้งขึ้นไป" />
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ, เบอร์โทร, ช่องทาง..."
            style={{ width: "100%", background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: "10px 12px 10px 36px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Table */}
        <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
              <p style={{ margin: 0 }}>ยังไม่มีข้อมูลลูกค้า</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: c.card2 }}>
                    {COLUMNS.map(col => {
                      const active = col.key && sortKey === col.key;
                      return (
                        <th
                          key={col.label}
                          onClick={col.key ? () => clickSort(col.key!) : undefined}
                          style={{ padding: "12px 14px", textAlign: "left", color: active ? c.gold : c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", cursor: col.key ? "pointer" : "default", userSelect: "none" }}
                        >
                          {col.label}{active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {sorted.map((customer, i) => (
                      <Fragment key={customer.phoneKey}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        onClick={() => toggleRow(customer.phoneKey)}
                        style={{ borderBottom: `1px solid ${c.border}`, cursor: "pointer", background: expanded === customer.phoneKey ? c.card2 : "transparent" }}
                      >
                        <td style={{ padding: "12px 14px", color: c.text3, fontSize: 12 }}>{i + 1}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: "50%", background: c.goldBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <span style={{ color: c.gold, fontSize: 13, fontWeight: 700 }}>{customer.name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{customer.name}</p>
                              {customer.totalItems >= 2 && (
                                <span style={{ fontSize: 10, color: c.gold, background: c.goldBg, padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>ลูกค้าประจำ</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px", color: c.text2, fontSize: 13, fontFamily: "monospace" }}>{customer.phoneKey || customer.phone}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ color: customer.totalItems >= 3 ? c.gold : c.text, fontSize: 14, fontWeight: 700 }}>{customer.totalItems}</span>
                          <span style={{ color: c.text3, fontSize: 12 }}> เครื่อง</span>
                        </td>
                        <td style={{ padding: "12px 14px", color: c.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>฿{fmt(customer.totalPaid)}</td>
                        <td style={{ padding: "12px 14px", color: c.text2, fontSize: 13, whiteSpace: "nowrap" }}>฿{fmt(customer.avgPrice)}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                            background: `${CHANNEL_COLOR[customer.channel] ?? c.info}18`,
                            color: CHANNEL_COLOR[customer.channel] ?? c.info,
                          }}>
                            {customer.channel || "ไม่ระบุ"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: c.text3, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(customer.lastSeen)}</td>
                        <td style={{ padding: "12px 14px", width: 28 }}>
                          <ChevronRight size={16} style={{ color: c.text3, transform: expanded === customer.phoneKey ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
                        </td>
                      </motion.tr>
                      {expanded === customer.phoneKey && (
                        <tr style={{ background: c.bg }}>
                          <td colSpan={9} style={{ padding: 0 }}>
                            <div style={{ padding: "4px 14px 14px 58px" }}>
                              {!historyMap[customer.phoneKey] ? (
                                <p style={{ color: c.text3, fontSize: 12, padding: "8px 0" }}>กำลังโหลด...</p>
                              ) : historyMap[customer.phoneKey].length === 0 ? (
                                <p style={{ color: c.text3, fontSize: 12, padding: "8px 0" }}>ไม่พบรายการ</p>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                  <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", margin: "4px 0 2px" }}>เครื่องที่ขายให้เรา ({historyMap[customer.phoneKey].length})</p>
                                  {historyMap[customer.phoneKey].map(h => (
                                    <div key={h.id} onClick={(e) => { e.stopPropagation(); router.push(`/stock/inventory/${h.id}`); }}
                                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", borderRadius: 9, background: c.card, border: `1px solid ${c.border}`, cursor: "pointer" }}>
                                      <div style={{ minWidth: 0 }}>
                                        <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{h.model} {h.storage}</p>
                                        <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}><span style={{ color: c.gold, fontFamily: "monospace", fontWeight: 600 }}>{h.id}</span> · {fmtDate(h.receivedAt)} · {h.status}</p>
                                        {(h.imei || h.serial) && (
                                          <p style={{ color: c.text3, fontSize: 10, margin: "1px 0 0", fontFamily: "monospace", wordBreak: "break-all" }}>
                                            {h.imei ? `IMEI ${h.imei}` : ""}{h.imei && h.serial ? " · " : ""}{h.serial ? `SN ${h.serial}` : ""}
                                          </p>
                                        )}
                                      </div>
                                      <span style={{ color: c.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>฿{fmt(h.costPrice)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ color: c.text3, fontSize: 12, textAlign: "center", marginTop: 16 }}>
          {filtered.length} จาก {customers.length} ลูกค้า
        </p>
      </div>
    </div>
  );
}
