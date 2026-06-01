import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ContactForm from "../components/contact/ContactForm";
import RiderCTA from "../components/contact/RiderCTA";
import { Phone, MapPin, Zap, Banknote, Lock, Star, MessageCircle } from "lucide-react";
import Image from "next/image";

export const metadata: Metadata = {
  title: "ติดต่อเรา | Khaiphone.com",
  description:
    "ติดต่อKhaiphone.com รับซื้อ iPhone iPad MacBook LINE @khaiphone โทร 095-553-5167 เปิดทุกวัน",
};

const GOLD = "#B8860B";
const GOLD_MUTED = "#C49A2A";   // less saturated — used only in dark rider section
const LINE_GREEN = "#12b44b";   // premium muted green

function IconLine({ size = 24, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

const TRUST_BADGES = [
  { Icon: Zap,      label: "ตอบกลับภายใน 30 นาที" },
  { Icon: Banknote, label: "ไม่มีค่าใช้จ่าย"       },
  { Icon: Lock,     label: "ข้อมูลไม่ถูกเปิดเผย"   },
  { Icon: Star,     label: "ให้ราคาสูง เป็นธรรม"   },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* ── 1. Hero ── */}
      <section
        style={{
          background: "#f9f5f0",
          paddingTop: "72px",
          paddingBottom: "56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {(
          [
            { top: "20%", left: "8%",      right: undefined, size: 8, opacity: 0.25 },
            { top: "60%", left: "5%",      right: undefined, size: 5, opacity: 0.18 },
            { top: "35%", left: "15%",     right: undefined, size: 4, opacity: 0.15 },
            { top: "15%", left: undefined, right: "10%",     size: 6, opacity: 0.20 },
            { top: "55%", left: undefined, right: "7%",      size: 9, opacity: 0.22 },
            { top: "75%", left: undefined, right: "14%",     size: 4, opacity: 0.15 },
          ] as { top: string; left?: string; right?: string; size: number; opacity: number }[]
        ).map((d, i) => (
          <span key={i} style={{ position: "absolute", top: d.top, left: d.left, right: d.right, width: d.size, height: d.size, borderRadius: "50%", background: GOLD, opacity: d.opacity, pointerEvents: "none" }} />
        ))}
        <div className="max-w-4xl mx-auto px-4 text-center" style={{ position: "relative", zIndex: 1 }}>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest rounded-full px-3 py-1 mb-5"
            style={{ color: GOLD, border: `1.5px solid ${GOLD}` }}
          >
            <MessageCircle size={14} style={{ color: "#B8860B" }} /> ติดต่อเรา
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: "#111111", lineHeight: 1.2 }}>
            พร้อมให้บริการทุกวัน
          </h1>
          <p className="text-base md:text-lg" style={{ color: "#6B7280", lineHeight: 1.75 }}>
            มีคำถาม อยากประเมินราคา หรือต้องการนัดหมาย ติดต่อได้เลยครับ
          </p>
        </div>
      </section>

      {/* ── 2. Rider Banner (emotional hook — before cards) ── */}
      <section style={{ background: "#0b0b0b", overflow: "hidden" }}>
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div
            className="grid grid-cols-1 items-center gap-10"
            style={{ gridTemplateColumns: "1fr" }}
          >
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center"
              style={{ gridTemplateColumns: undefined }}
            >
              {/* ── Text (left) ── */}
              <div>
                <span
                  className="inline-block text-xs font-semibold uppercase tracking-widest rounded-full px-3 py-1 mb-4"
                  style={{ background: "rgba(196,154,42,0.12)", color: GOLD_MUTED, border: "1px solid rgba(196,154,42,0.25)" }}
                >
                  บริการรับถึงที่
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: "#ffffff", lineHeight: 1.25 }}>
                  ไรเดอร์เข้ารับซื้อ<br />
                  <span style={{ color: GOLD_MUTED }}>ถึงที่คุณ</span>
                </h2>
                <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.85 }}>
                  สะดวก รวดเร็ว ปลอดภัย — ไม่ต้องเดินทาง<br />
                  ครอบคลุม กรุงเทพฯ และปริมณฑล ทุกวัน 09:00 – 00:00
                </p>
                <div className="flex flex-col gap-3 mb-8">
                  {[
                    "นัดรับง่าย ได้ทุกที่ — บ้าน คอนโด ที่ทำงาน",
                    "ไรเดอร์ผ่านการตรวจสอบ ยืนยันตัวตน",
                    "รับเงินทันที — เงินสดหรือโอนเข้าบัญชี",
                    "ให้ราคาดี เป็นธรรม ไม่กดราคา",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span style={{ color: GOLD_MUTED, fontWeight: 700, fontSize: "0.9375rem", flexShrink: 0, lineHeight: "1.6" }}>✓</span>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.65 }}>{item}</span>
                    </div>
                  ))}
                </div>
                <RiderCTA />
              </div>

              {/* ── Rider image (right) ── */}
              <div
                style={{
                  borderRadius: "24px",
                  overflow: "hidden",
                  aspectRatio: "16/9",
                  position: "relative",
                  background: "linear-gradient(135deg, #111111 0%, #1a1a1a 100%)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  boxShadow: "0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)",
                  marginLeft: "auto",
                  width: "100%",
                }}
              >
                <Image
                  src="/contact/contact-rider.webp"
                  alt="ไรเดอร์เข้ารับซื้อถึงที่คุณ"
                  fill
                  style={{ objectFit: "contain", objectPosition: "center" }}
                  sizes="(max-width: 768px) 100vw, 55vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Contact Cards ── */}
      <section style={{ background: "#ffffff", paddingTop: "56px", paddingBottom: "0" }}>
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

            {/* LINE */}
            <div className="flex flex-col" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "22px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 44, height: 44, background: LINE_GREEN, flexShrink: 0 }}>
                <IconLine size={22} color="#ffffff" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#6B7280" }}>LINE OFFICIAL</p>
              <p className="text-2xl font-bold mb-1" style={{ color: "#111111" }}>@khaiphone</p>
              <p className="text-sm mb-4" style={{ color: "#6B7280", lineHeight: 1.6 }}>ตอบเร็วที่สุด แนะนำช่องทางนี้</p>
              <a href="https://line.me/ti/p/~@khaiphone" target="_blank" rel="noopener noreferrer" className="mt-auto text-center text-sm font-semibold rounded-full py-2.5 transition-opacity hover:opacity-90" style={{ background: LINE_GREEN, color: "#ffffff", textDecoration: "none", display: "block" }}>เพิ่มเพื่อน LINE</a>
            </div>

            {/* Phone */}
            <div className="flex flex-col" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "22px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 44, height: 44, background: "#FEF9E7", flexShrink: 0 }}>
                <Phone size={20} color={GOLD} strokeWidth={1.75} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#6B7280" }}>โทรศัพท์</p>
              <p className="text-2xl font-bold mb-1" style={{ color: "#111111" }}>095-553-5167</p>
              <p className="text-sm mb-4" style={{ color: "#6B7280", lineHeight: 1.6 }}>โทรได้เลย ทุกวัน 09:00 – 00:00</p>
              <a href="tel:0955535167" className="mt-auto text-center text-sm font-semibold rounded-full py-2.5" style={{ border: `1.5px solid ${GOLD}`, color: GOLD, textDecoration: "none", display: "block" }}>โทรเลย</a>
            </div>

            {/* Location */}
            <div className="flex flex-col" style={{ background: "#ffffff", borderRadius: "16px", border: "1px solid #E5E7EB", padding: "22px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-center rounded-full mb-3" style={{ width: 44, height: 44, background: "#FEF9E7", flexShrink: 0 }}>
                <MapPin size={20} color={GOLD} strokeWidth={1.75} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#6B7280" }}>สาขารังสิต</p>
              <p className="text-2xl font-bold mb-1" style={{ color: "#111111" }}>The Plant วงแหวน-รังสิต</p>
              <p className="text-sm mb-4" style={{ color: "#6B7280", lineHeight: 1.6 }}>เปิดทุกวัน 09:00 – 00:00 น.</p>
              <a href="https://maps.google.com/?q=The+Plant+Wongwaen+Rangsit" target="_blank" rel="noopener noreferrer" className="mt-auto text-center text-sm font-semibold rounded-full py-2.5 transition-colors hover:border-gray-400" style={{ border: "1.5px solid #D1D5DB", color: "#374151", textDecoration: "none", display: "block" }}>ดูแผนที่</a>
            </div>

          </div>
        </div>
      </section>

      {/* ── Trust Badges ── */}
      <section style={{ background: "#ffffff", borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-5xl mx-auto px-4 py-3.5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TRUST_BADGES.map(({ Icon, label }) => (
              <div key={label} className="flex items-center justify-center gap-2.5 py-1.5">
                <Icon size={14} color={GOLD} strokeWidth={1.75} style={{ flexShrink: 0 }} />
                <span className="text-xs md:text-sm" style={{ color: "#6B7280" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Form + Integrated Location Card ── */}
      <section style={{ background: "#ffffff", paddingTop: "56px", paddingBottom: "56px" }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Form card */}
            <div style={{ border: "1px solid #E5E7EB", borderRadius: "16px", padding: "28px" }}>
              <h2 className="text-xl font-bold mb-1" style={{ color: "#111111" }}>ส่งข้อความหาเรา</h2>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                กรอกแบบฟอร์มด้านล่าง ทีมงานจะติดต่อกลับภายใน 30 นาที
              </p>
              <ContactForm />
            </div>

            {/* Location card — store photo + address + map */}
            <div style={{ border: "1px solid #E5E7EB", borderRadius: "16px", overflow: "hidden", display: "flex", flexDirection: "column" }}>

              {/* Store photo */}
              <div style={{ position: "relative", height: "200px", flexShrink: 0 }}>
                <Image
                  src="/contact/contact-store-front.webp"
                  alt="สาขารังสิต The Plant วงแหวน-รังสิต"
                  fill
                  style={{ objectFit: "cover" }}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)" }} />
                <div style={{ position: "absolute", bottom: "16px", left: "18px", right: "18px" }}>
                  <p className="font-bold text-white text-base leading-snug">สาขา รังสิต</p>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>The Plant วงแหวน – รังสิต</p>
                </div>
              </div>

              {/* Address row */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6" }}>
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={13} color={GOLD} style={{ flexShrink: 0, marginTop: "3px" }} />
                    <p className="text-sm" style={{ color: "#4B5563", lineHeight: 1.6 }}>81/59 ถ.รังสิต – นครนายก ต.รังสิต อ.ธัญบุรี จ.ปทุมธานี 12130</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone size={13} color={GOLD} style={{ flexShrink: 0 }} />
                    <a href="tel:0955535167" className="text-sm font-semibold hover:underline" style={{ color: "#111111" }}>095-553-5167</a>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Star size={13} color={GOLD} style={{ flexShrink: 0 }} />
                    <p className="text-sm" style={{ color: "#4B5563" }}>เปิดทุกวัน 09:00 – 00:00 น.</p>
                  </div>
                </div>
              </div>

              {/* Map embed */}
              <div style={{ flex: 1, minHeight: "220px" }}>
                <iframe
                  src="https://maps.google.com/maps?q=The+Plant+Wongwaen+Rangsit&output=embed&z=15"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: "block", minHeight: "220px" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="แผนที่ The Plant วงแหวน-รังสิต"
                />
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── LINE CTA ── */}
      <section style={{ background: LINE_GREEN, paddingTop: "28px", paddingBottom: "28px" }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center gap-4 md:gap-8">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center justify-center rounded-full shrink-0" style={{ width: 40, height: 40, background: "rgba(255,255,255,0.2)" }}>
              <IconLine size={20} color="#ffffff" />
            </div>
            <div className="text-center md:text-left">
              <p className="font-bold text-white text-base leading-snug">ช่องทางที่เร็วที่สุด — LINE</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                ทักได้เลย ทีมงานพร้อมตอบทุกคำถาม ตั้งแต่ประเมินราคาจนถึงนัดรับเครื่อง
              </p>
            </div>
          </div>
          <a
            href="https://line.me/ti/p/~@khaiphone"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white font-bold px-6 py-3 rounded-full text-sm whitespace-nowrap hover:bg-gray-50 transition-colors shrink-0"
            style={{ color: LINE_GREEN, textDecoration: "none" }}
          >
            <IconLine size={16} color={LINE_GREEN} />
            เพิ่มเพื่อน @khaiphone
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
