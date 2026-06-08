"use client";

import { useState } from "react";
import { useThemeColors } from "./ThemeContext";
import { buybackStock } from "@/app/actions/stocks";
import type { StockItem } from "@/lib/stock/types";

interface Props {
  item: StockItem;
  onClose: () => void;
  onSuccess: (updates: Partial<StockItem>) => void;
}

export default function BuybackModal({ item, onClose, onSuccess }: Props) {
  const c = useThemeColors();
  const [price, setPrice] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);

  const REASONS = ["สินค้ามีปัญหา / ชำรุด", "ลูกค้าเปลี่ยนใจ", "สินค้าไม่ตรงสเปค", "อื่นๆ"];
  const effectiveReason = reason === "อื่นๆ" ? customReason.trim() : reason;

  async function handleSubmit() {
    const p = Number(price.replace(/,/g, ""));
    if (!p || !effectiveReason) return;
    setSaving(true);
    const res = await buybackStock(item.id, p, effectiveReason);
    if (res.success) {
      onSuccess({ status: "รับคืนแล้ว" });
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาด");
      setSaving(false);
    }
  }

  const canSubmit = !saving && !!price && !!effectiveReason;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, border: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>ซื้อคืนสินค้า</p>
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item.model} {item.storage} · {item.id}</p>

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ราคาที่ซื้อคืน (฿) *</label>
        <input
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="0"
          type="number"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
        />

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>เหตุผล *</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {REASONS.map(r => (
            <button key={r} onClick={() => setReason(r)}
              style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, border: `1.5px solid ${reason === r ? "#f59e0b" : c.border}`, background: reason === r ? "rgba(245,158,11,0.12)" : c.bg, color: reason === r ? "#f59e0b" : c.text2, fontWeight: reason === r ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
              {r}
            </button>
          ))}
        </div>
        {reason === "อื่นๆ" && (
          <input
            value={customReason}
            onChange={e => setCustomReason(e.target.value)}
            placeholder="ระบุเหตุผล..."
            autoFocus
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
          />
        )}

        <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, marginTop: 4 }}>
          <p style={{ color: "#f59e0b", fontSize: 12, margin: 0, fontWeight: 600 }}>หลังจากนี้ — สถานะจะเปลี่ยนเป็น "รับคืนแล้ว"</p>
          <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>จากนั้นสามารถกด "ส่งซ่อม" หรือเปลี่ยนสถานะต่อได้</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ flex: 2, padding: "12px", borderRadius: 12, background: canSubmit ? "#f59e0b" : c.card2, border: "none", color: canSubmit ? "#000" : c.text3, fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "ยืนยันซื้อคืน"}
          </button>
        </div>
      </div>
    </div>
  );
}
