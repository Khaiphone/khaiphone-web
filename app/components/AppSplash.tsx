"use client";

// Splash ระหว่างรอ auth/bootstrap — CSS ล้วน เด้งทันที ไม่ดึงข้อมูล/ไม่ import lib หนัก
// โลโก้ pulse + วงแหวนหมุน + ชื่อแอป (ส่งสี/โลโก้/พื้นหลังตามแต่ละแอป)
export default function AppSplash({
  logo,
  name,
  accent,
  bg,
}: {
  logo: string;
  name: string;
  accent: string;
  bg: string;
}) {
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
