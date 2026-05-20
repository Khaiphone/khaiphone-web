import type { Metadata } from "next";
import { Calendar, Clock, ChevronDown, ChevronRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";

export const metadata: Metadata = {
  title: "บทความและความรู้ | ขายไอโฟน.com",
  description:
    "รวมบทความ ข่าวสาร และเทคนิคการขาย iPhone iPad MacBook มือสอง อัปเดตทุกสัปดาห์",
};

// ── Mock data ──────────────────────────────────────────────────────────────────

const posts = [
  { id: 1, category: "ราคาล่าสุด",    date: "18 พ.ค. 2567", readTime: "2 นาที", title: "อัปเดตราคารับซื้อ iPhone ล่าสุด เดือนพฤษภาคม 2024",     slug: "iphone-price-may-2024",      image: "/blog_iphone-price.webp"  },
  { id: 2, category: "ปัญหาเครื่อง",  date: "17 พ.ค. 2567", readTime: "4 นาที", title: "ลืมออกจาก iCloud ก่อนขาย ทำยังไง? แก้ไขได้ไหม?",          slug: "icloud-before-sell",         image: "/blog_iphone-delete.webp" },
  { id: 3, category: "ปัญหาเครื่อง",  date: "16 พ.ค. 2567", readTime: "3 นาที", title: "แบตเสื่อม ขายได้มั้ย? มีผลต่อราคาขนาดไหน อัปเดต 2024",    slug: "battery-health-price",       image: "/blog_iphone-broken.webp" },
  { id: 4, category: "วิธีการขาย",    date: "15 พ.ค. 2567", readTime: "5 นาที", title: "เตรียม iPhone ก่อนขาย ทำตามนี้ ได้ราคาแน่นอน",             slug: "prepare-iphone-before-sell", image: "/blog_iphone-delete.webp" },
  { id: 5, category: "MacBook / iPad", date: "14 พ.ค. 2567", readTime: "3 นาที", title: "เช็กราคารับซื้อ MacBook มือสอง อัปเดต 2024",               slug: "macbook-best-price",         image: "/blog_macbook.webp"       },
  { id: 6, category: "ความปลอดภัย",   date: "13 พ.ค. 2567", readTime: "4 นาที", title: "ขาย iPhone ยังไงให้ข้อมูลไม่หลุด ปลอดภัย 100%",            slug: "sell-iphone-safely",         image: "/blog_iphone-delete.webp" },
];

const categories = ["ทั้งหมด", "ราคาล่าสุด", "วิธีการขาย", "ปัญหาเครื่อง", "ความปลอดภัย", "MacBook / iPad", "เปรียบเทียบ"];

const faqs = [
  { q: "ขาย iPhone ต้องเตรียมอะไรบ้าง?",    a: "เตรียม 3 อย่าง ได้แก่ (1) บัตรประชาชนตัวจริง (2) ออก iCloud และ Apple ID ให้เรียบร้อยก่อนส่งมอบ และ (3) กล่องและอุปกรณ์ที่มีอยู่ เช่น สายชาร์จ adapter" },
  { q: "ประเมินราคาฟรีไหม?",                 a: "ฟรีทุกขั้นตอนครับ ตั้งแต่ประเมินออนไลน์จนถึงตรวจสอบเครื่องจริง ไม่มีค่าใช้จ่ายใดๆ ทั้งสิ้น" },
  { q: "ขายติด iCloud ได้ไหม?",              a: "ไม่ได้ครับ ต้องออก iCloud ก่อนส่งมอบทุกครั้ง เพื่อความปลอดภัยของข้อมูลคุณและผู้ซื้อ" },
  { q: "ใช้เวลาตรวจสอบนานไหม?",              a: "ประมาณ 15-30 นาทีครับ ขึ้นอยู่กับสภาพเครื่อง ทีมงานจะตรวจสอบอย่างละเอียดและโปร่งใส" },
  { q: "รับเงินวันไหน?",                     a: "รับเงินทันทีหลังตรวจสอบเครื่องเสร็จครับ ทั้งเงินสดและโอนเงินผ่านพร้อมเพย์หรือบัญชีธนาคาร" },
  { q: "รับซื้อพื้นที่ไหนบ้าง?",             a: "ครอบคลุมทั่ว กทม. และปริมณฑล สามารถนัดรับถึงที่ได้ หรือส่งพัสดุมาให้เราได้ทั่วไทย ไม่มีค่าใช้จ่ายเพิ่มเติม" },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const internalLinks = [
  { label: "ขาย iPhone ที่ไหนดีที่สุด 2024",             href: "/blog/where-to-sell-iphone"     },
  { label: "วิธีเช็ค iCloud ก่อนขาย ทำยังไง?",            href: "/blog/check-icloud-before-sell"  },
  { label: "ราคา iPhone ล่าสุด พฤษภาคม 2567",             href: "/blog/iphone-price-may-2024"     },
  { label: "แบตเสื่อมขายได้ไหม? มีผลต่อราคาแค่ไหน",       href: "/blog/battery-health-price"      },
  { label: "MacBook รุ่นไหนราคาดีที่สุดตอนนี้",            href: "/blog/macbook-best-price"        },
  { label: "ขาย iPhone จอแตก ราคาเป็นยังไง?",             href: "/blog/broken-screen-price"       },
];

const latestPrices = [
  { model: "iPhone 17 Pro Max", price: "฿38,000" },
  { model: "iPhone 16 Pro",     price: "฿31,500" },
  { model: "MacBook Pro M3",    price: "฿52,000" },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="py-14 md:py-20 px-4 text-center" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
            style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B" }}
          >
            บทความและความรู้
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-black mb-4">บทความน่าสนใจ</h1>
          <p className="text-sm md:text-base mb-9" style={{ color: "#6B7280" }}>
            รวมบทความ ข่าวสาร และเทคนิคเกี่ยวกับการซื้อ-ขาย iPhone, iPad, MacBook มือสอง
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "#9CA3AF" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              placeholder="ค้นหาบทความ เช่น จอแตก, iCloud, แบต, ราคา iPhone 15"
              className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm bg-white"
              style={{
                border: "1.5px solid #E5E7EB",
                outline: "none",
                fontFamily: "var(--font-prompt), sans-serif",
                color: "#111",
              }}
            />
          </div>
        </div>
      </section>

      {/* ── Category Filter ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-white px-4 py-3.5" style={{ borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat, i) => (
            <a
              key={cat}
              href={i === 0 ? "/blog" : `/blog?category=${encodeURIComponent(cat)}`}
              className="flex-none px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
              style={
                i === 0
                  ? { background: "#B8860B", color: "#fff" }
                  : { background: "#fff", color: "#374151", border: "1.5px solid #E5E7EB" }
              }
            >
              {cat}
            </a>
          ))}
        </div>
      </div>

      {/* ── Blog Grid ──────────────────────────────────────────────────────── */}
      <section className="py-10 md:py-14 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group flex flex-col gap-3"
                style={{ textDecoration: "none" }}
              >
                {/* Cover image */}
                <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "3/2" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span
                    className="absolute bottom-3 left-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
                    style={{ background: "#B8860B" }}
                  >
                    {post.category}
                  </span>
                </div>

                {/* Content */}
                <div>
                  <h2 className="font-bold text-black text-sm md:text-base leading-snug line-clamp-2 mb-2 group-hover:text-[#B8860B] transition-colors">
                    {post.title}
                  </h2>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#9CA3AF" }}>
                      <Calendar size={11} />{post.date}
                    </span>
                    <span className="flex items-center gap-1 text-xs" style={{ color: "#9CA3AF" }}>
                      <Clock size={11} />{post.readTime}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Pagination — hidden until real backend pagination exists */}
        </div>
      </section>

      {/* ── Section 1: FAQ SEO ─────────────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-white" style={{ borderTop: "1px solid #F3F4F6" }}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-6">คำถามที่พบบ่อย</h2>
          <div>
            {faqs.map(({ q, a }, i) => (
              <details key={i} className="group" style={{ borderBottom: "1px solid #E5E7EB" }}>
                <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none list-none">
                  <span className="font-semibold text-black text-sm md:text-base leading-snug">{q}</span>
                  <div className="flex-shrink-0 transition-transform duration-200 group-open:rotate-180" style={{ color: "#B8860B" }}>
                    <ChevronDown size={18} />
                  </div>
                </summary>
                <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 2: CTA Dark ────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center" style={{ background: "#111111" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            อยากรู้ราคาขายเครื่องของคุณ?
          </h2>
          <p className="text-base mb-1.5" style={{ color: "#9CA3AF" }}>ประเมินฟรีภายใน 1 นาที</p>
          <p className="text-sm mb-10" style={{ color: "#6B7280" }}>ไม่มีค่าใช้จ่าย • นัดรับได้ทั่วประเทศ</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/sell"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-white whitespace-nowrap w-full sm:w-auto transition-opacity hover:opacity-90"
              style={{ background: "#B8860B" }}
            >
              ประเมินราคาฟรี →
            </a>
            <a
              href="/trade-in"
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-full text-sm font-semibold text-white whitespace-nowrap w-full sm:w-auto transition-colors hover:bg-white hover:text-black"
              style={{ border: "1.5px solid rgba(255,255,255,0.25)" }}
            >
              ดูราคารับซื้อ
            </a>
          </div>
        </div>
      </section>

      {/* ── Section 3: Internal Links ──────────────────────────────────────── */}
      <section className="py-12 px-4" style={{ background: "#f9f9f7" }}>
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#9CA3AF" }}>
            บทความยอดนิยม
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {internalLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white transition-shadow hover:shadow-sm"
                style={{ border: "1px solid #E5E7EB", textDecoration: "none" }}
              >
                <ChevronRight size={14} style={{ color: "#B8860B", flexShrink: 0 }} />
                <span className="text-sm font-medium text-black leading-snug group-hover:text-[#B8860B] transition-colors">
                  {label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Latest Price Widget ────────────────────────────────── */}
      <section className="py-5 px-4 bg-white" style={{ borderTop: "1px solid #F3F4F6", borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm font-bold text-black">ราคารับซื้อล่าสุด</span>
            <span className="text-xs" style={{ color: "#9CA3AF" }}>อัปเดต 18 พ.ค. 2567</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {latestPrices.map(({ model, price }) => (
              <div key={model} className="flex items-center gap-2">
                <span className="text-sm" style={{ color: "#374151" }}>{model}</span>
                <span className="text-sm font-bold" style={{ color: "#B8860B" }}>{price}</span>
              </div>
            ))}
          </div>
          <a
            href="/trade-in"
            className="text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-opacity hover:opacity-75"
            style={{ color: "#B8860B" }}
          >
            ดูราคาทั้งหมด →
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
