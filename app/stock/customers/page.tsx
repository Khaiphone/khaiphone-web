"use client";

import { useState, useEffect, useMemo } from "react";
import { Users, DollarSign, Search, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockCustomers } from "@/app/actions/stocks";
import type { StockCustomer } from "@/app/actions/stocks";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

const CHANNEL_COLOR: Record<string, string> = {
  "หน้าร้าน": "#22c55e", "เว็บไซต์": "#3b82f6", "LINE OA": "#22c55e",
  "Facebook": "#3b82f6", "Shopee": "#f97316", "โทรศัพท์": "#a855f7",
};

export default function CustomersPage() {
  const c = useThemeColors();
  const [customers, setCustomers] = useState<StockCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchStockCustomers().then(d => { setCustomers(d); setLoading(false); });
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

  const totalPaid = filtered.reduce((a, c) => a + c.totalPaid, 0);
  const totalItems = filtered.reduce((a, c) => a + c.totalItems, 0);
  const repeatCustomers = filtered.filter(c => c.totalItems >= 2).length;

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Customers" subtitle="ลูกค้าที่ขายเครื่องให้เรา" />

      <div style={{ padding: 24 }}>
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
                    {["#", "ชื่อ", "เบอร์โทร", "จำนวนครั้ง", "ยอดรวมที่ขาย", "ราคาเฉลี่ย", "ช่องทาง", "ล่าสุด"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((customer, i) => (
                      <motion.tr
                        key={customer.phone}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        style={{ borderBottom: `1px solid ${c.border}` }}
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
                        <td style={{ padding: "12px 14px", color: c.text2, fontSize: 13, fontFamily: "monospace" }}>{customer.phone}</td>
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
                      </motion.tr>
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
