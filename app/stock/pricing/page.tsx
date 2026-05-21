"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Search, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StockTopbar from "@/components/stock/Topbar";
import { GradeBadge } from "@/components/stock/StatusBadge";
import { useThemeColors } from "@/components/stock/ThemeContext";
import { fetchPriceRules, upsertPriceRule, deletePriceRule } from "@/app/actions/stock-pricing";
import type { PriceRule } from "@/app/actions/stock-pricing";

const GRADES = ["A", "A-", "B+", "B", "B-", "C"];
function fmt(n: number) { return n.toLocaleString("th-TH"); }

interface EditState { model: string; grade: string; buyPrice: string; sellPrice: string; }
const EMPTY_EDIT: EditState = { model: "", grade: "A", buyPrice: "", sellPrice: "" };

export default function PricingPage() {
  const c = useThemeColors();
  const [rules, setRules] = useState<PriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [edit, setEdit] = useState<EditState>(EMPTY_EDIT);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchPriceRules().then(d => { setRules(d); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rules;
    const q = search.toLowerCase();
    return rules.filter(r => r.model.toLowerCase().includes(q));
  }, [rules, search]);

  // Group by model
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

  function openAdd() {
    setEdit(EMPTY_EDIT); setEditId(null); setShowForm(true); setSaveMsg(null);
  }

  function openEdit(r: PriceRule) {
    setEdit({ model: r.model, grade: r.grade, buyPrice: String(r.buyPrice), sellPrice: String(r.sellPrice) });
    setEditId(r.id); setShowForm(true); setSaveMsg(null);
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
    setShowForm(false); setEdit(EMPTY_EDIT); setEditId(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await deletePriceRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
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
          onClick={openAdd}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={15} /> เพิ่มราคา
        </button>
      </StockTopbar>

      <div style={{ padding: 24 }}>
        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ background: c.card, border: `1px solid ${c.gold}`, borderRadius: 16, padding: "18px 20px", marginBottom: 20 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ color: c.text, fontSize: 14, fontWeight: 700, margin: 0 }}>
                  {editId ? "แก้ไขราคา" : "เพิ่มราคาใหม่"}
                </p>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex" }}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, alignItems: "end" }}>
                <div>
                  <label style={{ color: c.text2, fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4 }}>รุ่น (เช่น iPhone 15 Pro)</label>
                  <input value={edit.model} onChange={e => setEdit(p => ({ ...p, model: e.target.value }))} placeholder="iPhone 15 Pro Max" style={inputSt} />
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
                <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${c.border}`, background: "none", color: c.text2, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
                <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 9, border: "none", background: c.gold, color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.6 : 1 }}>
                  <Save size={14} /> {saving ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <div style={{ position: "relative", marginBottom: 16 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: c.text3 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหารุ่น..."
            style={{ width: "100%", background: c.card, border: `1px solid ${c.border}`, borderRadius: 12, padding: "10px 12px 10px 36px", color: c.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: c.text3 }}>กำลังโหลด...</div>
        ) : grouped.length === 0 ? (
          <div style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: 16, padding: 60, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
            <p style={{ color: c.text2, fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>ยังไม่มีตารางราคา</p>
            <p style={{ color: c.text3, fontSize: 13, margin: "0 0 16px" }}>กดปุ่ม "เพิ่มราคา" เพื่อเริ่มต้น</p>
            <button onClick={openAdd} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 18px", borderRadius: 10, background: c.gold, border: "none", color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
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
                      <motion.tr
                        key={model}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        style={{ borderBottom: `1px solid ${c.border}` }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <p style={{ color: c.text, fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: "nowrap" }}>{model}</p>
                        </td>
                        {rows.map((rule, gi) => (
                          <td key={gi} style={{ padding: "8px 10px", textAlign: "center", minWidth: 120 }}>
                            {rule ? (
                              <div
                                onClick={() => openEdit(rule)}
                                style={{ cursor: "pointer", background: c.card2, borderRadius: 10, padding: "8px 10px", position: "relative" }}
                                title="คลิกเพื่อแก้ไข"
                              >
                                <p style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, margin: "0 0 2px" }}>ขาย ฿{fmt(rule.sellPrice)}</p>
                                <p style={{ color: c.text3, fontSize: 11, margin: 0 }}>รับ ฿{fmt(rule.buyPrice)}</p>
                                <button
                                  onClick={e => { e.stopPropagation(); handleDelete(rule.id); }}
                                  disabled={deleting === rule.id}
                                  style={{ position: "absolute", top: 4, right: 4, background: "none", border: "none", cursor: "pointer", color: c.text3, display: "flex", padding: 2, opacity: deleting === rule.id ? 0.4 : 1 }}
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEdit({ model, grade: GRADES[gi], buyPrice: "", sellPrice: "" }); setEditId(null); setShowForm(true); setSaveMsg(null); }}
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

        <p style={{ color: c.text3, fontSize: 12, textAlign: "center", marginTop: 16 }}>
          คลิกที่ช่องราคาเพื่อแก้ไข · คลิก + เพื่อเพิ่มราคาในเกรดที่ยังไม่มี
        </p>
      </div>
    </div>
  );
}
