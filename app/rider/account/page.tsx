"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, LogOut, Wifi, WifiOff, ChevronRight, Moon, Sun, ShieldX, Camera } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { supabase } from "@/lib/supabase";
import { setRiderOnlineStatus } from "@/app/actions/rider";
import { saveLocationConsent } from "@/app/actions/rider-tracking";
import { updateRiderAvatar } from "@/app/actions/admin-users";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";

export default function AccountPage() {
  const router = useRouter();
  const { BG: _BG, CARD, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2, isDark, toggleTheme } = useRiderTheme();
  const { userId, riderName, riderEmail, riderRole, avatarUrl, setAvatarUrl, isOnline, setIsOnline } = useRiderSession();
  const [toggling, setToggling] = useState(false);
  const [showConsentRevoke, setShowConsentRevoke] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleRevokeConsent() {
    setRevoking(true);
    await saveLocationConsent(false);
    setRevoking(false);
    setShowConsentRevoke(false);
    router.replace("/rider/consent");
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(url);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  }

  async function confirmUpload() {
    if (!previewFile || !userId) return;
    setUploading(true);
    const urlToRevoke = previewUrl;
    setPreviewFile(null);
    setPreviewUrl(null);
    try {
      const ext = previewFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, previewFile, { upsert: true, contentType: previewFile.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${publicUrl}?t=${Date.now()}`;
      await updateRiderAvatar(userId, url);
      setAvatarUrl(url);
    } finally {
      setUploading(false);
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    }
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
        {/* Avatar with upload button */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", position: "relative", display: "block" }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={riderName}
                style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserCircle size={34} color="#000" />
              </div>
            )}
            {/* Camera overlay */}
            <div style={{
              position: "absolute", bottom: 0, right: 0,
              width: 22, height: 22, borderRadius: "50%",
              background: uploading ? TEXT2 : ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: `2px solid ${CARD}`,
            }}>
              {uploading
                ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                : <Camera size={11} color="#000" />
              }
            </div>
          </button>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

        <button
          onClick={() => router.push("/rider/stats")}
          style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", borderBottom: `1px solid ${BORDER}` }}
        >
          <span style={{ fontSize: 15, color: TEXT }}>สถิติการทำงาน (Shift)</span>
          <ChevronRight size={16} color={TEXT2} />
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

      {/* Privacy / Consent */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ความเป็นส่วนตัว</p>
        </div>
        <button
          onClick={() => setShowConsentRevoke(true)}
          style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldX size={20} color={TEXT2} />
            <span style={{ fontSize: 15, color: TEXT }}>ถอนความยินยอมการติดตามตำแหน่ง</span>
          </div>
          <ChevronRight size={16} color={TEXT2} />
        </button>
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

      {/* ── Avatar preview bottom sheet ── */}
      {previewUrl && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
          onClick={cancelPreview}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", background: CARD, borderRadius: "20px 20px 0 0", padding: "28px 20px", paddingBottom: "calc(28px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
          >
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>รูปโปรไฟล์</p>

            {/* Circular preview */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="preview"
              style={{ width: 140, height: 140, borderRadius: "50%", objectFit: "cover", border: `3px solid ${ACCENT}` }}
            />

            <p style={{ margin: 0, fontSize: 13, color: TEXT2, textAlign: "center" }}>
              รูปจะถูกตัดเป็นวงกลมอัตโนมัติ<br />เลือกรูปที่มีหน้าอยู่ตรงกลางจะดูดีที่สุด
            </p>

            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={confirmUpload}
                style={{ padding: "14px 0", borderRadius: 12, border: "none", background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                ใช้รูปนี้
              </button>
              <button
                onClick={() => { cancelPreview(); fileInputRef.current?.click(); }}
                style={{ padding: "14px 0", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                เลือกรูปใหม่
              </button>
              <button
                onClick={cancelPreview}
                style={{ padding: "14px 0", borderRadius: 12, border: "none", background: "transparent", color: TEXT2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Consent revoke confirmation bottom sheet */}
      {showConsentRevoke && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-end" }} onClick={() => setShowConsentRevoke(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: CARD, borderRadius: "20px 20px 0 0", padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <ShieldX size={22} color={RED} />
              <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: TEXT }}>ถอนความยินยอม</p>
            </div>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: TEXT2, lineHeight: 1.6 }}>
              หากถอนความยินยอม ระบบจะไม่สามารถติดตามตำแหน่งของคุณได้<br />
              คุณจะต้องให้ความยินยอมใหม่ก่อนจึงจะใช้งานแอปได้อีกครั้ง
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={handleRevokeConsent}
                disabled={revoking}
                style={{ padding: "13px 0", borderRadius: 12, border: "none", background: `rgba(255,69,58,0.12)`, color: RED, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: revoking ? 0.6 : 1 }}
              >
                {revoking ? "กำลังบันทึก..." : "ยืนยันถอนความยินยอม"}
              </button>
              <button
                onClick={() => setShowConsentRevoke(false)}
                style={{ padding: "13px 0", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT2, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
