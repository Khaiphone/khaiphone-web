"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserCircle, Mail, Shield, LogOut, Key } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminRole } from "@/app/actions/admin-users";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

const ROLE_LABEL: Record<AdminRole, string> = {
  owner: "เจ้าของ / ผู้จัดการ",
  staff: "พนักงาน",
};

export default function ProfilePage() {
  const router = useRouter();
  const [name, setName]           = useState("");
  const [email, setEmail]         = useState("");
  const [role, setRole]           = useState<AdminRole | null>(null);
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPw, setNewPw]               = useState("");
  const [confirmPw, setConfirmPw]       = useState("");
  const [pwMsg, setPwMsg]               = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw]         = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email ?? "");
      const profile = await fetchMyProfile(data.user.id);
      if (profile) {
        setName(profile.name);
        setRole(profile.role);
      }
    });
  }, []);

  async function handleChangePassword() {
    if (newPw.length < 8) { setPwMsg({ ok: false, text: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" }); return; }
    setSavingPw(true); setPwMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPw(false);
    if (error) { setPwMsg({ ok: false, text: error.message }); return; }
    setPwMsg({ ok: true, text: "เปลี่ยนรหัสผ่านสำเร็จ" });
    setNewPw(""); setConfirmPw("");
    setTimeout(() => { setShowChangePw(false); setPwMsg(null); }, 2000);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "52px 16px 32px", maxWidth: 560, margin: "0 auto" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", color: TEXT2, display: "flex", padding: 4 }}>
            <ChevronLeft size={22} />
          </button>
          <h1 style={{ color: TEXT, fontSize: 20, fontWeight: 700, margin: 0 }}>บัญชีผู้ใช้</h1>
        </div>

        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%",
            background: `${GOLD}18`, border: `2px solid ${GOLD}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 12px",
          }}>
            {name ? (
              <span style={{ color: GOLD, fontSize: 28, fontWeight: 700 }}>{name.charAt(0)}</span>
            ) : (
              <UserCircle size={44} color={GOLD} />
            )}
          </div>
          <p style={{ color: TEXT, fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>
            {name || "กำลังโหลด..."}
          </p>
          <p style={{ color: TEXT3, fontSize: 13, margin: 0 }}>{email}</p>
        </div>

        {/* Info */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          {[
            { icon: Mail,   label: "อีเมล",          value: email || "กำลังโหลด..." },
            { icon: Shield, label: "สิทธิ์การใช้งาน", value: role ? ROLE_LABEL[role] : "กำลังโหลด..." },
          ].map(({ icon: Icon, label, value }, i) => (
            <div
              key={label}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "14px 16px",
                borderBottom: i === 0 ? `1px solid ${BORDER}` : "none",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${GOLD}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} color={GOLD} />
              </div>
              <div>
                <p style={{ color: TEXT3, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 2px" }}>{label}</p>
                <p style={{ color: TEXT, fontSize: 14, fontWeight: 500, margin: 0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Change password */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, marginBottom: 10, overflow: "hidden" }}>
          <button
            onClick={() => { setShowChangePw(v => !v); setPwMsg(null); setNewPw(""); setConfirmPw(""); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", background: "none", border: "none",
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF2FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Key size={16} color="#4F46E5" />
            </div>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ color: TEXT, fontSize: 14, fontWeight: 600, margin: "0 0 2px" }}>เปลี่ยนรหัสผ่าน</p>
              <p style={{ color: TEXT3, fontSize: 12, margin: 0 }}>ตั้งรหัสผ่านใหม่ได้ทันที</p>
            </div>
            <span style={{ color: TEXT3, fontSize: 18, lineHeight: 1 }}>{showChangePw ? "−" : "+"}</span>
          </button>

          {showChangePw && (
            <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "รหัสผ่านใหม่", value: newPw, onChange: setNewPw, placeholder: "อย่างน้อย 8 ตัวอักษร" },
                { label: "ยืนยันรหัสผ่านใหม่", value: confirmPw, onChange: setConfirmPw, placeholder: "พิมพ์ซ้ำอีกครั้ง" },
              ].map(({ label, value, onChange, placeholder }) => (
                <div key={label} style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 11, color: TEXT2, fontWeight: 600, display: "block", marginBottom: 4 }}>{label}</label>
                  <input
                    type="password" value={value} onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 14, color: TEXT, fontFamily: "inherit", outline: "none" }}
                  />
                </div>
              ))}
              {pwMsg && (
                <p style={{ color: pwMsg.ok ? "#10B981" : "#EF4444", fontSize: 12, margin: "4px 0 0" }}>{pwMsg.text}</p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={savingPw}
                style={{ marginTop: 4, padding: "10px 0", borderRadius: 10, border: "none", background: GOLD, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: savingPw ? 0.6 : 1 }}
              >
                {savingPw ? "กำลังบันทึก..." : "บันทึกรหัสผ่านใหม่"}
              </button>
            </div>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 14,
            padding: "14px 16px",
            background: CARD, border: "1px solid rgba(239,68,68,0.2)", borderRadius: 16,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LogOut size={16} color="#EF4444" />
          </div>
          <p style={{ color: "#EF4444", fontSize: 14, fontWeight: 600, margin: 0 }}>ออกจากระบบ</p>
        </button>

        <p style={{ color: TEXT3, fontSize: 12, textAlign: "center", marginTop: 24 }}>
          ขายไอโฟน.com Admin v1.0.0
        </p>

      </div>
    </div>
  );
}
