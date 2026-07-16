"use client";

import { unsubscribeDeviceFromPush } from "@/lib/push-client";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, LogOut, Wifi, WifiOff, ChevronRight, Moon, Sun, ShieldX, Camera } from "lucide-react";
import { Sk } from "@/app/rider/skeleton";
import { supabase } from "@/lib/supabase";
import { setRiderOnlineStatus } from "@/app/actions/rider";
import { saveLocationConsent } from "@/app/actions/rider-tracking";
import { updateRiderAvatar } from "@/app/actions/admin-users";
import { useRiderTheme } from "@/app/rider/theme";
import { useRiderSession } from "@/app/rider/context";

const PREVIEW_SIZE = 240; // diameter of the crop circle (px)
const OUT_SIZE     = 400; // exported image size (px)

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

export default function AccountPage() {
  const router = useRouter();
  const { BG: _BG, CARD, BORDER, ACCENT, GREEN, RED, TEXT, TEXT2, isDark, toggleTheme } = useRiderTheme();
  const { userId, riderName, riderEmail, riderRole, avatarUrl, setAvatarUrl, isOnline, setIsOnline } = useRiderSession();

  const [toggling,          setToggling]          = useState(false);
  const [showConsentRevoke, setShowConsentRevoke] = useState(false);
  const [revoking,          setRevoking]          = useState(false);
  const [uploading,         setUploading]         = useState(false);

  // ── Crop state ──────────────────────────────────────────────────────────────
  const [previewFile,  setPreviewFile]  = useState<File | null>(null);
  const [previewUrl,   setPreviewUrl]   = useState<string | null>(null);
  const [imgLoaded,    setImgLoaded]    = useState(false);
  const [scale,        setScale]        = useState(1);
  const [offset,       setOffset]       = useState({ x: 0, y: 0 });

  // Refs so touch handlers see current values without stale closures
  const scaleRef   = useRef(1);
  const offsetRef  = useRef({ x: 0, y: 0 });
  const imgRef     = useRef<HTMLImageElement>(null);
  const cropRef    = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const touchRef   = useRef<{ type: "none"|"pan"|"pinch"; lastX: number; lastY: number; initDist: number; initScale: number }>(
    { type: "none", lastX: 0, lastY: 0, initDist: 0, initScale: 1 }
  );

  // Reset crop state when a new file is picked
  useEffect(() => {
    setImgLoaded(false);
    scaleRef.current  = 1;
    offsetRef.current = { x: 0, y: 0 };
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [previewUrl]);

  function getCoverScale(img: HTMLImageElement) {
    return Math.max(PREVIEW_SIZE / img.naturalWidth, PREVIEW_SIZE / img.naturalHeight);
  }
  function clampOffset(x: number, y: number, s: number) {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return { x, y };
    const ts   = getCoverScale(img) * s;
    const maxX = Math.max(0, (img.naturalWidth  * ts - PREVIEW_SIZE) / 2);
    const maxY = Math.max(0, (img.naturalHeight * ts - PREVIEW_SIZE) / 2);
    return { x: clamp(x, -maxX, maxX), y: clamp(y, -maxY, maxY) };
  }

  // Non-passive touch listeners so preventDefault() stops page scroll
  useEffect(() => {
    const el = cropRef.current;
    if (!el || !previewUrl || !imgLoaded) return;

    function onTouchStart(e: TouchEvent) {
      e.preventDefault();
      if (e.touches.length === 1) {
        touchRef.current = { type: "pan", lastX: e.touches[0].clientX, lastY: e.touches[0].clientY, initDist: 0, initScale: scaleRef.current };
      } else if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        touchRef.current = { type: "pinch", lastX: 0, lastY: 0, initDist: Math.sqrt(dx*dx + dy*dy), initScale: scaleRef.current };
      }
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault();
      const t = touchRef.current;
      if (t.type === "pan" && e.touches.length === 1) {
        const dx = e.touches[0].clientX - t.lastX;
        const dy = e.touches[0].clientY - t.lastY;
        touchRef.current.lastX = e.touches[0].clientX;
        touchRef.current.lastY = e.touches[0].clientY;
        const newOff = clampOffset(offsetRef.current.x + dx, offsetRef.current.y + dy, scaleRef.current);
        offsetRef.current = newOff;
        setOffset({ ...newOff });
      } else if (t.type === "pinch" && e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const dist     = Math.sqrt(dx*dx + dy*dy);
        const newScale = clamp(t.initScale * (dist / t.initDist), 1, 4);
        const newOff   = clampOffset(offsetRef.current.x, offsetRef.current.y, newScale);
        scaleRef.current  = newScale;
        offsetRef.current = newOff;
        setScale(newScale);
        setOffset({ ...newOff });
      }
    }

    function onTouchEnd() { touchRef.current.type = "none"; }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
    };
  }, [previewUrl, imgLoaded]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  async function toggleOnline() {
    setToggling(true);
    const next = !isOnline;
    setIsOnline(next);
    await setRiderOnlineStatus(next);
    setToggling(false);
  }

  async function handleLogout() {
    if (userId) await setRiderOnlineStatus(false).catch(() => {});
    await unsubscribeDeviceFromPush(); // ถอน push ของเครื่องก่อน (ต้องใช้ session)
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    if (fileRef.current) fileRef.current.value = "";
  }

  function cancelPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewFile(null);
    setPreviewUrl(null);
  }

  async function confirmUpload() {
    const img = imgRef.current;
    if (!previewFile || !userId || !img || !img.naturalWidth) return;

    const cs  = getCoverScale(img);
    const ts  = cs * scaleRef.current;
    const ox  = offsetRef.current.x;
    const oy  = offsetRef.current.y;

    // Draw cropped circle to canvas
    const canvas = document.createElement("canvas");
    canvas.width  = OUT_SIZE;
    canvas.height = OUT_SIZE;
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(OUT_SIZE/2, OUT_SIZE/2, OUT_SIZE/2, 0, Math.PI*2);
    ctx.clip();
    const ratio = OUT_SIZE / PREVIEW_SIZE;
    const imgX  = PREVIEW_SIZE/2 + ox - (img.naturalWidth  * ts) / 2;
    const imgY  = PREVIEW_SIZE/2 + oy - (img.naturalHeight * ts) / 2;
    ctx.drawImage(img, imgX * ratio, imgY * ratio, img.naturalWidth * ts * ratio, img.naturalHeight * ts * ratio);

    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob(b => b ? res(b) : rej(new Error("export failed")), "image/jpeg", 0.92)
    );

    setUploading(true);
    const urlToRevoke = previewUrl;
    setPreviewFile(null);
    setPreviewUrl(null);

    try {
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(`${userId}.jpg`, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(`${userId}.jpg`);
      const url = `${publicUrl}?t=${Date.now()}`;
      await updateRiderAvatar(userId, url);
      setAvatarUrl(url);
    } finally {
      setUploading(false);
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
    }
  }

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (!userId) return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Sk w={22} h={22} r={11} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <Sk w={80} h={14} /><Sk w={110} h={11} />
          </div>
        </div>
        <Sk w={52} h={30} r={15} />
      </div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        {[0,1].map(i => (
          <div key={i} style={{ padding: "16px 20px", borderBottom: i === 0 ? `1px solid ${BORDER}` : "none", display: "flex", alignItems: "center", gap: 12 }}>
            <Sk w={20} h={20} r={4} /><Sk w="50%" h={14} />
          </div>
        ))}
      </div>
    </div>
  );

  // ── Compute image style for crop preview ────────────────────────────────────
  const imgStyle: React.CSSProperties = (() => {
    const img = imgRef.current;
    if (!imgLoaded || !img) return { display: "none" };
    const ts = getCoverScale(img) * scale;
    return {
      position: "absolute",
      width:  img.naturalWidth,
      height: img.naturalHeight,
      left:   PREVIEW_SIZE/2 + offset.x - img.naturalWidth  / 2,
      top:    PREVIEW_SIZE/2 + offset.y - img.naturalHeight / 2,
      transform: `scale(${ts})`,
      transformOrigin: "center center",
      maxWidth: "none",
      pointerEvents: "none",
      userSelect: "none",
    };
  })();

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Profile card ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, display: "flex", alignItems: "center", gap: 16 }}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleFileChange} />
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block" }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={riderName} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserCircle size={34} color="#000" />
              </div>
            )}
            <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: uploading ? TEXT2 : ACCENT, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${CARD}` }}>
              {uploading
                ? <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                : <Camera size={11} color="#000" />
              }
            </div>
          </button>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>{riderName}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: TEXT2 }}>{riderEmail}</p>
          <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 600, color: ACCENT, textTransform: "uppercase", letterSpacing: 0.5 }}>
            {riderRole === "owner" ? "เจ้าของ" : "พนักงาน / ไรเดอร์"}
          </p>
        </div>
      </div>

      {/* ── Online status ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>สถานะ</p>
        </div>
        <button onClick={toggleOnline} disabled={toggling} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isOnline ? <Wifi size={20} color={GREEN} /> : <WifiOff size={20} color={TEXT2} />}
            <div style={{ textAlign: "left" }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: TEXT }}>สถานะการรับงาน</p>
              <p style={{ margin: 0, fontSize: 12, color: isOnline ? GREEN : TEXT2 }}>{isOnline ? "พร้อมรับงาน" : "ออฟไลน์"}</p>
            </div>
          </div>
          <div style={{ width: 48, height: 28, borderRadius: 14, background: isOnline ? GREEN : BORDER, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: isOnline ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </button>
      </div>

      {/* ── Settings ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ทั่วไป</p>
        </div>
        <button onClick={toggleTheme} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isDark ? <Moon size={20} color={TEXT2} /> : <Sun size={20} color={TEXT2} />}
            <span style={{ fontSize: 15, color: TEXT }}>{isDark ? "โหมดมืด" : "โหมดสว่าง"}</span>
          </div>
          <div style={{ width: 48, height: 28, borderRadius: 14, background: isDark ? BORDER : ACCENT, position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: isDark ? 3 : 23, width: 22, height: 22, borderRadius: "50%", background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
        </button>
        <button onClick={() => router.push("/rider/stats")} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit", borderBottom: `1px solid ${BORDER}` }}>
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

      {/* ── Privacy ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: TEXT2, textTransform: "uppercase", letterSpacing: 0.5 }}>ความเป็นส่วนตัว</p>
        </div>
        <button onClick={() => setShowConsentRevoke(true)} style={{ width: "100%", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "inherit" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ShieldX size={20} color={TEXT2} />
            <span style={{ fontSize: 15, color: TEXT }}>ถอนความยินยอมการติดตามตำแหน่ง</span>
          </div>
          <ChevronRight size={16} color={TEXT2} />
        </button>
      </div>

      {/* ── Logout ── */}
      <button onClick={handleLogout} style={{ width: "100%", padding: 16, borderRadius: 14, background: "rgba(255,69,58,0.1)", border: `1px solid rgba(255,69,58,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 600, color: RED, cursor: "pointer", fontFamily: "inherit" }}>
        <LogOut size={18} />ออกจากระบบ
      </button>

      {/* ════════════════════════════════════════════════════════════════════════ */}
      {/* ── Crop bottom sheet ── */}
      {previewUrl && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end" }} onClick={cancelPreview}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", background: CARD, borderRadius: "20px 20px 0 0", padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT, alignSelf: "flex-start" }}>ปรับรูปโปรไฟล์</p>

            {/* ── Crop circle ── */}
            <div
              ref={cropRef}
              style={{
                width: PREVIEW_SIZE, height: PREVIEW_SIZE,
                borderRadius: "50%", overflow: "hidden",
                position: "relative", flexShrink: 0,
                border: `3px solid ${ACCENT}`,
                background: "#111",
                touchAction: "none",
                cursor: "grab",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={previewUrl}
                alt="crop preview"
                onLoad={() => setImgLoaded(true)}
                style={imgStyle}
                crossOrigin="anonymous"
              />
              {!imgLoaded && (
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                </div>
              )}
            </div>

            {/* ── Zoom slider ── */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: TEXT2 }}>ซูม</span>
                <span style={{ fontSize: 12, color: TEXT2 }}>{scale.toFixed(1)}×</span>
              </div>
              <input
                type="range" min={1} max={4} step={0.05}
                value={scale}
                onChange={e => {
                  const s       = Number(e.target.value);
                  const newOff  = clampOffset(offsetRef.current.x, offsetRef.current.y, s);
                  scaleRef.current  = s;
                  offsetRef.current = newOff;
                  setScale(s);
                  setOffset({ ...newOff });
                }}
                style={{ width: "100%", accentColor: ACCENT, cursor: "pointer" }}
              />
            </div>

            <p style={{ margin: 0, fontSize: 12, color: TEXT2, textAlign: "center" }}>
              ลากเพื่อเลื่อน · Pinch หรือใช้ Slider เพื่อซูม
            </p>

            {/* ── Buttons ── */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={confirmUpload} style={{ padding: "14px 0", borderRadius: 12, border: "none", background: ACCENT, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ใช้รูปนี้
              </button>
              <button onClick={() => { cancelPreview(); fileRef.current?.click(); }} style={{ padding: "14px 0", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                เลือกรูปใหม่
              </button>
              <button onClick={cancelPreview} style={{ padding: "14px 0", borderRadius: 12, border: "none", background: "transparent", color: TEXT2, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Consent revoke sheet ── */}
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
              <button onClick={handleRevokeConsent} disabled={revoking} style={{ padding: "13px 0", borderRadius: 12, border: "none", background: `rgba(255,69,58,0.12)`, color: RED, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: revoking ? 0.6 : 1 }}>
                {revoking ? "กำลังบันทึก..." : "ยืนยันถอนความยินยอม"}
              </button>
              <button onClick={() => setShowConsentRevoke(false)} style={{ padding: "13px 0", borderRadius: 12, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT2, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
