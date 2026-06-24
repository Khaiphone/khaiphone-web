"use client";

import { useEffect, useState } from "react";

// Splash ระหว่างรอ auth/bootstrap + ข้อมูลหลักโหลดครบ — CSS ล้วน เด้งทันที ไม่ดึงข้อมูล/lib หนัก
// โหมด:
//  - done === undefined → static (โชว์ตลอด ใช้ช่วง !ready/auth)
//  - done = boolean     → overlay: คลุมจน (done && ครบขั้นต่ำ minMs) แล้ว fade ออก (ช่วงรอข้อมูล)
// light: true = โทนสว่าง (ตัวหนังสือเข้ม) ให้เข้ากับธีมแอปตอนโหมดสว่าง
export default function AppSplash({
  logo,
  name,
  accent,
  bg,
  light = false,
  done,
  minMs = 800,
}: {
  logo: string;
  name: string;
  accent: string;
  bg: string;
  light?: boolean;
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

  const subColor = light ? "rgba(0,0,0,0.42)" : "rgba(255,255,255,0.42)";

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
      {/* โซนโลโก้ + คลื่นกระเพื่อม */}
      <div style={{ position: "relative", width: 150, height: 150, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* แสงเรือง (glow) ด้านหลังโลโก้ */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            width: 150,
            height: 150,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}55 0%, ${accent}00 65%)`,
            animation: "kp-splash-glow 2.4s ease-in-out infinite",
          }}
        />
        {/* คลื่นกระเพื่อม 3 ชั้น (staggered) */}
        {[0, 0.8, 1.6].map((delay) => (
          <span
            key={delay}
            aria-hidden
            style={{
              position: "absolute",
              width: 150,
              height: 150,
              borderRadius: "50%",
              border: `1.5px solid ${accent}`,
              animation: "kp-splash-ripple 2.4s cubic-bezier(0.2,0.6,0.3,1) infinite",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
        {/* โลโก้ — ใหญ่ขึ้น + หายใจเบาๆ */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt={name}
          width={96}
          height={96}
          style={{
            position: "relative",
            borderRadius: 22,
            boxShadow: `0 8px 30px ${accent}40`,
            animation: "kp-splash-breathe 2.4s ease-in-out infinite",
          }}
        />
      </div>

      <p style={{ margin: "30px 0 0", color: accent, fontSize: 18, fontWeight: 800, letterSpacing: 0.5, animation: "kp-splash-rise 0.6s ease 0.1s both" }}>
        {name}
      </p>
      <p style={{ margin: "7px 0 0", color: subColor, fontSize: 12.5, fontWeight: 500, animation: "kp-splash-rise 0.6s ease 0.2s both" }}>
        กำลังโหลด
        <span style={{ animation: "kp-splash-blink 1.4s steps(1) infinite" }}>.</span>
        <span style={{ animation: "kp-splash-blink 1.4s steps(1) 0.2s infinite" }}>.</span>
        <span style={{ animation: "kp-splash-blink 1.4s steps(1) 0.4s infinite" }}>.</span>
      </p>

      <style>{`
        @keyframes kp-splash-ripple {
          0%   { transform: scale(0.5); opacity: 0.5; }
          70%  { opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes kp-splash-glow {
          0%, 100% { transform: scale(0.85); opacity: 0.55; }
          50%      { transform: scale(1.05); opacity: 0.9; }
        }
        @keyframes kp-splash-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.07); }
        }
        @keyframes kp-splash-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes kp-splash-blink {
          0%, 50%   { opacity: 1; }
          50.01%, 100% { opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
