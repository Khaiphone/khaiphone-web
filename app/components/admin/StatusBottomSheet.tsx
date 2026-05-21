"use client";

import { useState } from "react";
import type { RequestStatus } from "../../../lib/types/admin";

const STATUSES: Array<{ value: RequestStatus; label: string; dot: string }> = [
  { value: "new",               label: "คำขอใหม่",                   dot: "#F59E0B" },
  { value: "pending",           label: "รอตรวจสอบ",                  dot: "#3B82F6" },
  { value: "inspecting",        label: "เจ้าหน้าที่ติดต่อกลับแล้ว", dot: "#F97316" },
  { value: "confirmed",         label: "ยืนยันนัดหมาย",              dot: "#8B5CF6" },
  { value: "price_negotiation", label: "รอลูกค้ายืนยันราคา",         dot: "#F59E0B" },
  { value: "contracting",       label: "กำลังทำสัญญาซื้อขาย",        dot: "#4F46E5" },
  { value: "completed",         label: "เสร็จสิ้น",                  dot: "#10B981" },
  { value: "cancelled",         label: "ยกเลิกนัดหมาย",             dot: "#EF4444" },
  { value: "rejected",          label: "ไม่เข้าเงื่อนไขการรับซื้อ", dot: "#6B7280" },
];

interface Props {
  currentStatus: RequestStatus;
  onSave: (status: RequestStatus, note: string) => void;
  onClose: () => void;
}

export default function StatusBottomSheet({ currentStatus, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<RequestStatus>(currentStatus);
  const [note, setNote]         = useState("");

  const CARD   = "var(--admin-card)";
  const BORDER = "var(--admin-border)";
  const TEXT   = "var(--admin-text)";
  const TEXT2  = "var(--admin-text2)";
  const BG     = "var(--admin-bg)";
  const GOLD   = "var(--admin-gold)";

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.4)",
          zIndex: 100,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          background: CARD,
          borderRadius: "24px 24px 0 0",
          zIndex: 101,
          maxHeight: "92vh",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", paddingTop: "14px", paddingBottom: "6px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: BORDER }} />
        </div>

        <div style={{ padding: "6px 20px 0" }}>
          <h3 style={{ color: TEXT, fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>
            เปลี่ยนสถานะ
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "18px" }}>
            {STATUSES.map(s => {
              const active = selected === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSelected(s.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "14px 16px",
                    borderRadius: "14px",
                    background: active ? "var(--admin-gold-bg)" : BG,
                    border: active ? "1px solid rgba(184,134,11,0.4)" : `1px solid ${BORDER}`,
                    cursor: "pointer",
                    touchAction: "manipulation",
                    textAlign: "left",
                    width: "100%",
                    minHeight: "52px",
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.dot, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ color: active ? GOLD : TEXT, flex: 1, fontSize: "15px", fontWeight: active ? 700 : 400 }}>
                    {s.label}
                  </span>
                  {active && (
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: GOLD, color: "#fff", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="เพิ่มหมายเหตุ (ถ้ามี)"
            maxLength={200}
            rows={2}
            style={{
              width: "100%",
              background: BG,
              border: `1px solid ${BORDER}`,
              borderRadius: "12px",
              padding: "12px 14px",
              color: TEXT,
              fontSize: "14px",
              resize: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
              outline: "none",
              marginBottom: "16px",
            }}
          />

          <button
            onClick={() => onSave(selected, note)}
            style={{
              width: "100%",
              background: GOLD,
              border: "none",
              borderRadius: "14px",
              padding: "16px",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 700,
              cursor: "pointer",
              touchAction: "manipulation",
              minHeight: "54px",
              fontFamily: "inherit",
              marginBottom: "calc(env(safe-area-inset-bottom) + 16px)",
            }}
          >
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </div>
    </>
  );
}
