"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, X, Phone, MapPin, FileText, Trash2, Edit2, Save, ChevronRight, Package, TrendingUp, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import MetricCard from "@/components/stock/MetricCard";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchPartners, fetchPartnerHistory, createPartner, updatePartner, deletePartner } from "@/app/actions/partners";
import type { Partner, PartnerHistoryItem } from "@/app/actions/partners";

function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s?: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}

const EMPTY_FORM = { name: "", phone: "", address: "", notes: "" };
const cleanPhone = (p?: string) => (p || "").replace(/\D/g, "");

type PSortKey = "name" | "phone" | "totalItems" | "totalRevenue" | "lastPurchase";
const PCOLUMNS: { label: string; key?: PSortKey }[] = [
  { label: "ชื่อคู่ค้า", key: "name" },
  { label: "เบอร์โทร", key: "phone" },
  { label: "จำนวนเครื่อง", key: "totalItems" },
  { label: "ยอดรวม", key: "totalRevenue" },
  { label: "ล่าสุด", key: "lastPurchase" },
  { label: "" },
];

export default function PartnersPage() {
  const c = useThemeColors();
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Partner | null>(null);
  const [history, setHistory] = useState<PartnerHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Add / Edit form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    fetchPartners().then(data => { setPartners(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setHistoryLoading(true);
    fetchPartnerHistory(selected.name).then(data => { setHistory(data); setHistoryLoading(false); });
  }, [selected]);

  const [sortKey, setSortKey] = useState<PSortKey>("totalItems");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function clickSort(k: PSortKey) {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir(k === "name" || k === "phone" ? "asc" : "desc"); }
  }

  const filtered = useMemo(() => {
    if (!query) return partners;
    const q = query.toLowerCase();
    return partners.filter(p => p.name.toLowerCase().includes(q) || cleanPhone(p.phone).includes(cleanPhone(q)) || p.phone.includes(q));
  }, [partners, query]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let cmp: number;
      switch (sortKey) {
        case "name":         cmp = a.name.localeCompare(b.name, "th"); break;
        case "phone":        cmp = cleanPhone(a.phone).localeCompare(cleanPhone(b.phone)); break;
        case "lastPurchase": cmp = (a.lastPurchase || "").localeCompare(b.lastPurchase || ""); break;
        default:             cmp = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const totalRevenue = partners.reduce((a, p) => a + p.totalRevenue, 0);
  const totalItems = partners.reduce((a, p) => a + p.totalItems, 0);
  const METRICS = [
    { icon: Users,      label: "คู่ค้าทั้งหมด",    value: `${partners.length} ราย`,    iconColor: "#a855f7", sub: "ขายส่งทั้งหมด" },
    { icon: Package,    label: "เครื่องที่ขายส่ง",  value: `${totalItems} เครื่อง`,    iconColor: "#3b82f6", sub: "รวมทุกคู่ค้า" },
    { icon: TrendingUp, label: "ยอดขายส่งรวม",      value: `฿${fmt(totalRevenue)}`,    iconColor: "#22c55e", sub: "รวมทุกคู่ค้า" },
  ];

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setShowForm(true);
  }

  function openEdit(p: Partner) {
    setEditing(p);
    setForm({ name: p.name, phone: p.phone, address: p.address, notes: p.notes });
    setFormError("");
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError("กรุณาระบุชื่อคู่ค้า"); return; }
    setSaving(true);
    setFormError("");
    const payload = { ...form, phone: cleanPhone(form.phone) }; // เก็บเบอร์เลขล้วน
    if (editing) {
      const res = await updatePartner(editing.id, payload);
      if (!res.success) { setFormError(res.error ?? "เกิดข้อผิดพลาด"); setSaving(false); return; }
      setPartners(prev => prev.map(p => p.id === editing.id ? { ...p, ...payload } : p));
      if (selected?.id === editing.id) setSelected(prev => prev ? { ...prev, ...payload } : null);
    } else {
      const res = await createPartner(payload);
      if (!res.success) { setFormError(res.error ?? "เกิดข้อผิดพลาด"); setSaving(false); return; }
      const refreshed = await fetchPartners();
      setPartners(refreshed);
    }
    setShowForm(false);
    setSaving(false);
  }

  async function handleDelete(p: Partner) {
    if (!confirm(`ลบ "${p.name}" ออกจากรายการคู่ค้า?`)) return;
    await deletePartner(p.id);
    setPartners(prev => prev.filter(x => x.id !== p.id));
    if (selected?.id === p.id) setSelected(null);
  }

  const inputSt: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: c.bg, border: `1px solid ${c.border}`,
    color: c.text, fontSize: 14, fontFamily: "inherit",
    boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="คู่ค้า" subtitle="ผู้รับซื้อสินค้าขายส่ง">
        <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
          <Plus size={16} /> เพิ่มคู่ค้า
        </button>
      </StockTopbar>

      <div style={{ paddingTop: 24, paddingBottom: 24 }} className="px-3 md:px-6">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {METRICS.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: selected && !isMobile ? "1fr 380px" : "1fr", gap: 16, alignItems: "start" }}>
          {/* Left: list */}
          <div>
            <div style={{ background: c.card, borderRadius: 12, padding: "12px 16px", marginBottom: 12, border: `1px solid ${c.border}` }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาชื่อหรือเบอร์..."
                  style={{ ...inputSt, paddingLeft: 34 }} />
              </div>
            </div>

            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: 40, textAlign: "center", color: c.text3 }}>กำลังโหลด...</div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: 60, textAlign: "center", color: c.text3 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
                  <p style={{ margin: 0 }}>ยังไม่มีคู่ค้า</p>
                </div>
              ) : isMobile ? (
                /* ── Mobile: card list ── */
                <div>
                  <AnimatePresence>
                    {sorted.map((p, i) => (
                      <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        onClick={() => setSelected(selected?.id === p.id ? null : p)}
                        style={{ borderBottom: `1px solid ${c.border}`, cursor: "pointer", background: selected?.id === p.id ? c.goldBg : "transparent", padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: c.text, fontSize: 14, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</p>
                            <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>{cleanPhone(p.phone) || "—"}</p>
                          </div>
                          <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                            <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", color: c.text3, cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => handleDelete(p)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 6, borderRadius: 6, display: "flex" }}>
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <div style={{ display: "flex", gap: 14 }}>
                            <span style={{ fontSize: 12 }}><span style={{ color: "#3b82f6", fontWeight: 700 }}>{p.totalItems}</span><span style={{ color: c.text3 }}> เครื่อง</span></span>
                            <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>฿{fmt(p.totalRevenue)}</span>
                          </div>
                          <span style={{ color: c.text3, fontSize: 11 }}>{fmtDate(p.lastPurchase)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: c.card2 }}>
                      {PCOLUMNS.map(col => {
                        const active = col.key && sortKey === col.key;
                        return (
                          <th key={col.label} onClick={col.key ? () => clickSort(col.key!) : undefined}
                            style={{ padding: "12px 16px", textAlign: "left", color: active ? c.gold : c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", cursor: col.key ? "pointer" : "default", userSelect: "none" }}>
                            {col.label}{active ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {sorted.map((p, i) => (
                        <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          onClick={() => setSelected(selected?.id === p.id ? null : p)}
                          style={{ borderBottom: `1px solid ${c.border}`, cursor: "pointer", background: selected?.id === p.id ? c.goldBg : "transparent", transition: "background 150ms" }}>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, #a855f7, #7c3aed)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{p.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{p.name}</p>
                                {p.address && <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{p.address.slice(0, 30)}{p.address.length > 30 ? "…" : ""}</p>}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", color: c.text2, fontSize: 13 }}>{cleanPhone(p.phone) || "—"}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 13 }}>{p.totalItems}</span>
                            <span style={{ color: c.text3, fontSize: 12 }}> เครื่อง</span>
                          </td>
                          <td style={{ padding: "14px 16px", color: "#22c55e", fontSize: 13, fontWeight: 700 }}>฿{fmt(p.totalRevenue)}</td>
                          <td style={{ padding: "14px 16px", color: c.text3, fontSize: 12 }}>{fmtDate(p.lastPurchase)}</td>
                          <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => openEdit(p)} style={{ background: "none", border: "none", color: c.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(p)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex" }}>
                                <Trash2 size={14} />
                              </button>
                              <ChevronRight size={14} color={selected?.id === p.id ? c.gold : c.text3} style={{ marginLeft: 2, alignSelf: "center" }} />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right: detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div key={selected.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, overflow: "hidden", position: isMobile ? "static" : "sticky", top: 24 }}>
                {/* Header */}
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #a855f7, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>{selected.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{selected.name}</p>
                      <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>คู่ค้าขายส่ง</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => openEdit(selected)} style={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: c.text2, display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                      <Edit2 size={12} /> แก้ไข
                    </button>
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", padding: 4 }}>
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Contact info */}
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${c.border}` }}>
                  <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px" }}>ข้อมูลติดต่อ</p>
                  {selected.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Phone size={13} color={c.text3} />
                      <span style={{ color: c.text2, fontSize: 13 }}>{cleanPhone(selected.phone)}</span>
                    </div>
                  )}
                  {selected.address && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                      <MapPin size={13} color={c.text3} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ color: c.text2, fontSize: 13, lineHeight: 1.5 }}>{selected.address}</span>
                    </div>
                  )}
                  {selected.notes && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <FileText size={13} color={c.text3} style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ color: c.text2, fontSize: 13, lineHeight: 1.5 }}>{selected.notes}</span>
                    </div>
                  )}
                  {!selected.phone && !selected.address && !selected.notes && (
                    <p style={{ color: c.text3, fontSize: 12, margin: 0 }}>ยังไม่มีข้อมูลติดต่อ</p>
                  )}
                </div>

                {/* Stats */}
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${c.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[
                    { label: "จำนวนเครื่อง", value: `${selected.totalItems} เครื่อง`, color: "#3b82f6" },
                    { label: "ยอดรวม", value: `฿${fmt(selected.totalRevenue)}`, color: "#22c55e" },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ background: c.card2, borderRadius: 10, padding: "10px 12px" }}>
                      <p style={{ color: c.text3, fontSize: 10, margin: "0 0 4px" }}>{label}</p>
                      <p style={{ color, fontSize: 16, fontWeight: 700, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Purchase history */}
                <div style={{ padding: "14px 20px" }}>
                  <p style={{ color: c.text3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px" }}>ประวัติการซื้อ</p>
                  {historyLoading ? (
                    <p style={{ color: c.text3, fontSize: 13, textAlign: "center", padding: "20px 0" }}>กำลังโหลด...</p>
                  ) : history.length === 0 ? (
                    <p style={{ color: c.text3, fontSize: 13, textAlign: "center", padding: "20px 0" }}>ยังไม่มีประวัติ</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" }}>
                      {history.map(h => (
                        <div key={h.id} onClick={() => router.push(`/stock/inventory/${h.id}`)}
                          style={{ background: c.card2, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                            <div>
                              <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0 }}>{h.model}</p>
                              <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>{h.storage} · {h.color} · เกรด {h.grade}</p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <p style={{ color: "#22c55e", fontSize: 13, fontWeight: 700, margin: 0 }}>฿{fmt(h.soldPrice)}</p>
                              <p style={{ color: h.profit >= 0 ? "#22c55e" : "#ef4444", fontSize: 11, margin: 0 }}>กำไร ฿{fmt(h.profit)}</p>
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: c.text3, fontSize: 11 }}>{fmtDate(h.soldAt)}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              {h.deliveryStatus && (
                                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                  color: h.deliveryStatus === "จัดส่งแล้ว" ? "#22c55e" : "#f59e0b",
                                  background: h.deliveryStatus === "จัดส่งแล้ว" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)" }}>
                                  {h.deliveryStatus}
                                </span>
                              )}
                              <ChevronRight size={14} color={c.text3} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${c.border}` }}>
            <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 20px" }}>{editing ? "แก้ไขคู่ค้า" : "เพิ่มคู่ค้าใหม่"}</p>

            {[
              { label: "ชื่อคู่ค้า *", field: "name" as const, placeholder: "ชื่อบริษัท / ชื่อคู่ค้า", type: "text" },
              { label: "เบอร์โทร", field: "phone" as const, placeholder: "08x-xxx-xxxx", type: "tel" },
            ].map(({ label, field, placeholder, type }) => (
              <div key={field} style={{ marginBottom: 14 }}>
                <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>{label}</label>
                <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={placeholder} style={inputSt} />
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ที่อยู่</label>
              <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="ที่อยู่สำหรับจัดส่ง" rows={2}
                style={{ ...inputSt, resize: "none" }} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>หมายเหตุ</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="เงื่อนไขพิเศษ ส่วนลด ฯลฯ" rows={2}
                style={{ ...inputSt, resize: "none" }} />
            </div>

            {formError && <p style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>{formError}</p>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowForm(false)} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: "12px", borderRadius: 12, background: saving ? "#555" : c.gold, border: "none", color: "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Save size={14} /> {saving ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "เพิ่มคู่ค้า"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
