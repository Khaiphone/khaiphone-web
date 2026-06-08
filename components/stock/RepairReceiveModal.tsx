"use client";

import { useRef, useState } from "react";
import { useThemeColors } from "./ThemeContext";
import { receiveFromRepair } from "@/app/actions/stocks";
import { supabase } from "@/lib/supabase";
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

  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function handleReceiptUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    const urls: string[] = [...receiptUrls];
    for (const file of Array.from(files)) {
      const path = `repairs/${item.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data, error } = await supabase.storage.from("stock-photos").upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from("stock-photos").getPublicUrl(data.path);
        urls.push(publicUrl);
      }
    }
    setReceiptUrls(urls);
    setUploading(false);
  }

  async function handleSubmit() {
    setSaving(true);
    const cost = Number(actualCost.replace(/,/g, "")) || 0;
    const price = Number(newPrice.replace(/,/g, "")) || null;
    const res = await receiveFromRepair(item.id, cost, newGrade || null, price, notes.trim(), receiptUrls);
    if (res.success) {
      onSuccess({
        status: "พร้อมขาย",
        grade: (newGrade || item.grade) as StockGrade,
        sellingPrice: price ?? item.sellingPrice,
      });
    } else {
      alert(res.error ?? "เกิดข้อผิดพลาด");
      setSaving(false);
    }
  }

  const inputSt: React.CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 10, background: c.bg, border: `1px solid ${c.border}`, color: c.text, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: c.card, borderRadius: 20, padding: 28, width: "100%", maxWidth: 440, border: `1px solid ${c.border}`, maxHeight: "90vh", overflowY: "auto" }}>
        <p style={{ color: c.text, fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>รับคืนจากซ่อม</p>
        <p style={{ color: c.text3, fontSize: 12, margin: "0 0 20px" }}>{item.model} {item.storage} · {item.id}</p>

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>ค่าซ่อมจริง (฿)</label>
        <input value={actualCost} onChange={e => setActualCost(e.target.value)} placeholder="0" type="number" style={{ ...inputSt, marginBottom: 16 }} />

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
        <input value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="เว้นว่างถ้าไม่เปลี่ยน" type="number" style={{ ...inputSt, marginBottom: 16 }} />

        <label style={{ color: c.text2, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>หมายเหตุ</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="สิ่งที่ซ่อม / สภาพหลังซ่อม" style={{ ...inputSt, marginBottom: 16 }} />

        {/* Receipt upload */}
        <div style={{ marginBottom: 20, padding: "12px 14px", borderRadius: 12, background: c.bg, border: `1px dashed ${c.border}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: receiptUrls.length > 0 ? 10 : 0 }}>
            <span style={{ color: c.text2, fontSize: 12, fontWeight: 600 }}>📎 ใบเสร็จค่าซ่อม <span style={{ color: c.text3, fontWeight: 400 }}>(ไม่บังคับ)</span></span>
            <button onClick={() => receiptInputRef.current?.click()} disabled={uploading}
              style={{ padding: "5px 12px", borderRadius: 8, background: "transparent", border: `1px solid ${c.border}`, color: c.text2, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
              {uploading ? "กำลังอัปโหลด..." : "+ แนบรูป"}
            </button>
          </div>
          {receiptUrls.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {receiptUrls.map((url, i) => (
                <div key={i} style={{ position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="receipt" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${c.border}` }} />
                  <button onClick={() => setReceiptUrls(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#ef4444", border: "none", color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <input ref={receiptInputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={e => e.target.files && handleReceiptUpload(e.target.files)} />
        </div>

        <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
          <p style={{ color: "#22c55e", fontSize: 12, margin: 0, fontWeight: 600 }}>หลังจากนี้ — สถานะจะเปลี่ยนเป็น "พร้อมขาย"</p>
          <p style={{ color: c.text3, fontSize: 11, margin: "4px 0 0" }}>ค่าซ่อมจะบันทึกเป็นรายจ่าย ซ่อมบำรุง ใน Finance อัตโนมัติ</p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "none", border: `1px solid ${c.border}`, color: c.text2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>ยกเลิก</button>
          <button onClick={handleSubmit} disabled={saving || uploading}
            style={{ flex: 2, padding: "12px", borderRadius: 12, background: (saving || uploading) ? c.card2 : "#22c55e", border: "none", color: (saving || uploading) ? c.text3 : "#000", fontSize: 14, fontWeight: 700, cursor: (saving || uploading) ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {saving ? "กำลังบันทึก..." : "ยืนยันรับคืน → พร้อมขาย"}
          </button>
        </div>
      </div>
    </div>
  );
}
