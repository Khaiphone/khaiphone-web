"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Settings } from "lucide-react";

const GOLD = "#B8860B";
export const STORAGE_KEY = "khaiphone_cookie_consent";
export const REOPEN_EVENT = "cookie:reopen";
export const CONSENT_SAVED_EVENT = "cookie:consent-saved";

interface ConsentState {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

interface StoredConsent {
  consent: "accepted" | "rejected" | "custom";
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

function saveConsent(data: StoredConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(
    new CustomEvent(CONSENT_SAVED_EVENT, {
      detail: { analytics: data.analytics, marketing: data.marketing },
    })
  );
}

function Checkbox({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onChange}
      className="shrink-0 flex items-center justify-center rounded"
      style={{
        width: 18,
        height: 18,
        background: checked ? GOLD : "transparent",
        border: `1.5px solid ${checked ? GOLD : "#E5E7EB"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "background 0.15s, border-color 0.15s",
        flexShrink: 0,
      }}
      aria-checked={checked}
      aria-disabled={disabled}
    >
      {checked && <Check size={11} color="#ffffff" strokeWidth={3} />}
    </button>
  );
}

const COOKIE_OPTIONS = [
  {
    key: "necessary" as const,
    label: "คุกกี้ที่จำเป็น",
    sublabel: "Necessary Cookies",
    description: "จำเป็นต่อการทำงานของเว็บไซต์",
    disabled: true,
  },
  {
    key: "analytics" as const,
    label: "คุกกี้วิเคราะห์",
    sublabel: "Analytics Cookies",
    description: "ช่วยให้เราเข้าใจการใช้งานเว็บไซต์",
    disabled: false,
  },
  {
    key: "marketing" as const,
    label: "คุกกี้การตลาด",
    sublabel: "Marketing Cookies",
    description: "ใช้แสดงโฆษณาที่เหมาะสมกับคุณ",
    disabled: false,
  },
];

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    // Initial show (only if no consent stored)
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", checkMobile);
      };
    }
  }, []);

  useEffect(() => {
    // Reopen via footer link (always works, even if consent was set)
    function handleReopen() {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      setCustomizing(false);
      setVisible(true);
    }
    window.addEventListener(REOPEN_EVENT, handleReopen);
    return () => window.removeEventListener(REOPEN_EVENT, handleReopen);
  }, []);

  useEffect(() => {
    if (visible && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [visible, isMobile]);

  function dismiss() {
    setVisible(false);
  }

  function handleAcceptAll() {
    saveConsent({ consent: "accepted", analytics: true, marketing: true, timestamp: new Date().toISOString() });
    dismiss();
  }

  function handleRejectAll() {
    saveConsent({ consent: "rejected", analytics: false, marketing: false, timestamp: new Date().toISOString() });
    dismiss();
  }

  function handleSaveCustom() {
    saveConsent({ consent: "custom", analytics: consent.analytics, marketing: consent.marketing, timestamp: new Date().toISOString() });
    dismiss();
  }

  function toggleConsent(key: "analytics" | "marketing") {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const desktopAnim = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: 16 },
  };

  const mobileAnim = {
    initial: { opacity: 0, y: "100%" },
    animate: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: "100%" },
  };

  // Full option row used in Mobile + desktop center
  const OptionRow = ({ opt }: { opt: typeof COOKIE_OPTIONS[number] }) => (
    <div
      className="flex items-start gap-3"
      style={{ opacity: opt.disabled ? 0.6 : 1 }}
    >
      <div style={{ paddingTop: "3px" }}>
        <Checkbox
          checked={consent[opt.key]}
          disabled={opt.disabled}
          onChange={() => !opt.disabled && toggleConsent(opt.key as "analytics" | "marketing")}
        />
      </div>
      <div>
        <p style={{ fontSize: "0.8125rem", fontWeight: 500, color: "#111111", margin: 0, lineHeight: 1.4 }}>
          {opt.label}{" "}
          <span style={{ color: "#6B7280", fontWeight: 400, fontSize: "0.75rem" }}>({opt.sublabel})</span>
        </p>
        <p style={{ fontSize: "0.75rem", color: "#4B5563", margin: "2px 0 0" }}>
          {opt.description}
        </p>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* ── Desktop banner ── */}
          {!isMobile && (
            <div
              style={{
                position: "fixed",
                bottom: "16px",
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                zIndex: 9999,
                pointerEvents: "none",
              }}
            >
              <motion.div
                key="desktop"
                initial={desktopAnim.initial}
                animate={desktopAnim.animate}
                exit={desktopAnim.exit}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  pointerEvents: "auto",
                  width: "min(896px, calc(100vw - 32px))",
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  borderRadius: "16px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
                  padding: "12px 28px",
                  display: "flex",
                  gap: "24px",
                  alignItems: "center",
                }}
              >
                {/* Left — description */}
                <div style={{ flex: "0 0 280px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "1.125rem", lineHeight: 1, flexShrink: 0 }}>🍪</span>
                    <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "#111111", margin: 0, lineHeight: 1.35 }}>
                      เราใช้คุกกี้เพื่อปรับปรุงประสบการณ์ใช้งาน
                    </p>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#4B5563", lineHeight: 1.6, margin: "2px 0 0" }}>
                    เพื่อช่วยให้เว็บไซต์ทำงานได้อย่างมีประสิทธิภาพ
                    วิเคราะห์การใช้งาน และแสดงโฆษณาที่เหมาะสม
                  </p>
                  <Link
                    href="/privacy"
                    style={{ fontSize: "0.75rem", color: GOLD, display: "inline-block", marginTop: "5px", textDecoration: "underline", textUnderlineOffset: "3px" }}
                  >
                    นโยบายความเป็นส่วนตัว
                  </Link>
                </div>

                {/* Center — cookie options + settings link */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                  {COOKIE_OPTIONS.map((opt) => (
                    <OptionRow key={opt.key} opt={opt} />
                  ))}
                  <button
                    onClick={() => setCustomizing(!customizing)}
                    className="group"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#6B7280",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                      fontFamily: "inherit",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginTop: "2px",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                    onMouseLeave={e => (e.currentTarget.style.color = "#6B7280")}
                  >
                    <Settings size={13} style={{ flexShrink: 0 }} />
                    {customizing ? "ซ่อนการตั้งค่า" : "ตั้งค่าคุกกี้"}
                  </button>
                </div>

                {/* Right — action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flexShrink: 0, minWidth: "148px" }}>
                  <button
                    onClick={customizing ? handleSaveCustom : handleAcceptAll}
                    style={{
                      background: "#111111",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "9999px",
                      padding: "8px 20px",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  >
                    {customizing ? "บันทึกการตั้งค่า" : "ยอมรับทั้งหมด"}
                  </button>
                  <button
                    onClick={handleRejectAll}
                    style={{
                      background: "transparent",
                      color: "#374151",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "9999px",
                      padding: "8px 20px",
                      fontSize: "0.8125rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  >
                    ปฏิเสธทั้งหมด
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Mobile bottom sheet ── */}
          {isMobile && (
            <motion.div
              key="mobile"
              initial={mobileAnim.initial}
              animate={mobileAnim.animate}
              exit={mobileAnim.exit}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                position: "fixed",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                borderRadius: "28px 28px 0 0",
                boxShadow: "0 -4px 32px rgba(0,0,0,0.08)",
                zIndex: 9999,
                maxHeight: "85vh",
                overflowY: "auto",
                scrollbarWidth: "none",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)",
              }}
            >
              {/* hide webkit scrollbar */}
              <style>{`
                .cookie-sheet::-webkit-scrollbar { display: none; }
              `}</style>
              <div className="cookie-sheet" style={{ padding: "22px 20px 16px" }}>
                {/* Icon + title */}
                <div style={{ textAlign: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "2rem", lineHeight: 1 }}>🍪</span>
                  <p style={{ fontSize: "1.0625rem", fontWeight: 700, color: "#111111", marginTop: "8px", lineHeight: 1.4 }}>
                    เราใช้คุกกี้เพื่อปรับปรุง
                    <br />ประสบการณ์ใช้งาน
                  </p>
                  <p style={{ fontSize: "0.8125rem", color: "#6B7280", lineHeight: 1.65, marginTop: "6px" }}>
                    เพื่อช่วยให้เว็บไซต์ทำงานได้ดีขึ้น วิเคราะห์การใช้งาน
                    และปรับปรุงประสบการณ์ใช้งาน
                  </p>
                  <Link
                    href="/privacy"
                    style={{ fontSize: "0.8125rem", color: GOLD, display: "inline-block", marginTop: "5px", textDecoration: "underline", textUnderlineOffset: "3px" }}
                  >
                    นโยบายความเป็นส่วนตัว
                  </Link>
                </div>

                {/* Divider */}
                <div style={{ borderTop: "1px solid #F3F4F6", margin: "12px 0" }} />

                {/* Cookie options — stacked vertically */}
                <div style={{ display: "flex", flexDirection: "column", gap: "13px", marginBottom: "20px" }}>
                  {COOKIE_OPTIONS.map((opt) => (
                    <OptionRow key={opt.key} opt={opt} />
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                  <button
                    onClick={customizing ? handleSaveCustom : handleAcceptAll}
                    style={{
                      background: "#111111",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "9999px",
                      padding: "12px 24px",
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  >
                    {customizing ? "บันทึกการตั้งค่า" : "ยอมรับทั้งหมด"}
                  </button>
                  <button
                    onClick={handleRejectAll}
                    style={{
                      background: "transparent",
                      color: "#374151",
                      border: "1.5px solid #E5E7EB",
                      borderRadius: "9999px",
                      padding: "12px 24px",
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      width: "100%",
                      fontFamily: "inherit",
                    }}
                  >
                    ปฏิเสธทั้งหมด
                  </button>
                  <button
                    onClick={() => setCustomizing(!customizing)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: GOLD,
                      fontSize: "0.875rem",
                      cursor: "pointer",
                      padding: "6px 0",
                      textAlign: "center",
                      fontFamily: "inherit",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {customizing ? "ซ่อนการตั้งค่า" : "⚙ ปรับแต่งคุกกี้"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
