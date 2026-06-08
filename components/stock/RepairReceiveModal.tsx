"use client";

import { useState } from "react";
import { useThemeColors } from "./ThemeContext";
import { receiveFromRepair } from "@/app/actions/stocks";
import type { StockItem, StockGrade } from "@/lib/stock/types";

interface Props {
  item: StockItem;
  onClose: () => void;
  onSuccess: (updates: Partial<StockItem>) => void;
}

const GRADES: StockGrade[] = ["A", "A-", "B+", "B", "B-", "C"];
const GRADE_COLORS: Record<string, string> = { A: "#22c55e", "A-": "#84cc16", "B+": "#facc15", B: "#f97316", "B-": "#ef4444", C: "#dc2626" };

export default function RepairReceiveModal({ item, onClose, onSuccess }: Props) {
  const c = useThemeColors();
  const [actualCost, setActualCost] = useState("");
  const [newGrade, setNewGrade] = useState<StockGrade | "">(item.grade);
  const [newPrice, setNewPrice] = useState(item.sellingPrice ? String(item.sellingPrice) : "");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    const cost = Number(actualCost.replace(/,/g, "")) || 0;
    const price = Number(newPrice.replace(/,/g, "")) || null;
    const res = await receiveFromRepair(item.id, cost, newGrade || null, price, notes.trim());
    if (res.success) {
      onSuccess({
        status: "พร้อมขาย",
        grade: (newGrade || item.grade) as StockGrade,
        sellingPrice: price ?? item.sellingPrice,
        otherCost: item.otherCost + cost,
      });
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาด");
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${c.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>รับคืนจากซ่อม</p>
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item.model} {item.storage} · {item.id}</p>

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ค่าซ่อมจริง (฿)</label>
        <input
          value={actualCost}
          onChange={e => setActualCost(e.target.value)}
          placeholder="0"
          type="number"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
        />

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>เกรดหลังซ่อม (เดิม: {item.grade})</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {GRADES.map(g => {
            const col = GRADE_COLORS[g];
            const active = newGrade === g;
            return (
              <button key={g} onClick={() => setNewGrade(g)}
                style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 13, fontWeight: 700, border: `1.5px solid ${active ? col : c.border}`, background: active ? `${col}18` : c.bg, color: active ? col : c.text3, cursor: "pointer", fontFamily: "inherit" }}>
                {g}
              </button>
            );
          })}
        </div>

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ราคาขายใหม่ (฿) — เดิม ฿{item.sellingPrice.toLocaleString("th-TH")}</label>
        <input
          value={newPrice}
          onChange={e => setNewPrice(e.target.value)}
          placeholder="เว้นว่างถ้าไม่เปลี่ยน"
          type="number"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
        />

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>หมายเหตุ</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="สิ่งที่ซ่อม / สภาพหลังซ่อม"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 20 }}
        />

        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
          <p style={{ color: "#22c55e", fontSize: 12, margin: 0, fontWeight: 600 }}>หลังจากนี้ — สถานะจะเปลี่ยนเป็น "พร้อมขาย"</p>
          <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>ค่าซ่อมจะถูกบวกเข้า other_cost เพื่อคำนวณกำไร</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ flex: 2, padding: "12px", borderRadius: 12, background: saving ? c.card2 : "#22c55e", border: "none", color: saving ? c.text3 : "#000", fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "ยืนยันรับคืน → พร้อมขาย"}
          </button>
        </div>
      </div>
    </div>
  );
}
