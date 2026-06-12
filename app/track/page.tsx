"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, AlertCircle, Loader2 } from "lucide-react";
import Header from "../components/Header";
import { fetchRequestByOrderNumber } from "@/app/actions/admin-requests";

function normalizePhone(p: string) {
  return p.replace(/\D/g, "");
}

function formatPhone(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseOrderInput(raw: string): string {
  const trimmed = raw.trim().toUpperCase();
  // If user typed full order number with prefix (KH-..., KP-..., MN-...) — use as-is
  if (/^(KH|KP|MN)-/i.test(trimmed)) return trimmed;
  // Otherwise digits-only → default to KH- prefix (customer form flow)
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length <= 4) return `KH-${digits}`;
  return `KH-${digits.slice(0, 4)}-${digits.slice(4)}`;
}

export default function TrackPage() {
  const router = useRouter();
  const [orderRaw, setOrderRaw] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!orderRaw.trim() || !phone.trim()) {
      setError("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);

    const normalizedPhone = normalizePhone(phone.trim());
    const normalizedOrder = parseOrderInput(orderRaw);

    // 1. Query Supabase
    try {
      const found = await fetchRequestByOrderNumber(normalizedOrder, normalizedPhone);
      if (found) {
        router.push(`/request/${found.orderNumber}?phone=${encodeURIComponent(normalizedPhone)}`);
        return;
      }
    } catch (err) {
      console.error("[track] Supabase error:", err);
    }

    // 2. Fallback: localStorage (same-device submission)
    try {
      const raw = localStorage.getItem("khaiphone_submission");
      if (raw) {
        const sub = JSON.parse(raw);
        if (
          sub.orderNumber?.toUpperCase() === normalizedOrder.toUpperCase() &&
          normalizePhone(sub.customer?.phone ?? "") === normalizedPhone
        ) {
          router.push(`/request/${sub.orderNumber}?phone=${encodeURIComponent(normalizedPhone)}`);
          return;
        }
      }
    } catch {}

    setLoading(false);
    setError("ไม่พบเลขคำขอนี้ในระบบ กรุณาตรวจสอบเลขคำขอและเบอร์โทรอีกครั้ง");
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0" style={{ background: "#f9f9f7" }}>
      <Header />

      <div className="flex items-start justify-center px-4 py-12 md:py-20">
        <div className="w-full" style={{ maxWidth: 480 }}>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="flex items-center justify-center rounded-2xl"
              style={{ width: 56, height: 56, background: "rgba(184,134,11,0.1)", border: "1.5px solid rgba(184,134,11,0.2)" }}
            >
              <Search size={24} style={{ color: "#B8860B" }} />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">ติดตามสถานะคำขอ</h1>
            <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
              กรอกเลขคำขอและเบอร์โทรศัพท์เพื่อตรวจสอบสถานะล่าสุด
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl p-6 md:p-8" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06), 0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #E5E7EB" }}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Order number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-black">เลขคำขอ</label>
                <input
                  type="text"
                  inputMode="text"
                  value={orderRaw}
                  onChange={e => { setOrderRaw(e.target.value.toUpperCase()); setError(""); }}
                  placeholder="KH-XXXX หรือ KP-XXXXXX"
                  autoComplete="off"
                  autoCapitalize="characters"
                  style={{
                    border: `1.5px solid ${error ? "#EF4444" : orderRaw ? "#B8860B" : "#E5E7EB"}`,
                    borderRadius: 12, padding: "12px 14px", fontSize: 14,
                    fontFamily: "monospace", color: "#111", background: "#fff",
                    outline: "none", letterSpacing: "0.03em", transition: "border-color 150ms",
                  }}
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-black">เบอร์โทรศัพท์</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(""); }}
                  placeholder="เช่น 095-553-5167"
                  autoComplete="tel"
                  style={{
                    border: `1.5px solid ${error ? "#EF4444" : phone ? "#B8860B" : "#E5E7EB"}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    outline: "none",
                    fontFamily: "var(--font-prompt), sans-serif",
                    color: "#111",
                    background: "#fff",
                    transition: "border-color 150ms",
                  }}
                  onFocus={(e) => { if (!error) e.target.style.borderColor = "#B8860B"; }}
                  onBlur={(e) => { if (!phone) e.target.style.borderColor = "#E5E7EB"; }}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl px-4 py-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertCircle size={15} style={{ color: "#EF4444", flexShrink: 0, marginTop: 1 }} />
                  <p className="text-sm leading-snug" style={{ color: "#DC2626" }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white text-sm transition-opacity"
                style={{ background: "#B8860B", opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer", border: "none" }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    กำลังตรวจสอบ...
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    ตรวจสอบสถานะ
                  </>
                )}
              </button>

            </form>

            {/* Helper */}
            <div className="mt-5 pt-5 flex items-start gap-2" style={{ borderTop: "1px solid #F3F4F6" }}>
              <AlertCircle size={13} style={{ color: "#6B7280", flexShrink: 0, marginTop: 1 }} />
              <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                กรอกเลขคำขอเต็มๆ เช่น <span className="font-semibold text-black" style={{ fontFamily: "monospace" }}>KH-2026-45362</span> หรือ <span className="font-semibold text-black" style={{ fontFamily: "monospace" }}>KP-DLWSCX</span>
                {" "}— เลขคำขออยู่ในลิงก์ติดตามที่ได้รับ
              </p>
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-6 flex items-center justify-center gap-5 flex-wrap">
            {["ข้อมูลปลอดภัย 100%", "ไม่ต้องล็อกอิน", "อัปเดตแบบ real-time"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
                <span style={{ color: "#B8860B" }}>✓</span>
                {t}
              </span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
