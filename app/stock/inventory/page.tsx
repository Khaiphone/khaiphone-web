"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, Printer, Search, X, Eye, Edit2, MoreHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Package, TrendingUp, DollarSign, CheckCircle, Clock, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import StockStatusBadge, { GradeBadge } from "@/components/stock/StatusBadge";
import StockDetailDrawer from "@/components/stock/StockDetailDrawer";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchStockItems } from "@/app/actions/stocks";
import { STOCK_STATUS_COLORS } from "@/lib/stock/mockData";
import type { StockItem, StockStatus } from "@/lib/stock/types";

const STATUSES: Array<{ value: StockStatus | "all"; label: string }> = [
  { value: "all",               label: "ทั้งหมด"            },
  { value: "รอตรวจ",           label: "รอตรวจ"             },
  { value: "พร้อมขาย",         label: "พร้อมขาย"           },
  { value: "ลงขายแล้ว",        label: "ลงขายแล้ว"          },
  { value: "จองแล้ว",          label: "จองแล้ว"            },
  { value: "ขายแล้ว",          label: "ขายแล้ว"            },
  { value: "ส่งคืน",           label: "ส่งคืน"             },
  { value: "ตีกลับ/ไม่รับซื้อ", label: "ตีกลับ/ไม่รับซื้อ" },
];

const PAGE_SIZE = 10;
function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) { return new Date(s).toLocaleDateString("th-TH", { month: "short", day: "numeric", year: "numeric" }); }

export default function StockInventoryPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StockStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StockItem | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Filters
  const [filterModel, setFilterModel] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");

  useEffect(() => {
    fetchStockItems().then(data => { setStocks(data); setLoading(false); });
  }, []);

  const models = useMemo(() => [...new Set(stocks.map(s => s.model))].sort(), [stocks]);

  const filtered = useMemo(() => {
    return stocks.filter(s => {
      if (tab !== "all" && s.status !== tab) return false;
      if (query) {
        const q = query.toLowerCase();
        const match = s.id.toLowerCase().includes(q) || s.model.toLowerCase().includes(q) ||
          s.imei.includes(q) || s.serial.toLowerCase().includes(q) ||
          s.sellerName.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterModel && s.model !== filterModel) return false;
      if (filterGrade && s.grade !== filterGrade) return false;
      if (filterChannel && s.sourceChannel !== filterChannel) return false;
      if (filterPriceMin && s.sellingPrice < parseInt(filterPriceMin)) return false;
      if (filterPriceMax && s.sellingPrice > parseInt(filterPriceMax)) return false;
      return true;
    });
  }, [stocks, tab, query, filterModel, filterGrade, filterChannel, filterPriceMin, filterPriceMax]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function clearFilters() {
    setQuery(""); setFilterModel(""); setFilterGrade(""); setFilterChannel(""); setFilterPriceMin(""); setFilterPriceMax("");
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: stocks.length };
    stocks.forEach(s => { c[s.status] = (c[s.status] || 0) + 1; });
    return c;
  }, [stocks]);

  const pricedActive = stocks.filter(s => s.sellingPrice > 0 && s.status !== "ขายแล้ว");
  const totalValue  = pricedActive.reduce((a, s) => a + s.sellingPrice, 0);
  const totalProfit = pricedActive.reduce((a, s) => a + (s.sellingPrice - s.costPrice - s.shippingCost - s.otherCost), 0);
  const noPrice     = stocks.filter(s => s.sellingPrice === 0 && s.status !== "ขายแล้ว" && s.status !== "ส่งคืน" && s.status !== "ตีกลับ/ไม่รับซื้อ").length;
  const readyToSell = counts["พร้อมขาย"] ?? 0;
  const inspecting  = counts["รอตรวจ"] ?? 0;
  const listed      = counts["ลงขายแล้ว"] ?? 0;
  const sold        = counts["ขายแล้ว"] ?? 0;

  const METRICS = [
    { icon: DollarSign,  label: "มูลค่าสต็อกรวม",     value: `฿${fmt(totalValue)}`,      iconColor: c.gold,    sub: "เฉพาะเครื่องที่กำหนดราคาแล้ว" },
    { icon: Package,     label: "เครื่องในสต็อก",      value: `${stocks.length} เครื่อง`, iconColor: c.info,    sub: noPrice > 0 ? `ยังไม่กำหนดราคา ${noPrice} เครื่อง` : "รวมทุกสถานะ" },
    { icon: TrendingUp,  label: "กำไรคาดการณ์",        value: `฿${fmt(totalProfit)}`,     iconColor: "#22c55e", sub: "เฉพาะเครื่องที่กำหนดราคาแล้ว" },
    { icon: CheckCircle, label: "เครื่องพร้อมขาย",     value: `${readyToSell} เครื่อง`,  iconColor: "#22c55e", sub: "สถานะ: พร้อมขาย" },
    { icon: Clock,       label: "รอตรวจ",              value: `${inspecting} เครื่อง`,   iconColor: c.orange,  sub: "ยังไม่ผ่านตรวจ" },
    { icon: ShoppingBag, label: "ขายแล้ว",             value: `${sold} เครื่อง`,         iconColor: c.purple,  sub: `ลงขาย ${listed}` },
  ];

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Stock Management" subtitle="จัดการสต็อกสินค้า">
        <button
          onClick={() => router.push("/stock/inventory/add")}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          <Plus size={16} /> เพิ่มสินค้าเข้าสต็อก
        </button>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}>
          <Download size={15} /> Export CSV
        </button>
        <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}>
          <Printer size={15} /> พิมพ์รายงาน
        </button>
      </StockTopbar>

      <div style={{ padding: 24 }}>
        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
          {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        {/* Filter Bar */}
        <div style={{ background: c.card, borderRadius: 16, padding: "16px 20px", marginBottom: 16, border: `1px solid ${c.border}` }}>
          {/* Row 1 */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
            <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
              <input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="ค้นหา IMEI, Serial, รุ่น, ลูกค้า..."
                style={{ width: "100%", background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: "9px 12px 9px 34px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {[
              { label: "รุ่น", value: filterModel, onChange: (v: string) => setFilterModel(v), options: models },
              { label: "เกรด", value: filterGrade, onChange: (v: string) => setFilterGrade(v), options: ["A", "A-", "B+", "B", "B-", "C"] },
              { label: "ช่องทาง", value: filterChannel, onChange: (v: string) => setFilterChannel(v), options: ["หน้าร้าน", "เว็บไซต์", "LINE OA", "Facebook", "Shopee", "โทรศัพท์"] },
            ].map(({ label, value, onChange, options }) => (
              <select key={label} value={value} onChange={e => { onChange(e.target.value); setPage(1); }}
                style={{ flex: "0 1 160px", background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: "9px 12px", color: value ? c.text : c.text3, fontSize: 13, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
              >
                <option value="">{label}: ทั้งหมด</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ))}
          </div>
          {/* Row 2 */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} placeholder="ราคาต่ำสุด (฿)" type="number"
              style={{ flex: "0 1 140px", background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: "9px 12px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            <input value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} placeholder="ราคาสูงสุด (฿)" type="number"
              style={{ flex: "0 1 140px", background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10, padding: "9px 12px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none" }} />
            <button onClick={clearFilters} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 13, cursor: "pointer" }}>
              <X size={14} /> ล้างตัวกรอง
            </button>
            <button style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              <Search size={14} /> ค้นหา
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
          {STATUSES.map(({ value, label }) => {
            const count = counts[value] ?? 0;
            const active = tab === value;
            const color = value !== "all" ? STOCK_STATUS_COLORS[value] : c.gold;
            return (
              <button key={value} onClick={() => { setTab(value); setPage(1); }}
                style={{
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 16px", borderRadius: 20, border: `1px solid ${active ? color : c.border}`,
                  background: active ? `${color}18` : c.card,
                  color: active ? color : c.text2, fontSize: 13, fontWeight: active ? 700 : 400,
                  cursor: "pointer", whiteSpace: "nowrap", transition: "all 150ms",
                }}>
                {label}
                <span style={{ background: active ? color : c.card2, color: active ? (c.dark ? "#000" : "#fff") : c.text3, borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700 }}>
                  {value === "all" ? stocks.length : count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, overflow: "hidden", marginBottom: 16 }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: c.text3 }}>กำลังโหลด...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
              <p style={{ margin: 0 }}>ไม่พบสินค้าในสต็อก</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: c.card2 }}>
                    {["", "รูป", "รหัสสต็อก", "รุ่น", "ความจุ / สี", "IMEI / Serial", "เกรด", "ต้นทุน", "ราคาขาย", "กำไร", "สถานะ", "ช่องทาง", "วันรับเข้า", ""].map((h, i) => (
                      <th key={i} style={{ padding: "12px 14px", textAlign: "left", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {paginated.map((s, i) => {
                      const hasPrice = s.sellingPrice > 0;
                      const profit = hasPrice ? s.sellingPrice - s.costPrice - s.shippingCost - s.otherCost : null;
                      const isChecked = checked.has(s.id);
                      return (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => setSelected(s)}
                          style={{
                            borderBottom: `1px solid ${c.border}`,
                            cursor: "pointer",
                            background: isChecked ? c.goldBg : "transparent",
                            transition: "background 150ms",
                          }}
                          whileHover={{ backgroundColor: c.goldBg }}
                        >
                          <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={isChecked} onChange={e => {
                              const next = new Set(checked);
                              e.target.checked ? next.add(s.id) : next.delete(s.id);
                              setChecked(next);
                            }} style={{ cursor: "pointer" }} />
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            {s.photos[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.photos[0]} alt="" style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 8 }} />
                            ) : (
                              <div style={{ width: 40, height: 40, background: c.card2, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📱</div>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", color: c.gold, fontSize: 12, fontFamily: "monospace", whiteSpace: "nowrap" }}>{s.id}</td>
                          <td style={{ padding: "10px 14px", color: c.text, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{s.model}</td>
                          <td style={{ padding: "10px 14px" }}>
                            <p style={{ color: c.text, fontSize: 13, margin: 0, whiteSpace: "nowrap" }}>{s.storage}</p>
                            <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{s.color}</p>
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <p style={{ color: c.text2, fontSize: 12, fontFamily: "monospace", margin: 0 }}>{s.imei}</p>
                            <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{s.serial}</p>
                          </td>
                          <td style={{ padding: "10px 14px" }}><GradeBadge grade={s.grade} /></td>
                          <td style={{ padding: "10px 14px", color: c.text2, fontSize: 13, whiteSpace: "nowrap" }}>฿{fmt(s.costPrice)}</td>
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                            {hasPrice
                              ? <span style={{ color: c.text, fontSize: 13, fontWeight: 600 }}>฿{fmt(s.sellingPrice)}</span>
                              : <span style={{ color: "#f97316", fontSize: 11, fontWeight: 600, background: "rgba(249,115,22,0.1)", padding: "2px 8px", borderRadius: 6 }}>ยังไม่กำหนด</span>
                            }
                          </td>
                          <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                            {profit !== null
                              ? <span style={{ color: profit >= 0 ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 600 }}>฿{fmt(profit)}</span>
                              : <span style={{ color: c.text3, fontSize: 12 }}>—</span>
                            }
                          </td>
                          <td style={{ padding: "10px 14px" }}><StockStatusBadge status={s.status} /></td>
                          <td style={{ padding: "10px 14px", color: c.text2, fontSize: 12, whiteSpace: "nowrap" }}>{s.sourceChannel}</td>
                          <td style={{ padding: "10px 14px", color: c.text3, fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(s.receivedAt)}</td>
                          <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => setSelected(s)} style={{ background: "none", border: "none", color: c.text3, cursor: "pointer", padding: 4, display: "flex" }} title="ดูรายละเอียด"><Eye size={15} /></button>
                              <button style={{ background: "none", border: "none", color: c.text3, cursor: "pointer", padding: 4, display: "flex" }} title="แก้ไข"><Edit2 size={15} /></button>
                              <button style={{ background: "none", border: "none", color: c.text3, cursor: "pointer", padding: 4, display: "flex" }}><MoreHorizontal size={15} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ color: c.text3, fontSize: 13 }}>แสดง {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} จาก {filtered.length} รายการ</p>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "8px 12px", borderRadius: 8, background: c.card, border: `1px solid ${c.border}`, color: c.text2, cursor: page === 1 ? "not-allowed" : "pointer", display: "flex", opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    style={{ padding: "8px 13px", borderRadius: 8, background: page === p ? c.gold : c.card, border: `1px solid ${page === p ? c.gold : c.border}`, color: page === p ? "#000" : c.text2, cursor: "pointer", fontWeight: page === p ? 700 : 400 }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "8px 12px", borderRadius: 8, background: c.card, border: `1px solid ${c.border}`, color: c.text2, cursor: page === totalPages ? "not-allowed" : "pointer", display: "flex", opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} />
          <StockDetailDrawer
            item={selected}
            onClose={() => setSelected(null)}
            onUpdate={updated => {
              setStocks(prev => prev.map(s => s.id === updated.id ? updated : s));
              setSelected(updated);
            }}
          />
        </>
      )}
    </div>
  );
}
