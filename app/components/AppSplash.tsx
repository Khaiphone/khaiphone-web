"use client";

import { useEffect, useState } from "react";

// Splash ระหว่างรอ auth/bootstrap + ข้อมูลหลักโหลดครบ — CSS ล้วน เด้งทันที ไม่ดึงข้อมูล/lib หนัก
// โหมด:
//  - done === undefined → static (โชว์ตลอด ใช้ช่วง !ready/auth)
//  - done = boolean     → overlay: คลุมจน (done && ครบขั้นต่ำ minMs) แล้ว fade ออก (ช่วงรอข้อมูล)
// light: true = โทนสว่าง (ตัวหนังสือ/เส้นเข้ม) ให้เข้ากับธีมแอปตอนโหมดสว่าง
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

  const subColor = light ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.5)";
  const cardBorder = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
  const barTrack = light ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.1)";

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
      {/* เวที: glow + คลื่น + โลโก้ลอย */}
      <div style={{ position: "relative", width: 184, height: 184, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* แสงเรือง (glow) ด้านหลัง */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            width: 184,
            height: 184,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accent}55 0%, ${accent}14 45%, ${accent}00 68%)`,
            animation: "kp-splash-glow 2.8s ease-in-out infinite",
          }}
        />
        {/* คลื่นกระเพื่อม 3 ชั้น (staggered, นุ่ม) */}
        {[0, 0.9, 1.8].map((delay) => (
          <span
            key={delay}
            aria-hidden
            style={{
              position: "absolute",
              width: 130,
              height: 130,
              borderRadius: "50%",
              border: `1.5px solid ${accent}`,
              animation: "kp-splash-ripple 2.7s cubic-bezier(0.22,0.61,0.36,1) infinite",
              animationDelay: `${delay}s`,
            }}
          />
        ))}
        {/* เส้นแสงวิ่งรอบวง (light arc) */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            width: 134,
            height: 134,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${accent}00 0deg, ${accent}00 240deg, ${accent}cc 330deg, #ffffff 360deg)`,
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2.5px))",
            filter: `drop-shadow(0 0 5px ${accent})`,
            animation: "kp-splash-spin 1.5s linear infinite",
          }}
        />
        {/* โลโก้ลอย + แสงวิ่งผ่าน (shine) */}
        <div style={{ animation: "kp-splash-float 3.4s ease-in-out infinite" }}>
          <div
            style={{
              position: "relative",
              width: 104,
              height: 104,
              borderRadius: 24,
              overflow: "hidden",
              border: `1px solid ${cardBorder}`,
              boxShadow: `0 14px 40px ${accent}33, 0 4px 12px rgba(0,0,0,0.18)`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logo}
              alt={name}
              width={104}
              height={104}
              style={{ display: "block", width: "100%", height: "100%", animation: "kp-splash-breathe 3.4s ease-in-out infinite" }}
            />
            {/* แสงวิ่งผ่านโลโก้ */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(115deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
                animation: "kp-splash-shine 3.6s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      <p style={{ margin: "28px 0 0", color: accent, fontSize: 19, fontWeight: 800, letterSpacing: 0.6, animation: "kp-splash-rise 0.6s ease 0.1s both" }}>
        {name}
      </p>

      {/* progress bar เรียวๆ (indeterminate) — ดูพรีเมียมกว่าจุดกระพริบ */}
      <div
        style={{
          position: "relative",
          width: 130,
          height: 3,
          marginTop: 18,
          borderRadius: 3,
          overflow: "hidden",
          background: barTrack,
          animation: "kp-splash-rise 0.6s ease 0.2s both",
        }}
      >
        <span
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "45%",
            height: "100%",
            borderRadius: 3,
            background: `linear-gradient(90deg, ${accent}00, ${accent}, ${accent}00)`,
            animation: "kp-splash-bar 1.4s ease-in-out infinite",
          }}
        />
      </div>
      <p style={{ margin: "12px 0 0", color: subColor, fontSize: 12, fontWeight: 500, letterSpacing: 0.3, animation: "kp-splash-rise 0.6s ease 0.3s both" }}>
        กำลังโหลด
      </p>

      <style>{`
        @keyframes kp-splash-spin { to { transform: rotate(360deg); } }
        @keyframes kp-splash-ripple {
          0%   { transform: scale(0.6); opacity: 0.45; }
          70%  { opacity: 0; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        @keyframes kp-splash-glow {
          0%, 100% { transform: scale(0.82); opacity: 0.5; }
          50%      { transform: scale(1.04); opacity: 0.9; }
        }
        @keyframes kp-splash-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.04); }
        }
        @keyframes kp-splash-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-7px); }
        }
        @keyframes kp-splash-shine {
          0%       { transform: translateX(-130%); }
          55%, 100% { transform: translateX(130%); }
        }
        @keyframes kp-splash-bar {
          0%   { transform: translateX(-120%); }
          100% { transform: translateX(330%); }
        }
        @keyframes kp-splash-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
