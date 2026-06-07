"use client";

import { useState } from "react";
import { HelpCircle, BookOpen, Mail, Phone, ChevronDown, ChevronRight } from "lucide-react";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";

const guides = [
  {
    title: "รับคำขอใหม่",
    steps: [
      "เข้าเมนู คำขอทั้งหมด",
      "กรองด้วยสถานะ ใหม่ เพื่อดูงานที่รอดำเนินการ",
      "กดเปิดคำขอ → ตรวจสอบข้อมูลลูกค้าและรายละเอียดอุปกรณ์",
      "เลือก นัดหมาย เพื่อกำหนดวันและเวลารับเครื่อง",
    ],
  },
  {
    title: "Assign งานให้ไรเดอร์",
    steps: [
      "เข้าเมนู หน้าควบคุมงาน (Planner)",
      "งานที่รอ Assign จะแสดงในรายการด้านขวา",
      "กดปุ่ม Assign ข้างงาน → เลือกไรเดอร์ที่ต้องการ",
      "ระบบจะส่ง notification ให้ไรเดอร์ทันที",
    ],
  },
  {
    title: "ดูสถานะงาน Realtime",
    steps: [
      "เข้าเมนู หน้าควบคุมงาน (Planner)",
      "แผนที่จะแสดงตำแหน่งไรเดอร์แบบ realtime",
      "แถบสถิติด้านล่างแสดงจำนวนงานแต่ละสถานะ",
      "กด SLA เพื่อดูงานที่ใกล้เกิน SLA",
    ],
  },
  {
    title: "ดูข้อมูลและสถิติไรเดอร์",
    steps: [
      "เข้าเมนู จัดการไรเดอร์",
      "กดชื่อไรเดอร์ที่ต้องการดู",
      "ดูได้ทั้ง KPI วันนี้ / สัปดาห์ / เดือน",
      "เลื่อนลงดูประวัติงานและ Shift ล่าสุด",
    ],
  },
  {
    title: "ตั้งค่า SLA",
    steps: [
      "เข้าเมนู ตั้งค่า → SLA Threshold",
      "ปรับค่าเวลาสำหรับแต่ละขั้นตอน",
      "กด บันทึก เพื่อให้มีผล",
      "งานที่เกิน SLA จะแสดงแถบแจ้งเตือนสีแดงบน Planner",
    ],
  },
];

function GuideCard({ title, steps }: { title: string; steps: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        overflow: "hidden",
        background: CARD,
      }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 18px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: TEXT,
          fontSize: 14,
          fontWeight: 600,
          textAlign: "left",
        }}
      >
        <span>{title}</span>
        {open ? <ChevronDown size={16} color={TEXT3} /> : <ChevronRight size={16} color={TEXT3} />}
      </button>

      {open && (
        <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${BORDER}` }}>
          <ol style={{ margin: "12px 0 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: TEXT2, lineHeight: 1.6 }}>
                {s}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div style={{ background: BG, minHeight: "100vh", padding: "32px 24px", maxWidth: 720, margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
        <HelpCircle size={22} color={GOLD} />
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>ช่วยเหลือ</h1>
          <p style={{ margin: 0, fontSize: 12, color: TEXT3 }}>คู่มือและการติดต่อ support</p>
        </div>
      </div>

      {/* คู่มือใช้งาน */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <BookOpen size={16} color={GOLD} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>คู่มือใช้งาน</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {guides.map(g => (
            <GuideCard key={g.title} title={g.title} steps={g.steps} />
          ))}
        </div>
      </section>

      {/* ติดต่อ Support */}
      <section>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Phone size={16} color={GOLD} />
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: TEXT }}>ติดต่อ Support</p>
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(250,204,21,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Phone size={16} color={GOLD} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: TEXT3 }}>โทรศัพท์</p>
              <a href="tel:0955535167" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, textDecoration: "none" }}>
                095-553-5167
              </a>
            </div>
          </div>

          <div style={{ height: 1, background: BORDER }} />

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(250,204,21,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Mail size={16} color={GOLD} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 11, color: TEXT3 }}>อีเมล</p>
              <a href="mailto:panupan@khaiphone.com" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT, textDecoration: "none" }}>
                panupan@khaiphone.com
              </a>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
