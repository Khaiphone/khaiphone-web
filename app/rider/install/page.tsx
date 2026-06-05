"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getPlatform, type InstallStatus } from "@/lib/pwa-detect";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

const STEPS_IOS = [
  { n: 1, text: 'แตะปุ่ม "แชร์" (กล่องมีลูกศรขึ้น) ที่แถบล่างของ Safari' },
  { n: 2, text: 'เลื่อนลงแล้วเลือก "เพิ่มไปยังหน้าจอโฮม"' },
  { n: 3, text: 'กด "เพิ่ม" ที่มุมขวาบน' },
  { n: 4, text: "เปิดแอพจากไอคอนที่หน้าจอโฮม" },
];

const STEPS_ANDROID = [
  { n: 1, text: 'กดปุ่ม "ติดตั้ง KP Rider" ด้านล่าง' },
  { n: 2, text: 'กด "ติดตั้ง" ในกล่องยืนยัน' },
  { n: 3, text: "เปิดแอพจากไอคอนที่หน้าจอโฮม" },
];

export default function InstallPage() {
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [tab, setTab] = useState<"ios" | "android">("ios");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const p = getPlatform();
    setPlatform(p);
    setTab(p === "android" ? "android" : "ios");

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  }

  if (installed) {
    return (
      <div style={{ minHeight: "100dvh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, gap: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${ACCENT}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✓</div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>ติดตั้งเรียบร้อย!</p>
        <p style={{ margin: 0, fontSize: 14, color: TEXT2, textAlign: "center" }}>เปิดแอพจากไอคอนที่หน้าจอโฮมของคุณ</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", padding: "48px 20px 32px", gap: 24 }}>

      {/* Logo */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <Image src="/rider-apple-touch-icon.png" alt="KP Rider" width={72} height={72} style={{ borderRadius: 18 }} unoptimized />
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: ACCENT }}>KP Rider</p>
        <p style={{ margin: 0, fontSize: 14, color: TEXT2, textAlign: "center" }}>
          ติดตั้งแอพก่อนเริ่มใช้งาน<br />
          เพื่อรับการแจ้งเตือนและติดตามพิกัด
        </p>
      </div>

      {/* Tab selector */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 4, display: "flex", gap: 4, width: "100%", maxWidth: 340 }}>
        {(["ios", "android"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, padding: "8px 0", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
              background: tab === t ? ACCENT : "transparent",
              color: tab === t ? "#000" : TEXT2,
              fontFamily: "inherit",
              transition: "background 0.15s",
            }}>
            {t === "ios" ? "📱 iPhone" : "🤖 Android"}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px 20px", width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 16 }}>
        {(tab === "ios" ? STEPS_IOS : STEPS_ANDROID).map(s => (
          <div key={s.n} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${ACCENT}20`, border: `1.5px solid ${ACCENT}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: ACCENT }}>
              {s.n}
            </div>
            <p style={{ margin: 0, fontSize: 14, color: TEXT, lineHeight: 1.5 }}>{s.text}</p>
          </div>
        ))}
      </div>

      {/* Android install button */}
      {tab === "android" && deferredPrompt && (
        <button onClick={handleInstall}
          style={{ width: "100%", maxWidth: 340, padding: "14px 0", borderRadius: 12, border: "none", background: ACCENT, color: "#000", fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          ติดตั้ง KP Rider
        </button>
      )}

      {/* iOS note */}
      {tab === "ios" && (
        <div style={{ background: "#1c1c1e", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "12px 16px", width: "100%", maxWidth: 340 }}>
          <p style={{ margin: 0, fontSize: 12, color: TEXT2, lineHeight: 1.6 }}>
            ⚠ ต้องเปิดด้วย <strong style={{ color: TEXT }}>Safari</strong> เท่านั้น<br />
            Chrome บน iPhone ยังไม่รองรับการติดตั้ง
          </p>
        </div>
      )}

      {/* Desktop note */}
      {platform === "desktop" && (
        <div style={{ background: "#2c1a00", border: "1px solid #f97316", borderRadius: 12, padding: "12px 16px", width: "100%", maxWidth: 340 }}>
          <p style={{ margin: 0, fontSize: 13, color: "#fdba74", lineHeight: 1.6 }}>
            แอพนี้ออกแบบสำหรับมือถือ<br />
            กรุณาเปิดบนสมาร์ทโฟนของคุณ
          </p>
        </div>
      )}

    </div>
  );
}
