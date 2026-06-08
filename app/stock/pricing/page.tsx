"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Search, Save, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import StockTopbar from "@/components/stock/Topbar";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchPriceRules, upsertPriceRule, deletePriceRule, fetchStockModels } from "@/app/actions/stock-pricing";
import type { PriceRule } from "@/app/actions/stock-pricing";
import { iphones } from "@/lib/products";

const GRADES = ["A", "A-", "B+", "B", "B-", "C"];
const WEBSITE_MODELS = iphones.map(p => p.model);
function fmt(n: number) { return n.toLocaleString("th-TH"); }
function fmtDate(s: string) {
  if (!s) return "";
  return new Date(s).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
}

function Trend({ rule }: { rule: PriceRule }) {
  if (rule.history.length === 0) return <span style={{ fontSize: 10, color: "transparent" }}>—</span>;
  const prev = rule.history[rule.history.length - 1].sellPrice;
  const diff = rule.sellPrice - prev;
  if (diff > 0) return <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "#22c55e", fontWeight: 700 }}><TrendingUp size={10} />+{fmt(diff)}</span>;
  if (diff < 0) return <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "#ef4444", fontWeight: 700 }}><TrendingDown size={10} />{fmt(diff)}</span>;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "#6b7280" }}><Minus size={10} />คงที่</span>;
}

interface EditState { model: string; grade: string; buyPrice: string; sellPrice: string; }
const EMPTY_EDIT: EditState = { model: "", grade: "A", buyPrice: "", sellPrice: "" };

export default function PricingPage() {
  const c = useThemeColors();
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedRule, setSelectedRule] = useState<PriceRule | null>(null);
  const [modelInput, setModelInput] = useState("");
  const [showModelList, setShowModelList] = useState(false);

  useEffect(() => {
    Promise.all([fetchPriceRules(), fetchStockModels()]).then(([r, m]) => {
      setRules(r); setModels(m); setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter(r => r.model.toLowerCase().includes(q));
  }, [rules, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, PriceRule[]>();
    for (const r of filtered) {
      if (!map.has(r.model)) map.set(r.model, []);
      map.get(r.model)!.push(r);
    }
    return Array.from(map.entries()).map(([model, rows]) => ({
      model,
      rows: GRADES.map(g => rows.find(r => r.grade === g) ?? null),
    }));
  }, [filtered]);

  const allModels = useMemo(() => {
    const combined = [...new Set([...WEBSITE_MODELS, ...models])];
    return combined.sort((a, b) => {
      const aIdx = WEBSITE_MODELS.indexOf(a);
      const bIdx = WEBSITE_MODELS.indexOf(b);
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [models]);

  const filteredModels = useMemo(() =>
    allModels.filter(m => m.toLowerCase().includes(modelInput.toLowerCase()) && m !== modelInput),
    [allModels, modelInput]
  );

  function openAdd(prefillModel = "", prefillGrade = "A") {
    setEdit({ model: prefillModel, grade: prefillGrade, buyPrice: "", sellPrice: "" });
    setModelInput(prefillModel);
    setEditId(null); setShowForm(true); setSaveMsg(null);
  }

  function openEdit(r: PriceRule) {
    setEdit({ model: r.model, grade: r.grade, buyPrice: String(r.buyPrice), sellPrice: String(r.sellPrice) });
    setModelInput(r.model);
    setEditId(r.id); setShowForm(true); setSaveMsg(null); setSelectedRule(null);
  }

  async function handleSave() {
    if (!edit.model.trim() || !edit.grade) return;
    const buy = parseInt(edit.buyPrice) || 0;
    const sell = parseInt(edit.sellPrice) || 0;
    setSaving(true); setSaveMsg(null);
    const res = await upsertPriceRule(edit.model.trim(), edit.grade, buy, sell);
    setSaving(false);
    if (!res.success) { setSaveMsg(res.error ?? "เกิดข้อผิดพลาด"); return; }
    const updated = await fetchPriceRules();
    setRules(updated);
    setShowForm(false); setEdit(EMPTY_EDIT); setModelInput(""); setEditId(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deletePriceRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
    if (selectedRule?.id === id) setSelectedRule(null);
    setDeleting(null);
  }

  const inputSt: React.CSSProperties = {
    background: c.card2, border: `1px solid ${c.border}`, borderRadius: 10,
    padding: "9px 12px", color: c.text, fontSize: 13, fontFamily: "inherit",
    outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ background: c.bg, minHeight: "100vh", paddingBottom: 80 }}>
      <StockTopbar title="Pricing" subtitle="ตารางราคาอ้างอิงแยกตามรุ่น/เกรด">
        <button
          onClick={() => openAdd()}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={15} /> เพิ่มราคา
        </button>
      </StockTopbar>

      <div style={{ paddingTop: 24, paddingBottom: 24 }} className="px-3 md:px-6">
        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              style={{ background: c.card, border: `1px solid ${c.gold}`, borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>{editId ? "แก้ไขราคา" : "เพิ่มราคาใหม่"}</p>
                <button onClick={() => { setShowForm(false); setShowModelList(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
                {/* Model with dropdown */}
                <div style={{ position: "relative" }}>
                  <label style={{ color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>รุ่น</label>
                  <input
                    value={modelInput}
                    onChange={e => { setModelInput(e.target.value); setEdit(p => ({ ...p, model: e.target.value })); setShowModelList(true); }}
                    onFocus={() => setShowModelList(true)}
                    onBlur={() => setTimeout(() => setShowModelList(false), 150)}
                    placeholder="พิมพ์หรือเลือกจากรายการ..."
                    style={inputSt}
                  />
                  {showModelList && filteredModels.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50, background: c.card, border: `1px solid ${c.border}`, borderRadius: 10, marginTop: 4, maxHeight: 200, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }}>
                      {filteredModels.map(m => (
                        <button key={m} onMouseDown={() => { setModelInput(m); setEdit(p => ({ ...p, model: m })); setShowModelList(false); }}
                          style={{ width: "100%", padding: "9px 14px", background: "none", border: "none", color: c.text, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.background = c.card2)}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>เกรด</label>
                  <select value={edit.grade} onChange={e => setEdit(p => ({ ...p, grade: e.target.value }))} style={{ ...inputSt, cursor: "pointer" }}>
                    {GRADES.map(g => <option key={g} value={g}>เกรด {g}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคารับซื้อ (฿)</label>
                  <input type="number" value={edit.buyPrice} onChange={e => setEdit(p => ({ ...p, buyPrice: e.target.value }))} placeholder="0" style={inputSt} />
                </div>
                <div>
                  <label style={{ color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>ราคาขาย (฿)</label>
                  <input type="number" value={edit.sellPrice} onChange={e => setEdit(p => ({ ...p, sellPrice: e.target.value }))} placeholder="0" style={inputSt} />
                </div>
              </div>

              {saveMsg && <p style={{ color: "#ef4444", fontSize: 12, margin: "8px 0 0" }}>{saveMsg}</p>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
                <button onClick={() => { setShowForm(false); setShowModelList(false); }} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
                <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", background: c.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
                  <Save size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Main table */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Search */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหารุ่น..."
                style={{ width: "100%", background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: "10px 12px 10px 36px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: c.text3 }}>กำลังโหลด...</div>
            ) : grouped.length === 0 ? (
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 60, textAlign: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
                <p style={{ color: c.text2, fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>ยังไม่มีตารางราคา</p>
                <p style={{ color: c.text3, fontSize: 13, margin: "0 0 16px" }}>กดปุ่ม "เพิ่มราคา" เพื่อเริ่มต้น</p>
                <button onClick={() => openAdd()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <Plus size={14} /> เพิ่มราคาแรก
                </button>
              </div>
            ) : (
              <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: c.card2 }}>
                        <th style={{ padding: "12px 16px", textAlign: "left", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>รุ่น</th>
                        {GRADES.map(g => (
                          <th key={g} style={{ padding: "12px 14px", textAlign: "center", color: c.text3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                            เกรด {g}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {grouped.map(({ model, rows }, i) => (
                          <motion.tr key={model} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} style={{ borderBottom: `1px solid ${c.border}` }}>
                            <td style={{ padding: "12px 16px" }}>
                              <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>{model}</p>
                            </td>
                            {rows.map((rule, gi) => (
                              <td key={gi} style={{ padding: "8px 10px", textAlign: "center", minWidth: 120 }}>
                                {rule ? (
                                  <div
                                    onClick={() => { setSelectedRule(selectedRule?.id === rule.id ? null : rule); }}
                                    style={{
                                      cursor: "pointer", borderRadius: 10, padding: "8px 10px", position: "relative",
                                      background: selectedRule?.id === rule.id ? c.goldBg : c.card2,
                                      border: `1px solid ${selectedRule?.id === rule.id ? c.gold : "transparent"}`,
                                      transition: "all 150ms",
                                    }}
                                  >
                                    <p style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, margin: "0 0 1px" }}>฿{fmt(rule.sellPrice)}</p>
                                    <p style={{ color: c.text3, fontSize: 10, margin: "0 0 2px" }}>รับ ฿{fmt(rule.buyPrice)}</p>
                                    <Trend rule={rule} />
                                    <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 4 }}>
                                      <button onClick={e => { e.stopPropagation(); openEdit(rule); }} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, padding: 2, display: "flex" }} title="แก้ไข">✏️</button>
                                      <button onClick={e => { e.stopPropagation(); handleDelete(rule.id); }} disabled={deleting === rule.id} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", padding: 2, opacity: deleting === rule.id ? 0.4 : 1 }} title="ลบ">
                                        <Trash2 size={10} />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => openAdd(model, GRADES[gi])}
                                    style={{ background: "none", border: `1px dashed ${c.border}`, borderRadius: 8, padding: "8px 10px", color: c.text3, fontSize: 11, cursor: "pointer", width: "100%" }}
                                  >
                                    + เพิ่ม
                                  </button>
                                )}
                              </td>
                            ))}
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Price trend panel */}
          <AnimatePresence>
            {selectedRule && selectedRule.history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                style={{ width: 260, flexShrink: 0, background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: "16px 18px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <p style={{ color: c.text, fontSize: 13, fontWeight: 700, margin: 0 }}>{selectedRule.model}</p>
                    <p style={{ color: c.text3, fontSize: 11, margin: "2px 0 0" }}>เกรด {selectedRule.grade}</p>
                  </div>
                  <button onClick={() => setSelectedRule(null)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex" }}>
                    <X size={14} />
                  </button>
                </div>

                {/* Sell price chart */}
                <p style={{ color: c.text3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>ราคาขาย (ประวัติ)</p>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={[...selectedRule.history, { sellPrice: selectedRule.sellPrice, date: selectedRule.updatedAt }]}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={c.gold} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={c.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="sellPrice" stroke={c.gold} fill="url(#trendGrad)" strokeWidth={2} dot={false} />
                    <Tooltip contentStyle={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 11 }} formatter={(v: unknown) => [`฿${fmt(Number(v))}`, "ราคาขาย"]} labelFormatter={() => ""} />
                  </AreaChart>
                </ResponsiveContainer>

                {/* Buy price chart */}
                <p style={{ color: c.text3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 6px" }}>ราคารับซื้อ (ประวัติ)</p>
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={[...selectedRule.history, { buyPrice: selectedRule.buyPrice, date: selectedRule.updatedAt }]}>
                    <defs>
                      <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="buyPrice" stroke="#3b82f6" fill="url(#buyGrad)" strokeWidth={2} dot={false} />
                    <Tooltip contentStyle={{ background: c.card2, border: `1px solid ${c.border}`, borderRadius: 6, color: c.text, fontSize: 11 }} formatter={(v: unknown) => [`฿${fmt(Number(v))}`, "ราคารับซื้อ"]} labelFormatter={() => ""} />
                  </AreaChart>
                </ResponsiveContainer>

                {/* History list */}
                <p style={{ color: c.text3, fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "12px 0 8px" }}>ประวัติการเปลี่ยนแปลง</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[...selectedRule.history].reverse().slice(0, 5).map((h, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: c.card2, borderRadius: 8 }}>
                      <div>
                        <p style={{ color: c.text, fontSize: 11, fontWeight: 600, margin: 0 }}>฿{fmt(h.sellPrice)}</p>
                        <p style={{ color: c.text3, fontSize: 10, margin: 0 }}>รับ ฿{fmt(h.buyPrice)}</p>
                      </div>
                      <span style={{ color: c.text3, fontSize: 10 }}>{fmtDate(h.date)}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 8px", background: c.goldBg, borderRadius: 8, border: `1px solid ${c.gold}30` }}>
                    <div>
                      <p style={{ color: c.gold, fontSize: 11, fontWeight: 700, margin: 0 }}>฿{fmt(selectedRule.sellPrice)} (ปัจจุบัน)</p>
                      <p style={{ color: c.text3, fontSize: 10, margin: 0 }}>รับ ฿{fmt(selectedRule.buyPrice)}</p>
                    </div>
                    <span style={{ color: c.text3, fontSize: 10 }}>{fmtDate(selectedRule.updatedAt)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ color: c.text3, fontSize: 12, textAlign: "center", marginTop: 16 }}>
          คลิกที่ช่องราคาเพื่อดู trend · คลิก + เพื่อเพิ่มราคาในเกรดที่ยังว่างอยู่
        </p>
      </div>
    </div>
  );
}
