"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Tag, SlidersHorizontal } from "lucide-react";

const BG = "var(--admin-bg)";
const CARD = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT = "var(--admin-text)";
const TEXT2 = "var(--admin-text2)";
const TEXT3 = "var(--admin-text3)";
const GOLD = "var(--admin-gold)";

const ITEMS = [
  {
    icon: Tag,
    label: "ราคาแต่ละรุ่น",
    sub: "แก้ไขราคาตั้งต้น, ราคาแต่ละความจุ และค่าหักเฉพาะรุ่น",
    href: "/admin/prices",
    color: "#3B82F6",
  },
  {
    icon: SlidersHorizontal,
    label: "ค่าหักมาตรฐาน",
    sub: "ตั้งค่าการหักราคาเริ่มต้นที่ใช้กับทุกรุ่น",
    href: "/admin/deductions",
    color: GOLD,
  },
] as const;

export default function PriceSettingsPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 600, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}
          >
            <ChevronLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>ตั้งค่าราคา</h1>
            <p style={{ color: TEXT3, fontSize: 12, margin: "2px 0 0" }}>จัดการราคาและค่าหักการประเมิน</p>
          </div>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
          {ITEMS.map(({ icon: Icon, label, sub, href, color }, i) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px",
                background: "transparent",
                border: "none",
                borderBottom: i < ITEMS.length - 1 ? `1px solid ${BORDER}` : "none",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: color.startsWith('var(') ? 'var(--admin-gold-bg)' : `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={22} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: TEXT, fontSize: 15, fontWeight: 600, margin: "0 0 3px" }}>{label}</p>
                <p style={{ color: TEXT2, fontSize: 12, margin: 0 }}>{sub}</p>
              </div>
              <ChevronRight size={16} color={TEXT3} />
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
