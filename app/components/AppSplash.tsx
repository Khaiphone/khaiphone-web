"use client";

import { useEffect, useState } from "react";

// Splash ระหว่างรอ auth/bootstrap + ข้อมูลหลักโหลดครบ — CSS ล้วน เด้งทันที ไม่ดึงข้อมูล/lib หนัก
// โหมด:
//  - done === undefined → static (โชว์ตลอด ใช้ช่วง !ready/auth)
//  - done = boolean     → overlay: คลุมจน (done && ครบขั้นต่ำ minMs) แล้ว fade ออก (ช่วงรอข้อมูล)
export default function AppSplash({
  logo,
  name,
  accent,
  bg,
  done,
  minMs = 800,
}: {
  logo: string;
  name: string;
  accent: string;
  bg: string;
  done?: boolean;
  minMs?: number;
}) {
  const controlled = done !== undefined;
  const [minElapsed, setMinElapsed] = useState(!controlled);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!controlled) return;
    const t = setTimeout(() => setMinElapsed(true), minMs);
    return () => clearTimeout(t);
  }, [controlled, minMs]);

  const fading = controlled && done === true && minElapsed;

  useEffect(() => {
    if (!fading) return;
    const t = setTimeout(() => setHidden(true), 400); // หลัง fade เสร็จค่อยถอดออก
    return () => clearTimeout(t);
  }, [fading]);

  if (hidden) return null;

  return (
    <div
      suppressHydrationWarning
      style={{
        position: "fixed",
        inset: 0,
        background: bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: "opacity 0.4s ease",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div style={{ position: "relative", width: 92, height: 92, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* วงแหวนหมุน */}
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${accent}26`,
            borderTopColor: accent,
            animation: "kp-splash-spin 0.9s linear infinite",
          }}
        />
        {/* โลโก้ pulse */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          width={52}
          height={52}
          style={{ borderRadius: 13, animation: "kp-splash-pulse 1.6s ease-in-out infinite" }}
        />
      </div>
      <p style={{ margin: "22px 0 0", color: accent, fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>{name}</p>
      <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.38)", fontSize: 12 }}>กำลังโหลด...</p>
      <style>{`
        @keyframes kp-splash-spin { to { transform: rotate(360deg); } }
        @keyframes kp-splash-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.9); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
}
