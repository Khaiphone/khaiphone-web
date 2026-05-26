import type { Metadata } from "next";
import { ChevronDown, ChevronRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { blogPosts } from "@/lib/blogData";
import BlogSearch from "./BlogSearch";

export const metadata: Metadata = {
  title: "บทความและความรู้ | ขายไอโฟน.com",
  description:
    "รวมบทความ ข่าวสาร และเทคนิคการขาย iPhone iPad MacBook มือสอง อัปเดตทุกสัปดาห์",
};

// ── Posts — sorted newest first ────────────────────────────────────────────────

const posts = [...blogPosts].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
);

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
  { label: "วิธีล้างข้อมูล iPhone ก่อนขาย ให้ปลอดภัย 100%", href: "/blog/erase-iphone-before-selling" },
  { label: "iPhone จอแตก ขายได้ไหม?",                        href: "/blog/iphone-broken-screen"        },
  { label: "อัปเดตราคารับซื้อ iPhone พฤษภาคม 2567",          href: "/blog/iphone-price-may-2024"       },
  { label: "ขาย iPhone ต้องลบอะไรบ้างก่อนไปขาย?",            href: "/blog/what-to-delete-before-sell"  },
  { label: "รับซื้อ MacBook รุ่นไหนบ้างในปี 2024",            href: "/blog/macbook-buyback-2024"        },
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
      <section className="pt-14 md:pt-20 pb-0 px-4 text-center" style={{ background: "#f9f9f7" }}>
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
        </div>
      </section>

      {/* ── Search + Categories + Grid (client — interactive) ─────────────── */}
      <BlogSearch posts={posts} />

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
          <p className="text-base mb-1.5" style={{ color: "#6B7280" }}>ประเมินฟรีภายใน 1 นาที</p>
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
          <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#6B7280" }}>
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
            <span className="text-xs" style={{ color: "#6B7280" }}>อัปเดต 18 พ.ค. 2567</span>
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
