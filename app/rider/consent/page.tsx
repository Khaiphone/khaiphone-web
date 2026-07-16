"use client";

import { unsubscribeDeviceFromPush } from "@/lib/push-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, X } from "lucide-react";
import { saveLocationConsent } from "@/app/actions/rider-tracking";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";
const RED    = "#FF453A";

const ALLOWS = [
  "มอบหมายงานที่อยู่ใกล้คุณที่สุด",
  "คำนวณเวลาเดินทางและ ETA",
  "ติดตามสถานะระหว่างทำงาน",
  "แจ้งเตือนทีมเมื่อคุณอาจต้องความช่วยเหลือ",
];

const DISALLOWS = [
  "ติดตามคุณนอกเวลา shift",
  "แชร์พิกัดให้บุคคลภายนอก",
  "เก็บประวัติตำแหน่งเกิน 7 วัน",
];

export default function ConsentPage() {
  const router  = useRouter();
  const [agreed, setAgreed]   = useState(false);
  const [saving, setSaving]   = useState(false);
  const [declining, setDeclining] = useState(false);

  async function handleAccept() {
    if (!agreed) return;
    setSaving(true);
    await saveLocationConsent(true);
    router.replace("/rider");
  }

  async function handleDecline() {
    setDeclining(true);
    await saveLocationConsent(false);
    // Sign out — can't use app without consent
    const { supabase } = await import("@/lib/supabase");
    await unsubscribeDeviceFromPush(); // ถอน push ของเครื่องก่อน (ต้องใช้ session)
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", flexDirection: "column", padding: "40px 20px 32px", gap: 20, overflowY: "auto" }}>

      {/* Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: `${ACCENT}15`, border: `1.5px solid ${ACCENT}40`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MapPin size={28} color={ACCENT} />
        </div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: TEXT }}>การติดตามตำแหน่ง</p>
        <p style={{ margin: 0, fontSize: 14, color: TEXT2, lineHeight: 1.6 }}>
          Khaiphone ต้องการเข้าถึงพิกัด GPS<br />
          ของคุณระหว่างเวลาทำงาน
        </p>
      </div>

      {/* What we use it for */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 18px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <ShieldCheck size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          เราใช้ตำแหน่งของคุณเพื่อ
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ALLOWS.map(t => (
            <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${ACCENT}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: ACCENT, marginTop: 1 }}>✓</div>
              <p style={{ margin: 0, fontSize: 13, color: TEXT, lineHeight: 1.5 }}>{t}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What we don't do */}
      <div style={{ background: "#1a0e0e", border: `1px solid ${RED}30`, borderRadius: 14, padding: "16px 18px" }}>
        <p style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: RED, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <X size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
          เราจะไม่
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {DISALLOWS.map(t => (
            <div key={t} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${RED}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, color: RED, marginTop: 1 }}>✕</div>
              <p style={{ margin: 0, fontSize: 13, color: "#fca5a5", lineHeight: 1.5 }}>{t}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PDPA note */}
      <div style={{ background: "#1a1500", border: `1px solid #78350f`, borderRadius: 12, padding: "12px 14px" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#fde68a", lineHeight: 1.6 }}>
          ข้อมูลตำแหน่งจัดเก็บตามนโยบาย PDPA<br />
          ประวัติตำแหน่งจะถูกลบอัตโนมัติหลัง 7 วัน<br />
          คุณสามารถถอนความยินยอมได้ตลอดเวลาในหน้าโปรไฟล์
        </p>
      </div>

      {/* Agreement checkbox */}
      <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
        <div onClick={() => setAgreed(p => !p)}
          style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${agreed ? ACCENT : BORDER}`, background: agreed ? ACCENT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1, transition: "all 0.15s" }}>
          {agreed && <span style={{ color: "#000", fontSize: 13, fontWeight: 700 }}>✓</span>}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: TEXT2, lineHeight: 1.5 }}>
          ฉันเข้าใจและยินยอมให้ Khaiphone ติดตามตำแหน่งของฉันระหว่างเวลา shift
        </p>
      </label>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <button
          onClick={handleAccept}
          disabled={!agreed || saving}
          style={{ padding: "14px 0", borderRadius: 12, border: "none", background: agreed ? ACCENT : BORDER, color: agreed ? "#000" : TEXT2, fontSize: 16, fontWeight: 700, cursor: agreed ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "background 0.15s" }}>
          {saving ? "กำลังบันทึก..." : "ยอมรับและเริ่มใช้งาน"}
        </button>
        <button
          onClick={handleDecline}
          disabled={declining}
          style={{ padding: "12px 0", borderRadius: 12, border: "none", background: "transparent", color: TEXT2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          {declining ? "กำลังออกจากระบบ..." : "ไม่ยอมรับ"}
        </button>
      </div>

    </div>
  );
}
