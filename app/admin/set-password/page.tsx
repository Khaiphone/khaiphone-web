"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

const BG     = "#F5F5F7";
const CARD   = "#FFFFFF";
const BORDER = "#E5E5E5";
const TEXT   = "#111111";
const TEXT2  = "#666666";
const TEXT3  = "#AAAAAA";
const GOLD   = "#B8860B";

export default function SetPasswordPage() {
  const router = useRouter();
  const [status, setStatus]     = useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    const hash   = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token  = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type          = params.get("type");

    if ((type === "invite" || type === "recovery") && access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        setStatus(error ? "invalid" : "ready");
      });
    } else {
      setStatus("invalid");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    if (password !== confirm)  { setError("รหัสผ่านไม่ตรงกัน"); return; }

    setSaving(true);
    setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setSaving(false); return; }

    setStatus("done");
    setTimeout(() => router.push("/admin/dashboard"), 1500);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `${GOLD}18`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <KeyRound size={26} color={GOLD} />
          </div>
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>ตั้งรหัสผ่าน</h1>
          <p style={{ color: TEXT2, fontSize: 14, margin: 0 }}>Khaiphone.com Admin</p>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 24 }}>

          {status === "loading" && (
            <p style={{ color: TEXT3, textAlign: "center", fontSize: 14 }}>กำลังตรวจสอบลิงก์...</p>
          )}

          {status === "invalid" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#EF4444", fontSize: 14, marginBottom: 12 }}>ลิงก์ไม่ถูกต้องหรือหมดอายุแล้ว</p>
              <p style={{ color: TEXT3, fontSize: 13 }}>กรุณาขอลิงก์ใหม่จากผู้ดูแลระบบ</p>
            </div>
          )}

          {status === "done" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#D1FAE5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <Check size={24} color="#10B981" />
              </div>
              <p style={{ color: "#10B981", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>ตั้งรหัสผ่านสำเร็จ</p>
              <p style={{ color: TEXT3, fontSize: 13 }}>กำลังพาไปหน้าหลัก...</p>
            </div>
          )}

          {status === "ready" && (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>รหัสผ่านใหม่</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    autoFocus
                    style={{
                      width: "100%", boxSizing: "border-box",
                      padding: "10px 40px 10px 12px",
                      border: `1px solid ${BORDER}`, borderRadius: 10,
                      fontSize: 14, color: TEXT, fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: TEXT3, display: "flex" }}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", color: TEXT2, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>ยืนยันรหัสผ่าน</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 12px",
                    border: `1px solid ${confirm && confirm !== password ? "#EF4444" : BORDER}`, borderRadius: 10,
                    fontSize: 14, color: TEXT, fontFamily: "inherit", outline: "none",
                  }}
                />
              </div>

              {error && <p style={{ color: "#EF4444", fontSize: 13, margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={saving || !password || !confirm}
                style={{
                  padding: "12px", border: "none", borderRadius: 10,
                  background: GOLD, color: "#fff", fontSize: 15, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit",
                  opacity: saving || !password || !confirm ? 0.6 : 1,
                }}
              >
                {saving ? "กำลังบันทึก..." : "ยืนยันรหัสผ่าน"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
