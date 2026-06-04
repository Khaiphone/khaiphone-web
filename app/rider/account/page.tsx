"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, LogOut, Wifi, WifiOff, ChevronRight, Moon, Sun } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { supabase } from "@/lib/supabase";
import { setRiderOnlineStatus } from "@/app/actions/rider";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";

export default function AccountPage() {
  const router = useRouter();
  const { BG: _BG, CARD, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2, isDark, toggleTheme } = useRiderTheme();
  const { userId, riderName, riderEmail, riderRole, isOnline, setIsOnline } = useRiderSession();
  const [toggling, setToggling] = useState(false);

  async function toggleOnline() {
    setToggling(true);
    const next = !isOnline;
    setIsOnline(next);
    await setRiderOnlineStatus(next);
    setToggling(false);
  }

  async function handleLogout() {
    if (userId) await setRiderOnlineStatus(false).catch(() => {});
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  // account page never shows a loading skeleton — data comes from context instantly
  if (!userId) return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Sk w={22} h={22} r={11} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Sk w={80} h={14} />
            <Sk w={110} h={11} />
          </div>
        </div>
        <Sk w={52} h={30} r={15} />
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        {[0,1].map(i => (
          <div key={i} style={{ padding: "16px 20px", borderBottom: i === 0 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
            <Sk w={20} h={20} r={4} />
            <Sk w="50%" h={14} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Profile card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <UserCircle size={30} color="#000" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>{riderName}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: TEXT2 }}>{riderEmail}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {riderRole === "owner" ? "เจ้าของ" : "พนักงาน / ไรเดอร์"}
          </p>
        </div>
      </div>

      {/* Online status */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>สถานะ</p>
        </div>
        <button
          onClick={toggleOnline}
          disabled={toggling}
          style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isOnline ? <Wifi size={20} color={GREEN} /> : <WifiOff size={20} color={TEXT2} />}
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TEXT }}>สถานะการรับงาน</p>
              <p style={{ margin: 0, fontSize: 12, color: isOnline ? GREEN : TEXT2 }}>
                {isOnline ? "พร้อมรับงาน" : "ออฟไลน์"}
              </p>
            </div>
          </div>
          <div style={{
            width: 48, height: 28, borderRadius: 14,
            background: isOnline ? GREEN : BORDER,
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: 3, left: isOnline ? 23 : 3,
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
        </button>
      </div>

      {/* Settings */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ทั่วไป</p>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", borderBottom: `1px solid ${BORDER}` }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isDark ? <Moon size={20} color={TEXT2} /> : <Sun size={20} color={TEXT2} />}
            <span style={{ fontSize: 15, color: TEXT }}>{isDark ? "โหมดมืด" : "โหมดสว่าง"}</span>
          </div>
          <div style={{
            width: 48, height: 28, borderRadius: 14,
            background: isDark ? BORDER : ACCENT,
            position: "relative", transition: "background 0.2s", flexShrink: 0,
          }}>
            <div style={{
              position: "absolute", top: 3, left: isDark ? 3 : 23,
              width: 22, height: 22, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
        </button>

        <a href="https://admin.khaiphone.com/admin/profile" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", textDecoration: "none", borderBottom: riderRole === "owner" ? `1px solid ${BORDER}` : "none" }}>
          <span style={{ fontSize: 15, color: TEXT }}>แก้ไขโปรไฟล์</span>
          <ChevronRight size={16} color={TEXT2} />
        </a>
        {riderRole === "owner" && (
          <a href="https://admin.khaiphone.com" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", textDecoration: "none" }}>
            <span style={{ fontSize: 15, color: TEXT }}>ไปหน้า Admin</span>
            <ChevronRight size={16} color={TEXT2} />
          </a>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={{
          width: "100%", padding: 16, borderRadius: 14,
          background: "rgba(255,69,58,0.1)", border: `1px solid rgba(255,69,58,0.3)`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontSize: 15, fontWeight: 600, color: RED, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        <LogOut size={18} />
        ออกจากระบบ
      </button>
    </div>
  );
}
