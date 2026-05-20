"use client";

import { useState } from "react";
import type { RequestStatus } from "../../../lib/types/admin";

const STATUS_OPTIONS: Array<{ value: RequestStatus; label: string }> = [
  { value: "new",              label: "คำขอใหม่"      },
  { value: "pending",          label: "รอดำเนินการ"   },
  { value: "confirmed",        label: "ยืนยันนัดหมาย" },
  { value: "pickup_scheduled", label: "นัดรับเครื่อง" },
  { value: "inspecting",       label: "กำลังตรวจสอบ"  },
  { value: "completed",        label: "เสร็จสิ้น"     },
  { value: "cancelled",        label: "ยกเลิก"        },
];

const MODEL_OPTIONS = [
  "iPhone 17 Pro Max", "iPhone 17 Pro", "iPhone 17", "iPhone 17 Plus",
  "iPhone 16 Pro Max", "iPhone 16 Pro", "iPhone 16", "iPhone 16 Plus",
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15", "iPhone 14 Pro", "iPhone 13",
];

export interface FilterState {
  statuses: RequestStatus[];
  model: string;
  priceMin: string;
  priceMax: string;
}

interface Props {
  initial: FilterState;
  totalCount: number;
  onApply: (f: FilterState) => void;
  onClose: () => void;
}

export default function FilterBottomSheet({ initial, totalCount, onApply, onClose }: Props) {
  const [statuses,  setStatuses]  = useState<RequestStatus[]>(initial.statuses);
  const [model,     setModel]     = useState(initial.model);
  const [priceMin,  setPriceMin]  = useState(initial.priceMin);
  const [priceMax,  setPriceMax]  = useState(initial.priceMax);

  function toggleStatus(s: RequestStatus) {
    setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  function reset() {
    setStatuses([]); setModel(""); setPriceMin(""); setPriceMax("");
  }

  const inputStyle: React.CSSProperties = {
    background: "#F5F5F7",
    border: "1px solid #E5E5E5",
    borderRadius: "10px",
    padding: "10px 12px",
    color: "#111111",
    fontSize: "14px",
    width: "100%",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100, backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }} />

      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "#FFFFFF",
          borderRadius: "24px 24px 0 0",
          padding: "0 20px",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
          zIndex: 101,
          maxHeight: "88vh",
          overflowY: "auto",
          scrollbarWidth: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D1D1D6" }} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ color: "#111111", fontSize: "17px", fontWeight: 700, margin: 0 }}>ฟิลเตอร์</h3>
          <button onClick={reset} style={{ background: "none", border: "none", color: "#B8860B", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
            ล้างทั้งหมด
          </button>
        </div>

        <p style={{ color: "#666666", fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>สถานะ</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "20px" }}>
          {STATUS_OPTIONS.map(s => {
            const on = statuses.includes(s.value);
            return (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: on ? 600 : 400,
                  border: on ? "1px solid #B8860B" : "1px solid #E5E5E5",
                  background: on ? "#FEF3C7" : "#FAFAFA",
                  color: on ? "#92400E" : "#666666",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  fontFamily: "inherit",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <p style={{ color: "#666666", fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>รุ่นเครื่อง</p>
        <div style={{ position: "relative", marginBottom: "20px" }}>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            style={{ ...inputStyle, appearance: "none", WebkitAppearance: "none" }}
          >
            <option value="">เลือกรุ่นเครื่อง</option>
            {MODEL_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <p style={{ color: "#666666", fontSize: "13px", fontWeight: 600, marginBottom: "10px" }}>ช่วงราคาประเมิน</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "8px", alignItems: "center", marginBottom: "24px" }}>
          <input type="number" placeholder="ขั้นต่ำ" value={priceMin} onChange={e => setPriceMin(e.target.value)} style={inputStyle} />
          <span style={{ color: "#999999", fontSize: "13px" }}>—</span>
          <input type="number" placeholder="ขั้นสูง" value={priceMax} onChange={e => setPriceMax(e.target.value)} style={inputStyle} />
        </div>

        <button
          onClick={() => onApply({ statuses, model, priceMin, priceMax })}
          style={{
            width: "100%",
            background: "#B8860B",
            border: "none",
            borderRadius: "14px",
            padding: "15px",
            color: "#fff",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            touchAction: "manipulation",
            minHeight: "50px",
            fontFamily: "inherit",
          }}
        >
          แสดงผล {totalCount} รายการ
        </button>
      </div>
    </>
  );
}
