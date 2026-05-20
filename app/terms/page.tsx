"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown, Mail, Phone, MessageCircle, Clock,
  Tag, Search, XCircle, Cloud, Check,
  Calendar, RefreshCw, FileText, CheckCircle,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const GOLD = "#B8860B";

const SECTIONS = [
  { id: "section-1", title: "การยอมรับเงื่อนไข" },
  { id: "section-2", title: "ขอบเขตการให้บริการ" },
  { id: "section-3", title: "ราคาและการชำระเงิน" },
  { id: "section-4", title: "เงื่อนไขสภาพอุปกรณ์" },
  { id: "section-5", title: "การรับรองกรรมสิทธิ์" },
  { id: "section-6", title: "การยกเลิกและการคืนเงิน" },
  { id: "section-7", title: "การจำกัดความรับผิด" },
  { id: "section-8", title: "การคุ้มครองข้อมูลส่วนบุคคล" },
  { id: "section-9", title: "กฎหมายที่ใช้บังคับ" },
  { id: "section-10", title: "การเปลี่ยนแปลงเงื่อนไข" },
];

const PRICES = [
  { model: "iPhone 15 Pro Max", price: "38,000" },
  { model: "iPhone 15 Pro", price: "31,000" },
  { model: "iPhone 14 Pro Max", price: "28,000" },
  { model: "MacBook Pro M3", price: "52,000" },
];

const CONTACT_ITEMS = [
  { Icon: Mail, text: "info@khaiphone.com" },
  { Icon: Phone, text: "095-553-5167" },
  { Icon: MessageCircle, text: "LINE: @khaiphone" },
  { Icon: Clock, text: "เปิดทุกวัน 09:00 – 00:00" },
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

export default function TermsPage() {
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
            ขายไอโฟน.COM
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            เงื่อนไขการให้บริการ
          </h1>
          <p className="text-sm md:text-base leading-relaxed" style={{ color: "#6B7280" }}>
            กรุณาอ่านเงื่อนไขการให้บริการอย่างละเอียดก่อนใช้บริการรับซื้อของเรา
            <br className="hidden sm:block" />
            เพื่อความโปร่งใส ปลอดภัย และเป็นธรรมต่อทั้งสองฝ่าย
          </p>
        </div>
      </div>

      {/* Meta bar */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="rounded-xl border p-5" style={{ borderColor: "#F3F4F6" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-2 gap-x-4 mb-3">
            {[
              { Icon: Calendar,   label: "มีผลบังคับใช้", value: "20 พฤษภาคม 2569" },
              { Icon: RefreshCw,  label: "อัปเดตล่าสุด", value: "20 พฤษภาคม 2569" },
              { Icon: FileText,   label: "เวอร์ชันเอกสาร", value: "v1.0" },
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
                ครอบคลุมบริการรับซื้อ Apple มือสองทั้งหมดของ ขายไอโฟน.com
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
                หากมีข้อสงสัยเกี่ยวกับเงื่อนไขการให้บริการ สามารถติดต่อได้ที่
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { Icon: Tag,     text: 'ราคาประเมินออนไลน์เป็นเพียง "ราคาเบื้องต้น"' },
                  { Icon: Search,  text: "ราคาจริงขึ้นอยู่กับการตรวจสอบเครื่องจริง" },
                  { Icon: XCircle, text: "ลูกค้าสามารถปฏิเสธการขายได้ก่อนยืนยันขั้นสุดท้าย" },
                  { Icon: Cloud,   text: "อุปกรณ์ต้องออก iCloud / Apple ID ก่อนส่งมอบ" },
                ].map(({ Icon, text }, i) => (
                  <div key={i} className="flex flex-col items-center text-center gap-2">
                    <div
                      className="flex items-center justify-center rounded-full shrink-0"
                      style={{
                        width: 48,
                        height: 48,
                        border: `1.5px solid ${GOLD}`,
                      }}
                    >
                      <Icon size={24} color={GOLD} strokeWidth={1.5} />
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
              <H2 num={1} title="การยอมรับเงื่อนไข" />
              <BodyText>
                การใช้งานเว็บไซต์ ขายไอโฟน.com หรือช่องทางบริการอื่นของบริษัท ถือว่าท่านได้อ่าน เข้าใจ
                และยอมรับเงื่อนไขการให้บริการทั้งหมดนี้
              </BodyText>
              <BodyText>
                หากท่านไม่ยอมรับเงื่อนไขใด กรุณาหยุดใช้งานบริการทันที
              </BodyText>
              <Divider />
            </section>

            {/* Section 2 */}
            <section id="section-2">
              <H2 num={2} title="ขอบเขตการให้บริการ" />
              <BodyText>
                ขายไอโฟน.com ให้บริการรับซื้ออุปกรณ์ Apple มือสอง เช่น:
              </BodyText>
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "iPhone", "iPad", "MacBook", "Apple Watch", "AirPods",
                  "และอุปกรณ์อื่นที่บริษัทกำหนด",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <BodyText>รูปแบบการให้บริการ:</BodyText>
              <ul className="flex flex-col gap-1.5">
                {[
                  "ประเมินราคาออนไลน์ฟรี",
                  "นัดรับเครื่องถึงที่",
                  "รับส่งผ่านขนส่ง",
                  "นัดขายที่สาขา",
                  "ชำระเงินสดหรือโอนบัญชีธนาคาร",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <Divider />
            </section>

            {/* Section 3 */}
            <section id="section-3">
              <H2 num={3} title="ราคาและการชำระเงิน" />

              <H3 title="3.1 ราคาประเมินออนไลน์" />
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  'ราคาที่แสดงผ่านระบบเป็น "ราคาเบื้องต้น" เท่านั้น',
                  "ราคาสุดท้ายขึ้นอยู่กับการตรวจสอบสภาพเครื่องจริง",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>

              <H3 title="3.2 การเปลี่ยนแปลงราคา" />
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "หากสภาพเครื่องไม่ตรงกับข้อมูลที่แจ้ง",
                  "บริษัทมีสิทธิ์เสนอราคาปรับใหม่ตามสภาพจริง",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>

              <H3 title="3.3 สิทธิ์ในการปฏิเสธ" />
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "ลูกค้าสามารถปฏิเสธการขายได้",
                  "หากไม่ยอมรับราคาหลังตรวจสอบจริง โดยไม่มีค่าใช้จ่ายเพิ่มเติม",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>

              <H3 title="3.4 การชำระเงิน" />
              <BodyText>บริษัทจะชำระเงินหลัง:</BodyText>
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "ตรวจสอบเครื่องเสร็จสมบูรณ์",
                  "ยืนยันกรรมสิทธิ์",
                  "ลงนามเอกสารที่เกี่ยวข้องครบถ้วน",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <BodyText>ช่องทางชำระเงิน:</BodyText>
              <ul className="flex flex-col gap-1.5">
                {[
                  "เงินสด",
                  "โอนผ่านบัญชีธนาคารชื่อเดียวกับผู้ขาย",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <Divider />
            </section>

            {/* Section 4 */}
            <section id="section-4">
              <H2 num={4} title="เงื่อนไขสภาพอุปกรณ์" />
              <BodyText>ลูกค้ารับรองว่าข้อมูลเกี่ยวกับอุปกรณ์เป็นความจริง</BodyText>
              <BodyText>อุปกรณ์ที่นำมาขายต้อง:</BodyText>
              <ul className="flex flex-col gap-1.5 mb-4">
                {[
                  "สามารถเปิดใช้งานได้",
                  "ไม่ติด iCloud / Activation Lock",
                  "ไม่ถูกล็อกโดยผู้ให้บริการหรือองค์กร",
                  "ไม่มีข้อพิพาทด้านกรรมสิทธิ์",
                  "ไม่เป็นทรัพย์สินที่ได้มาโดยผิดกฎหมาย",
                ].map((item) => (
                  <CheckItem key={item} text={item} />
                ))}
              </ul>
              <BodyText>
                บริษัทอาจปฏิเสธการรับซื้อได้ทันที หากพบความผิดปกติหรือมีเหตุอันควรสงสัย
              </BodyText>
            </section>

            {/* ── Expand/Collapse sections 5–10 (mobile) ── */}
            <div className={expanded ? "block" : "hidden md:block"}>
              <Divider />

              {/* Section 5 */}
              <section id="section-5">
                <H2 num={5} title="การรับรองกรรมสิทธิ์" />
                <BodyText>ลูกค้ารับรองว่า:</BodyText>
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    "เป็นเจ้าของอุปกรณ์โดยชอบด้วยกฎหมาย หรือ",
                    "ได้รับสิทธิ์ในการขายจากเจ้าของโดยถูกต้อง",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <BodyText>
                  หากภายหลังพบข้อพิพาทด้านกรรมสิทธิ์ ลูกค้าตกลงรับผิดชอบความเสียหายที่เกิดขึ้นทั้งหมด
                </BodyText>
                <Divider />
              </section>

              {/* Section 6 */}
              <section id="section-6">
                <H2 num={6} title="การยกเลิกและการคืนเงิน" />
                <H3 title="ก่อนยืนยันการขาย" />
                <ul className="flex flex-col gap-1.5 mb-4">
                  <CheckItem text="ลูกค้าสามารถยกเลิกได้โดยไม่มีค่าใช้จ่าย" />
                </ul>
                <H3 title="หลังยืนยันและรับเงินแล้ว" />
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    "ถือว่าธุรกรรมเสร็จสมบูรณ์",
                    "ไม่สามารถยกเลิกหรือเรียกคืนอุปกรณ์ได้",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <H3 title="กรณีส่งพัสดุ" />
                <ul className="flex flex-col gap-1.5">
                  {[
                    "หากลูกค้ายกเลิกก่อนตรวจสอบเสร็จ",
                    "บริษัทจะดำเนินการส่งคืนตามเงื่อนไขที่กำหนด",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <Divider />
              </section>

              {/* Section 7 */}
              <section id="section-7">
                <H2 num={7} title="การจำกัดความรับผิด" />
                <BodyText>บริษัทไม่รับผิดชอบต่อ:</BodyText>
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    "ข้อมูลสูญหาย",
                    "ความเสียหายของข้อมูลภายในเครื่อง",
                    "การไม่ได้สำรองข้อมูลก่อนส่งมอบ",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <BodyText>ลูกค้าควร:</BodyText>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "Backup ข้อมูลทั้งหมด",
                    "ลบข้อมูลส่วนตัว",
                    "ออกจากระบบ Apple ID ก่อนส่งมอบทุกครั้ง",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <Divider />
              </section>

              {/* Section 8 */}
              <section id="section-8">
                <H2 num={8} title="การคุ้มครองข้อมูลส่วนบุคคล" />
                <BodyText>
                  บริษัทจะจัดเก็บและใช้ข้อมูลส่วนบุคคลตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล
                  พ.ศ. 2562 (PDPA)
                </BodyText>
                <BodyText>ข้อมูลที่อาจจัดเก็บ:</BodyText>
                <ul className="flex flex-col gap-1.5 mb-4">
                  {[
                    "ชื่อ", "เบอร์โทรศัพท์", "อีเมล",
                    "เลขบัญชีธนาคาร",
                    "รายละเอียดอุปกรณ์",
                    "ประวัติการทำรายการ",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <BodyText>บริษัทจะไม่นำข้อมูลไปเผยแพร่แก่บุคคลภายนอก เว้นแต่:</BodyText>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "ได้รับความยินยอม",
                    "มีข้อกำหนดทางกฎหมาย",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <Divider />
              </section>

              {/* Section 9 */}
              <section id="section-9">
                <H2 num={9} title="กฎหมายที่ใช้บังคับ" />
                <BodyText>เงื่อนไขการให้บริการนี้อยู่ภายใต้กฎหมายไทย</BodyText>
                <BodyText>หากเกิดข้อพิพาท:</BodyText>
                <ul className="flex flex-col gap-1.5">
                  {[
                    "ทั้งสองฝ่ายตกลงเจรจาก่อน",
                    "หากไม่สามารถตกลงได้ ให้ใช้ศาลไทยเป็นผู้พิจารณา",
                  ].map((item) => (
                    <CheckItem key={item} text={item} />
                  ))}
                </ul>
                <Divider />
              </section>

              {/* Section 10 */}
              <section id="section-10">
                <H2 num={10} title="การเปลี่ยนแปลงเงื่อนไข" />
                <BodyText>
                  บริษัทสงวนสิทธิ์ในการปรับปรุงหรือแก้ไขเงื่อนไขโดยไม่ต้องแจ้งให้ทราบล่วงหน้า
                </BodyText>
                <BodyText>
                  การใช้งานบริการต่อหลังมีการแก้ไข ถือว่าท่านยอมรับเงื่อนไขฉบับใหม่แล้ว
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
                {expanded ? "ย่อเงื่อนไข" : "ดูเงื่อนไขทั้งหมด"}
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
                หากมีข้อสงสัยเกี่ยวกับเงื่อนไขการให้บริการ กรุณาติดต่อ
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
            พร้อมขายเครื่องของคุณหรือยัง?
          </h2>
          <p className="text-sm mb-8" style={{ color: "#9CA3AF" }}>
            ประเมินราคาฟรี ไม่ผูกมัด รับเงินสดทันที
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
            <span style={{ color: "#9CA3AF", fontWeight: 400 }}>(อัปเดต 20 พ.ค. 2567)</span>
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
