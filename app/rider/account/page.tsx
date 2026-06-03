"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, LogOut, Wifi, WifiOff, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import { setRiderOnlineStatus, fetchRiderOnlineStatus } from "@/app/actions/rider";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const GOLD   = "#D4A843";
const GREEN  = "#30D158";
const RED    = "#FF453A";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ name: string; email: string; role: string } | null>(null);
  const [isOnline, setIsOnline]   = useState(false);
  const [toggling, setToggling]   = useState(false);
  const [userId, setUserId]       = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      const [p, online] = await Promise.all([
        fetchMyProfile(session.user.id),
        fetchRiderOnlineStatus(session.user.id),
      ]);
      if (p) setProfile({ name: p.name ?? "", email: p.email ?? "", role: p.role });
      setIsOnline(online);
    });
  }, []);

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

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Profile card */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <UserCircle size={30} color="#000" />
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>{profile?.name ?? "..."}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: TEXT2 }}>{profile?.email}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: GOLD, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {profile?.role === "owner" ? "เจ้าของ" : "พนักงาน / ไรเดอร์"}
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
          {/* Toggle switch */}
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
        <a href="https://admin.khaiphone.com/admin/profile" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", textDecoration: "none", borderBottom: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 15, color: TEXT }}>แก้ไขโปรไฟล์</span>
          <ChevronRight size={16} color={TEXT2} />
        </a>
        {profile?.role === "owner" && (
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
