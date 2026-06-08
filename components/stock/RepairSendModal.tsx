"use client";

import { useState } from "react";
import { useThemeColors } from "./ThemeContext";
import { sendToRepair } from "@/app/actions/stocks";
import type { StockItem } from "@/lib/stock/types";

interface Props {
  item: StockItem;
  onClose: () => void;
  onSuccess: (updates: Partial<StockItem>) => void;
}

export default function RepairSendModal({ item, onClose, onSuccess }: Props) {
  const c = useThemeColors();
  const [shopName, setShopName] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [issue, setIssue] = useState("");
  const [customIssue, setCustomIssue] = useState("");
  const [saving, setSaving] = useState(false);

  const effectiveIssue = issue === "อื่นๆ" ? customIssue.trim() : issue;

  const ISSUES = ["จอแตก / ตาย", "แบตเตอรี่เสื่อม", "ปุ่มชำรุด", "กล้องมีปัญหา", "ลำโพง / ไมค์เสีย", "อื่นๆ"];

  async function handleSubmit() {
    if (!shopName.trim() || !effectiveIssue) return;
    setSaving(true);
    const cost = Number(estimatedCost.replace(/,/g, "")) || 0;
    const res = await sendToRepair(item.id, shopName.trim(), cost, effectiveIssue);
    if (res.success) {
      onSuccess({ status: "ส่งซ่อม" });
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาด");
      setSaving(false);
    }
  }

  const canSubmit = !saving && !!shopName.trim() && !!effectiveIssue;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 420, border: `1px solid ${c.border}` }}>
        <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>ส่งซ่อม</p>
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item.model} {item.storage} · {item.id}</p>

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ร้านซ่อม / ช่างซ่อม *</label>
        <input
          value={shopName}
          onChange={e => setShopName(e.target.value)}
          placeholder="ชื่อร้าน หรือชื่อช่าง"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
        />

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ค่าซ่อมโดยประมาณ (฿)</label>
        <input
          value={estimatedCost}
          onChange={e => setEstimatedCost(e.target.value)}
          placeholder="0"
          type="number"
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
        />

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 8 }}>ปัญหาที่ต้องซ่อม *</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          {ISSUES.map(iss => (
            <button key={iss} onClick={() => setIssue(iss)}
              style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, border: `1.5px solid ${issue === iss ? "#ec4899" : c.border}`, background: issue === iss ? "rgba(236,72,153,0.12)" : c.bg, color: issue === iss ? "#ec4899" : c.text2, fontWeight: issue === iss ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
              {iss}
            </button>
          ))}
        </div>
        {issue === "อื่นๆ" && (
          <input
            value={customIssue}
            onChange={e => setCustomIssue(e.target.value)}
            placeholder="ระบุปัญหา..."
            autoFocus
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none", marginBottom: 16 }}
          />
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ flex: 2, padding: "12px", borderRadius: 12, background: canSubmit ? "#ec4899" : c.card2, border: "none", color: canSubmit ? "#fff" : c.text3, fontSize: 14, fontWeight: 700, cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "ยืนยันส่งซ่อม"}
          </button>
        </div>
      </div>
    </div>
  );
}
