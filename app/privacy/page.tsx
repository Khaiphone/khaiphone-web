"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown, Mail, Phone, MessageCircle, Clock,
  Shield, EyeOff, CreditCard, Trash2, Cookie, Check,
  Calendar, RefreshCw, FileText, CheckCircle,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const GOLD = "#B8860B";

const SECTIONS = [
  { id: "section-1", title: "ข้อมูลที่เราเก็บรวบรวม" },
  { id: "section-2", title: "วัตถุประสงค์ในการใช้ข้อมูล" },
  { id: "section-3", title: "การเปิดเผยข้อมูล" },
  { id: "section-4", title: "การจัดเก็บและความปลอดภัย" },
  { id: "section-5", title: "Cookies และเทคโนโลยีติดตาม" },
  { id: "section-6", title: "สิทธิของเจ้าของข้อมูล" },
  { id: "section-7", title: "การติดต่อเกี่ยวกับข้อมูลส่วนบุคคล" },
  { id: "section-8", title: "การเปลี่ยนแปลงนโยบาย" },
];

const PRICES = [
  { model: "iPhone 15 Pro Max", price: "38,000" },
  { model: "iPhone 15 Pro", price: "31,000" },
  { model: "iPhone 14 Pro Max", price: "28,000" },
  { model: "MacBook Pro M3", price: "52,000" },
];

const CONTACT_ITEMS = [
  { Icon: Mail, text: "privacy@khaiphone.com" },
  { Icon: Phone, text: "095-553-5167" },
  { Icon: MessageCircle, text: "LINE: @khaiphone" },
];

function CheckItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3" style={{ color: "#4B5563", lineHeight: 1.8 }}>
      <div
        className="flex items-center justify-center shrink-0 rounded-full"
        style={{ width: 20, height: 20, background: GOLD, marginTop: "3px" }}
      >
        <Check size={12} color="#ffffff" strokeWidth={3} />
      </div>
      <span style={{ fontSize: "0.875rem" }}>{text}</span>
    </li>
  );
}

function Divider() {
  return <div className="mt-8 mb-8" style={{ borderTop: "1px solid #f3f4f6" }} />;
}

function H2({ num, title }: { num: number; title: string }) {
  return (
    <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111111", marginBottom: "1rem" }}>
      {num}. {title}
    </h2>
  );
}

function H3({ title }: { title: string }) {
  return (
    <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#333333", marginBottom: "0.5rem", marginTop: "1rem" }}>
      {title}
    </h3>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "#4B5563", lineHeight: 1.8, fontSize: "0.9375rem", marginBottom: "0.75rem" }}>
      {children}
    </p>
  );
}

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState("section-1");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Hero */}
      <div
        className="px-4 py-12 md:py-16 text-center"
        style={{ background: "#f9f9f7", borderBottom: "1px solid #F3F4F6" }}
      >
        <div className="max-w-3xl mx-auto">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: GOLD }}
          >
            Khaiphone.com
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            นโยบายความเป็นส่วนตัว
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "#6B7280" }}>
            เรามุ่งมั่นในการปกป้องข้อมูลส่วนบุคคลของผู้ใช้งาน
            <br className="hidden sm:block" />
            และดำเนินการตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
          </p>
        </div>
      </div>

      {/* Meta bar */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="rounded-xl border p-5" style={{ borderColor: "#F3F4F6" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 mb-3">
            {[
              { Icon: Calendar,  label: "มีผลบังคับใช้", value: "20 พฤษภาคม 2569" },
              { Icon: RefreshCw, label: "อัปเดตล่าสุด", value: "20 พฤษภาคม 2569" },
              { Icon: FileText,  label: "เวอร์ชันเอกสาร", value: "v1.0" },
            ].map(({ Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon size={16} color={GOLD} strokeWidth={1.75} />
                <span className="text-sm" style={{ color: "#4B5563" }}>
                  <span className="font-medium">{label}:</span> {value}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} color={GOLD} strokeWidth={1.75} />
              <span className="text-sm" style={{ color: "#4B5563" }}>
                สำหรับบริการทั้งหมดของ Khaiphone.com
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <div className="flex flex-col md:grid md:grid-cols-4 gap-8 items-start">

          {/* ─── Sidebar ─── */}
          <aside className="hidden md:block md:col-span-1 sticky top-24 self-start">
            {/* TOC */}
            <div className="rounded-xl border p-4 mb-4" style={{ borderColor: "#F3F4F6" }}>
              <p className="text-sm font-bold text-black mb-3">สารบัญ</p>
              <ol className="flex flex-col">
                {SECTIONS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      onClick={() => scrollTo(s.id)}
                      className="text-left w-full py-1 text-xs transition-colors"
                      style={{
                        color: activeSection === s.id ? GOLD : "#6B7280",
                        fontWeight: activeSection === s.id ? 600 : 400,
                      }}
                    >
                      {i + 1}. {s.title}
                    </button>
                  </li>
                ))}
              </ol>
            </div>

            {/* Contact box */}
            <div
              className="rounded-xl border p-4"
              style={{ borderColor: "#F3F4F6", background: "#fafaf8" }}
            >
              <p className="text-sm font-bold text-black mb-1">ต้องการความช่วยเหลือ?</p>
              <p className="text-xs mb-3" style={{ color: "#6B7280" }}>
                หากมีข้อสงสัยเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคล สามารถติดต่อทีมงานได้ตลอดเวลาทำการ
              </p>
              <div className="flex flex-col gap-2">
                {CONTACT_ITEMS.map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon size={12} color={GOLD} />
                    <span className="text-xs" style={{ color: "#374151" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* ─── Content ─── */}
          <div className="md:col-span-3">

            {/* Important summary card */}
            <div
              className="rounded-xl p-5 mb-8"
              style={{ background: "#fffbeb", border: `1px solid ${GOLD}` }}
            >
              <p className="text-sm font-bold mb-4" style={{ color: GOLD }}>
                ⚠️ ข้อควรทราบสำคัญ
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { Icon: Shield,     text: "เราเก็บเฉพาะข้อมูลที่จำเป็นต่อการให้บริการ" },
                  { Icon: EyeOff,     text: "เราจะไม่ขายข้อมูลของคุณให้บุคคลภายนอก" },
                  { Icon: CreditCard, text: "ข้อมูลธนาคารใช้เฉพาะสำหรับการโอนเงินรับซื้อ" },
                  { Icon: Trash2,     text: "คุณสามารถขอลบหรือแก้ไขข้อมูลได้" },
                  { Icon: Cookie,     text: "เว็บไซต์นี้อาจใช้ Cookies เพื่อปรับปรุงประสบการณ์ใช้งาน" },
                ].map(({ Icon, text }, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-2">
                    <div
                      className="flex items-center justify-center rounded-full shrink-0"
                      style={{ width: 48, height: 48, border: `1.5px solid ${GOLD}` }}
                    >
                      <Icon size={22} color={GOLD} strokeWidth={1.5} />
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "#92400e" }}>
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Always-visible sections 1–4 ── */}

            {/* Section 1 */}
            <section id="section-1">
              <H2 num={1} title="ข้อมูลที่เราเก็บรวบรวม" />
              <BodyText>Khaiphone.com อาจเก็บข้อมูลส่วนบุคคลดังต่อไปนี้:</BodyText>

              <H3 title="ข้อมูลระบุตัวตน" />
              <ul className="flex flex-col gap-1.5 mb-4">
                {["ชื่อ-นามสกุล", "เบอร์โทรศัพท์", "อีเมล", "LINE ID"].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>

              <H3 title="ข้อมูลเกี่ยวกับธุรกรรม" />
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "รุ่นอุปกรณ์",
                  "Serial Number / IMEI",
                  "ราคาประเมิน",
                  "วันที่นัดหมาย",
                  "ประวัติการทำรายการ",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>

              <H3 title="ข้อมูลการชำระเงิน" />
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "ชื่อบัญชีธนาคาร",
                  "เลขบัญชีธนาคาร",
                  "ธนาคารที่ใช้รับเงิน",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>

              <H3 title="ข้อมูลทางเทคนิค" />
              <ul className="flex flex-col gap-1.5">
                {[
                  "IP Address",
                  "Browser",
                  "Device Type",
                  "Cookies",
                  "พฤติกรรมการใช้งานเว็บไซต์",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <Divider />
            </section>

            {/* Section 2 */}
            <section id="section-2">
              <H2 num={2} title="วัตถุประสงค์ในการใช้ข้อมูล" />
              <BodyText>เราใช้ข้อมูลของท่านเพื่อ:</BodyText>
              <ul className="flex flex-col gap-1.5">
                {[
                  "ประเมินราคาอุปกรณ์",
                  "ติดต่อยืนยันการนัดหมาย",
                  "ดำเนินธุรกรรมรับซื้อ",
                  "โอนเงินค่ารับซื้อ",
                  "ป้องกันการทุจริต",
                  "ปรับปรุงคุณภาพบริการ",
                  "วิเคราะห์การใช้งานเว็บไซต์",
                  "ให้บริการหลังการขาย",
                  "ส่งข่าวสารหรือโปรโมชั่น (เฉพาะกรณีได้รับความยินยอม)",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <Divider />
            </section>

            {/* Section 3 */}
            <section id="section-3">
              <H2 num={3} title="การเปิดเผยข้อมูล" />
              <BodyText>
                บริษัทจะไม่ขาย แลกเปลี่ยน หรือเผยแพร่ข้อมูลส่วนบุคคลแก่บุคคลภายนอก
                เว้นแต่ในกรณีดังต่อไปนี้:
              </BodyText>
              <ul className="flex flex-col gap-1.5">
                {[
                  "ได้รับความยินยอมจากเจ้าของข้อมูล",
                  "จำเป็นต่อการให้บริการ",
                  "ปฏิบัติตามกฎหมาย",
                  "มีคำสั่งจากหน่วยงานราชการหรือศาล",
                  "ใช้กับผู้ให้บริการที่เกี่ยวข้อง เช่น ระบบชำระเงิน, ระบบวิเคราะห์เว็บไซต์, ผู้ให้บริการ Cloud หรือ Hosting",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <Divider />
            </section>

            {/* Section 4 */}
            <section id="section-4">
              <H2 num={4} title="การจัดเก็บและความปลอดภัยของข้อมูล" />
              <BodyText>
                บริษัทใช้มาตรการด้านเทคนิคและการบริหารจัดการ เพื่อปกป้องข้อมูลส่วนบุคคลจาก:
              </BodyText>
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "การเข้าถึงโดยไม่ได้รับอนุญาต",
                  "การรั่วไหล",
                  "การแก้ไขข้อมูล",
                  "การสูญหายของข้อมูล",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <BodyText>ข้อมูลของท่านจะถูกจัดเก็บ:</BodyText>
              <ul className="flex flex-col gap-1.5">
                {[
                  "เท่าที่จำเป็นต่อวัตถุประสงค์ในการให้บริการ",
                  "หรือตามระยะเวลาที่กฎหมายกำหนด",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
            </section>

            {/* ── Expand/Collapse sections 5–8 (mobile) ── */}
            <div className={expanded ? "block" : "hidden md:block"}>
              <Divider />

              {/* Section 5 */}
              <section id="section-5">
                <H2 num={5} title="Cookies และเทคโนโลยีติดตาม" />
                <BodyText>
                  เว็บไซต์อาจใช้ Cookies และเทคโนโลยีที่คล้ายกันเพื่อ:
                </BodyText>
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    "จดจำการตั้งค่าผู้ใช้งาน",
                    "วิเคราะห์การใช้งานเว็บไซต์",
                    "ปรับปรุงประสบการณ์ใช้งาน",
                    "วัดผลโฆษณาและการตลาด",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <BodyText>
                  ท่านสามารถปิดการใช้งาน Cookies ผ่าน Browser ได้ แต่อาจส่งผลต่อประสบการณ์ใช้งานบางส่วน
                </BodyText>
                <Divider />
              </section>

              {/* Section 6 */}
              <section id="section-6">
                <H2 num={6} title="สิทธิของเจ้าของข้อมูล" />
                <BodyText>ภายใต้ PDPA ท่านมีสิทธิ:</BodyText>
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    "ขอเข้าถึงข้อมูลส่วนบุคคล",
                    "ขอแก้ไขข้อมูล",
                    "ขอให้ลบข้อมูล",
                    "ขอให้ระงับการใช้ข้อมูล",
                    "คัดค้านการประมวลผลข้อมูล",
                    "ถอนความยินยอม",
                    "ขอรับสำเนาข้อมูลส่วนบุคคล",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <BodyText>
                  บริษัทจะดำเนินการตามคำร้องภายในระยะเวลาที่กฎหมายกำหนด
                </BodyText>
                <Divider />
              </section>

              {/* Section 7 */}
              <section id="section-7">
                <H2 num={7} title="การติดต่อเกี่ยวกับข้อมูลส่วนบุคคล" />
                <BodyText>
                  หากมีข้อสงสัยเกี่ยวกับนโยบายความเป็นส่วนตัว หรือประสงค์ใช้สิทธิ์ตาม PDPA กรุณาติดต่อ:
                </BodyText>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "Khaiphone.com",
                    "Email: privacy@khaiphone.com",
                    "โทรศัพท์: 095-553-5167",
                    "LINE: @khaiphone",
                    "เวลาทำการ: ทุกวัน 09:00 – 00:00 น.",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <Divider />
              </section>

              {/* Section 8 */}
              <section id="section-8">
                <H2 num={8} title="การเปลี่ยนแปลงนโยบาย" />
                <BodyText>
                  บริษัทอาจปรับปรุงหรือเปลี่ยนแปลงนโยบายความเป็นส่วนตัวได้ในอนาคต
                </BodyText>
                <BodyText>
                  การใช้งานเว็บไซต์หลังมีการแก้ไข ถือว่าท่านยอมรับนโยบายฉบับล่าสุดแล้ว
                </BodyText>
              </section>
            </div>

            {/* Expand button — mobile only */}
            <div className="flex justify-center mt-6 mb-6 md:hidden">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm px-6 py-2.5 rounded-full border transition-colors"
                style={{ borderColor: "#D1D5DB", color: "#374151" }}
              >
                {expanded ? "ย่อนโยบาย" : "ดูนโยบายทั้งหมด"}
                <ChevronDown
                  size={16}
                  style={{
                    transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                />
              </button>
            </div>

            {/* Mobile contact box */}
            <div
              className="md:hidden rounded-xl border p-5 mt-2"
              style={{ borderColor: "#F3F4F6" }}
            >
              <p className="text-sm font-semibold text-black mb-3">
                หากมีข้อสงสัยเกี่ยวกับการคุ้มครองข้อมูลส่วนบุคคล กรุณาติดต่อ
              </p>
              <div className="flex flex-col gap-2.5">
                {CONTACT_ITEMS.map(({ Icon, text }) => (
                  <div key={text} className="flex items-center gap-2">
                    <Icon size={13} color={GOLD} />
                    <span className="text-sm" style={{ color: "#374151" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 py-16 text-center" style={{ background: "#111111" }}>
        <div className="max-w-2xl mx-auto">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(184,134,11,0.15)",
              border: "1px solid rgba(184,134,11,0.3)",
            }}
          >
            <span style={{ fontSize: "1.5rem" }}>📱</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            ต้องการประเมินราคาอุปกรณ์ Apple ของคุณ?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#6B7280" }}>
            ประเมินฟรี ไม่มีค่าใช้จ่าย รู้ราคาภายในไม่กี่นาที
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/estimate"
              className="px-8 py-3 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: GOLD }}
            >
              ประเมินราคาฟรี →
            </Link>
            <Link
              href="/sell"
              className="px-8 py-3 rounded-full text-sm font-semibold text-white border border-white transition-opacity hover:opacity-80"
            >
              ดูรายการรับซื้อ →
            </Link>
          </div>
        </div>
      </div>

      {/* Latest price widget */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid #F3F4F6", background: "#ffffff" }}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <p className="text-xs font-semibold shrink-0" style={{ color: "#374151" }}>
            ราคารับซื้อล่าสุด{" "}
            <span style={{ color: "#6B7280", fontWeight: 400 }}>(อัปเดต 20 พ.ค. 2567)</span>
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1">
            {PRICES.map((p) => (
              <div key={p.model} className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color: "#374151" }}>{p.model}</span>
                <span className="text-xs font-semibold" style={{ color: GOLD }}>
                  สูงสุด ฿{p.price}
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/sell"
            className="text-xs font-semibold shrink-0 hover:opacity-80 transition-opacity"
            style={{ color: GOLD }}
          >
            ดูราคารับซื้อทั้งหมด →
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  );
}
