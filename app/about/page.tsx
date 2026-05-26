import type { Metadata } from "next";
import { Phone, MessageCircle, MapPin, ShieldCheck, Zap, Star, Clock } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "เกี่ยวกับเรา | ขายไอโฟน.com รับซื้อ Apple มือสองรังสิต",
  description:
    "ขายไอโฟน.com ร้านรับซื้อ iPhone iPad MacBook Apple Watch มือสอง ให้ราคาสูง จ่ายเงินสดทันที บริการรับถึงที่ทั่ว กทม. และปริมณฑล",
  alternates: { canonical: "https://khaiphone.com/about" },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "ขายไอโฟน.com",
    title: "เกี่ยวกับเรา | ขายไอโฟน.com",
    description:
      "ร้านรับซื้อ Apple มือสองที่รังสิต ปทุมธานี ให้ราคาสูง จ่ายเงินสดทันที บริการรับถึงที่",
    url: "https://khaiphone.com/about",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "ขายไอโฟน.com" }],
  },
};

const breadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: "https://khaiphone.com" },
    { "@type": "ListItem", position: 2, name: "เกี่ยวกับเรา", item: "https://khaiphone.com/about" },
  ],
};

const trustPoints = [
  {
    Icon: Star,
    title: "ให้ราคาสูงสุด",
    desc: "เช็กราคาตลาดทุกวัน ให้ราคาที่ยุติธรรมและแข่งขันได้ ไม่กดราคาโดยไม่มีเหตุผล",
  },
  {
    Icon: Zap,
    title: "จ่ายเงินทันที",
    desc: "ตรวจสอบเครื่องเสร็จรับเงินสดหรือโอนทันที ไม่ต้องรอ ไม่ต้องติดตาม",
  },
  {
    Icon: ShieldCheck,
    title: "โปร่งใส ไม่มีค่าใช้จ่ายซ่อน",
    desc: "ราคาที่เสนอคือราคาที่คุณได้รับ ไม่มีการหักค่าบริการหรือค่าใช้จ่ายแอบแฝง",
  },
  {
    Icon: MapPin,
    title: "รับถึงที่ทั่ว กทม.",
    desc: "ส่งทีมไปรับเครื่องถึงบ้าน ที่ทำงาน หรือจุดนัดหมายที่คุณสะดวก ทั่ว กทม. และปริมณฑล",
  },
];

const devices = [
  { name: "iPhone",      desc: "ทุกรุ่น ทุกความจุ ทุกสภาพ"               },
  { name: "iPad",        desc: "iPad, iPad Air, iPad Pro, iPad mini"       },
  { name: "MacBook",     desc: "MacBook Air, MacBook Pro ทุกชิป"           },
  { name: "Apple Watch", desc: "Series 3 ขึ้นไป ทุกขนาด"                  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 px-4 text-center" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B" }}
          >
            เกี่ยวกับเรา
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-black mb-5 leading-tight">
            ร้านรับซื้อ Apple มือสอง
            <br className="hidden md:block" />
            <span style={{ color: "#B8860B" }}>ที่คุณวางใจได้</span>
          </h1>
          <p
            className="text-sm md:text-base leading-relaxed max-w-2xl mx-auto"
            style={{ color: "#6B7280" }}
          >
            ขายไอโฟน.com คือร้านรับซื้อ Apple มือสองที่รังสิต ปทุมธานี
            ให้ราคาสูง จ่ายเงินสดทันที พร้อมบริการรับถึงที่ทั่ว กทม. และปริมณฑล
          </p>
        </div>
      </section>

      {/* ── ทำไมต้องเลือกเรา ─────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-10 text-center">
            ทำไมต้องเลือกเรา
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {trustPoints.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="flex gap-4 p-6 rounded-2xl"
                style={{ background: "#f9f9f7" }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(184,134,11,0.1)" }}
                >
                  <Icon size={18} style={{ color: "#B8860B" }} />
                </div>
                <div>
                  <p className="font-bold text-black text-sm mb-1">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── สิ่งที่เรารับซื้อ ─────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4" style={{ background: "#f9f9f7" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-3 text-center">
            สิ่งที่เรารับซื้อ
          </h2>
          <p className="text-sm text-center mb-10" style={{ color: "#6B7280" }}>
            รับซื้อ Apple ทุกรุ่น ทุกสภาพ ทั่วประเทศ
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {devices.map(({ name, desc }) => (
              <div
                key={name}
                className="text-center p-6 rounded-2xl bg-white"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <p className="font-bold text-black text-base mb-1">{name}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ข้อมูลติดต่อ ──────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-3">ติดต่อเรา</h2>
          <div className="flex items-center justify-center gap-1.5 mb-10" style={{ color: "#6B7280" }}>
            <Clock size={13} />
            <span className="text-sm">เปิดทุกวัน 09:00 – 00:00</span>
            <span className="text-sm mx-1">•</span>
            <MapPin size={13} />
            <span className="text-sm">รังสิต ปทุมธานี</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="tel:0955535167"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-white whitespace-nowrap w-full sm:w-auto transition-opacity hover:opacity-90"
              style={{ background: "#B8860B" }}
            >
              <Phone size={15} />
              095-553-5167
            </a>
            <a
              href="https://line.me/R/ti/p/@khaiphone"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold whitespace-nowrap w-full sm:w-auto transition-colors hover:bg-gray-50"
              style={{ border: "1.5px solid #E5E7EB", color: "#111" }}
            >
              <MessageCircle size={15} />
              LINE: @khaiphone
            </a>
          </div>
        </div>
      </section>

      {/* ── Dark CTA ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center" style={{ background: "#111111" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            พร้อมขายเครื่องแล้วใช่ไหม?
          </h2>
          <p className="text-base mb-1.5" style={{ color: "#6B7280" }}>ประเมินฟรีภายใน 1 นาที</p>
          <p className="text-sm mb-10" style={{ color: "#6B7280" }}>ไม่มีค่าใช้จ่าย • นัดรับได้ทั่วประเทศ</p>
          <a
            href="/sell"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#B8860B" }}
          >
            ประเมินราคาฟรี →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
