"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Tag, SlidersHorizontal, Bell } from "lucide-react";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

const SECTIONS = [
  {
    title: "ราคาและการประเมิน",
    items: [
      { icon: Tag,              label: "ราคาแต่ละรุ่น",   sub: "แก้ราคาและความจุแต่ละรุ่น",        href: "/admin/prices",        color: "#3B82F6" },
      { icon: SlidersHorizontal, label: "ค่าหักมาตรฐาน",  sub: "ค่าหักราคาที่ใช้กับทุกรุ่น",      href: "/admin/deductions",    color: GOLD      },
    ],
  },
  {
    title: "การแจ้งเตือน",
    items: [
      { icon: Bell, label: "การแจ้งเตือน", sub: "Push notification สำหรับ admin", href: "/admin/notifications", color: "#8B5CF6" },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 600, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>ตั้งค่า</h1>
        </div>

        {SECTIONS.map(section => (
          <div key={section.title} style={{ marginBottom: 20 }}>
            <p style={{ color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px 4px" }}>
              {section.title}
            </p>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              {section.items.map(({ icon: Icon, label, sub, href, color }, i) => (
                <button
                  key={href}
                  onClick={() => router.push(href)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                    background: "transparent", border: "none",
                    borderBottom: i < section.items.length - 1 ? `1px solid ${BORDER}` : "none",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>{label}</p>
                    <p style={{ color: TEXT2, fontSize: 12, margin: 0 }}>{sub}</p>
                  </div>
                  <ChevronRight size={16} color={TEXT3} />
                </button>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
