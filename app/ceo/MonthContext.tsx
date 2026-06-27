"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchAvailableMonths } from "@/app/actions/ceo";
import { GOLD } from "./ui";

// month = "" หมายถึงเดือนปัจจุบัน · "YYYY-MM" = เดือนย้อนหลัง
type Ctx = { month: string; setMonth: (m: string) => void; isCurrent: boolean };
const MonthCtx = createContext<Ctx>({ month: "", setMonth: () => {}, isCurrent: true });
export const useCeoMonth = () => useContext(MonthCtx);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [month, setMonth] = useState("");
  return <MonthCtx.Provider value={{ month, setMonth, isCurrent: month === "" }}>{children}</MonthCtx.Provider>;
}

// แถบเลือกเดือน — แสดงเหนือเนื้อหาทุกหน้า (ยกเว้นหน้าที่ปิดไว้)
export function MonthBar() {
  const { month, setMonth } = useCeoMonth();
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => { fetchAvailableMonths().then(setMonths).catch(() => {}); }, []);

  const current = months[0]?.value ?? "";
  const selected = month || current;
  const isPast = month !== "" && month !== current;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
      <span style={{ fontSize: 12.5, color: "#6b7280", fontWeight: 600 }}>📅 ดูข้อมูลเดือน</span>
      <select
        value={selected}
        onChange={e => setMonth(e.target.value === current ? "" : e.target.value)}
        style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${isPast ? GOLD : "#e0e0e4"}`, background: "#fff", fontSize: 13.5, fontWeight: 700, color: "#111", fontFamily: "inherit", cursor: "pointer", outline: "none" }}
      >
        {months.map(m => <option key={m.value} value={m.value}>{m.label}{m.value === current ? " (ปัจจุบัน)" : ""}</option>)}
      </select>
      {isPast && (
        <span style={{ fontSize: 11.5, color: GOLD, fontWeight: 600 }}>
          กำลังดูย้อนหลัง · ตัวเลขสต็อก/อายุสต็อกยังเป็นค่าปัจจุบัน
        </span>
      )}
    </div>
  );
}
