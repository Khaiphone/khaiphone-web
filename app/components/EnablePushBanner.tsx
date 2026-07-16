"use client";

import { useEffect, useState } from "react";
import { subscribeDeviceToPush, type SubscribeResult } from "@/lib/push-client";
import type { PushApp } from "@/app/actions/push";

// แถบเปิดการแจ้งเตือน — mount ใน shell ของทุก PWA
// เปิดแอพ → auto-attempt subscribe; ถ้าไม่สำเร็จและสิทธิ์ยังไม่ denied → โชว์แถบให้แตะ
// (iOS ขอสิทธิ์ได้เฉพาะจาก user gesture) · แตะตอน denied → บอกไปเปิดใน Settings
export default function EnablePushBanner({ app }: { app: PushApp }) {
  const [state, setState] = useState<SubscribeResult | "idle">("idle");

  useEffect(() => {
    let active = true;
    subscribeDeviceToPush(app).then(r => { if (active) setState(r); });
    return () => { active = false; };
  }, [app]);

  if (state !== "needs_gesture") return null;

  return (
    <button
      onClick={async () => {
        const r = await subscribeDeviceToPush(app); // จาก gesture จริง → iOS ขึ้น prompt
        setState(r);
        if (r === "denied") {
          alert("การแจ้งเตือนถูกปิดไว้สำหรับแอพนี้\nไปที่ การตั้งค่า > แอพนี้ > การแจ้งเตือน แล้วเปิด จากนั้นแตะแถบนี้อีกครั้ง");
        }
      }}
      style={{
        position: "fixed", top: "calc(env(safe-area-inset-top) + 8px)", left: 12, right: 12, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(184,134,11,0.45)",
        background: "#FEF3C7", color: "#92400E", fontSize: 13.5, fontWeight: 700,
        fontFamily: "inherit", cursor: "pointer", boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
      }}
    >
      🔔 แตะเพื่อเปิดการแจ้งเตือนบนเครื่องนี้
    </button>
  );
}
