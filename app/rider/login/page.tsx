"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

const BG     = "#111111";
const CARD   = "#1C1C1E";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

export default function RiderLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง"); return; }
    router.replace("/rider");
  }

  return (
    <div style={{ minHeight: "100dvh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 36 }}>
        <Image src="/rider-apple-touch-icon.png" alt="KP Rider" width={72} height={72} style={{ borderRadius: 18 }} unoptimized />
        <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: ACCENT }}>KP Rider</p>
        <p style={{ margin: 0, fontSize: 13, color: TEXT2 }}>เข้าสู่ระบบไรเดอร์ Khaiphone</p>
      </div>

      <form onSubmit={handleLogin} style={{ width: "100%", maxWidth: 340, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, color: TEXT2 }}>อีเมล</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="rider@khaiphone.com"
            required
            autoComplete="email"
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: TEXT, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 13, color: TEXT2 }}>รหัสผ่าน</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", fontSize: 15, color: TEXT, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {error && (
          <p style={{ margin: 0, fontSize: 13, color: "#FF453A", textAlign: "center" }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: 4, padding: "14px 0", borderRadius: 12, border: "none", background: loading ? BORDER : ACCENT, color: loading ? TEXT2 : "#000", fontSize: 16, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "background 0.15s" }}
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </div>
  );
}
