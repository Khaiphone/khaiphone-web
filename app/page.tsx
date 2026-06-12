import type { Metadata } from "next";

export const revalidate = 3600;
import Image from "next/image";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Truck, Banknote, Clock, ShieldCheck, ChevronDown, ChevronRight, Lock } from "lucide-react";
import HowToSellSection from "./components/HowToSellSection";
import ReviewSection from "./components/ReviewSection";
import { blogPosts } from "@/lib/blogData";
import { fetchPublicActiveProducts } from "@/app/actions/products";

export const metadata: Metadata = {
  title: "Khaiphone.com — รับซื้อ iPhone iPad MacBook ให้ราคาสูง",
  description: "รับซื้อ iPhone, iPad, MacBook, Apple Watch ทุกรุ่น ให้ราคาสูง จ่ายเงินสดทันที ประเมินราคาฟรี ไม่ผูกมัด รับถึงที่ทั่ว กทม.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Khaiphone.com",
    title: "Khaiphone.com — รับซื้อ iPhone iPad MacBook ให้ราคาสูง",
    description: "รับซื้อ iPhone, iPad, MacBook, Apple Watch ทุกรุ่น ให้ราคาสูง จ่ายเงินสดทันที ประเมินราคาฟรี ไม่ผูกมัด",
    url: "/",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Khaiphone.com" }],
  },
};

type IconProps = { className?: string; style?: React.CSSProperties };

function IconClock({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconBolt({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconShield({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}



const latestPosts = [...blogPosts]
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  .slice(0, 4);

const faqs = [
  { q: "รับซื้อ iPhone รุ่นไหนบ้าง?", a: "รับซื้อ iPhone ทุกรุ่น ตั้งแต่ iPhone 11 ถึง iPhone 17 Series ทั้ง Pro Max, Pro, Plus, Air รวมถึง iPad, MacBook และ Apple Watch ทุกรุ่น ทั้ง TH/A และ ZP/A" },
  { q: "ต้องเตรียมอะไรมาบ้างก่อนขาย?", a: "เตรียม 3 อย่าง — (1) ออก iCloud หรือออกจาก Apple ID ให้เรียบร้อย (2) เตรียมกล่องและอุปกรณ์ที่มี (3) บัตรประชาชนตัวจริงหรือสำเนา เพื่อทำสัญญาซื้อขาย" },
  { q: "เครื่องที่ติด iCloud ขายได้ไหม?", a: "ไม่ได้ครับ ต้องออก iCloud ก่อนส่งมอบทุกครั้ง" },
  { q: "ไม่มีกล่องหรืออุปกรณ์ครบ ขายได้ไหม?", a: "ได้ครับ ไม่มีกล่องก็ขายได้ แต่ราคาอาจปรับลงเล็กน้อย" },
  { q: "รับซื้อถึงที่ ครอบคลุมพื้นที่ไหนบ้าง?", a: "ทั่ว กทม. และปริมณฑล ไม่มีค่าใช้จ่ายเพิ่ม" },
  { q: "จ่ายเงินเมื่อไหร่?", a: "จ่ายทันทีหลังตรวจเช็คเครื่อง โอนหรือเงินสดได้" },
  { q: "ราคาที่ประเมินออนไลน์ตรงกับราคาจริงไหม?", a: "ราคาออนไลน์เป็นราคาประมาณการ ราคาจริงขึ้นอยู่กับสภาพเครื่องหลังตรวจสอบ หากข้อมูลตรงตามที่ลูกค้าแจ้งจะได้ราคาตามที่ประเมินเลย" },
  { q: "ข้อมูลในเครื่องจะถูกลบไหม?", a: "ลูกค้า backup และลบข้อมูลเองก่อนส่งมอบ และเจ้าหน้าที่จะล้างเครื่องให้อีกครั้ง" },
];

function BlogSection() {
  return (
    <section className="py-8 md:py-16 px-4 bg-white">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <div
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-4"
            style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B" }}
          >
            บทความล่าสุด
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-2">
            ความรู้และอัปเดตราคาล่าสุด
          </h2>
          <p className="text-sm md:text-base" style={{ color: "#6B7280" }}>
            รวมทุกข้อมูลที่ช่วยให้คุณขายได้ง่าย ได้ราคา ไม่พลาดทุกการอัปเดต
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
          {latestPosts.map((post) => (
            <a
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-3"
              style={{ textDecoration: "none" }}
            >
              {/* Image with category badge */}
              <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <span
                  className="absolute bottom-3 left-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
                  style={{ background: "#B8860B" }}
                >
                  {post.category}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs" style={{ color: "#6B7280" }}>{post.displayDate}</p>
                <h3 className="font-bold text-black text-sm md:text-base leading-snug line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-xs md:text-sm leading-relaxed line-clamp-2" style={{ color: "#6B7280" }}>
                  {post.excerpt}
                </p>
                <span className="text-sm font-semibold mt-0.5" style={{ color: "#B8860B" }}>
                  อ่านต่อ →
                </span>
              </div>
            </a>
          ))}
        </div>

        {/* View all button */}
        <div className="flex justify-center mt-8 md:mt-10">
          <a
            href="/blog"
            className="flex items-center gap-2 px-7 py-3 rounded-full text-sm font-semibold text-black hover:bg-gray-50 transition-colors"
            style={{ border: "1.5px solid #D1D5DB" }}
          >
            ดูบทความทั้งหมด →
          </a>
        </div>

      </div>
    </section>
  );
}

function FAQSection() {
  return (
    <section className="py-8 md:py-16 px-4 bg-white">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-left md:text-center text-black mb-6 md:mb-10">
          คำถามที่พบบ่อย
        </h2>
        <div>
          {faqs.map(({ q, a }, i) => (
            <details key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
              <summary
                className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none"
                style={{ listStyle: "none" }}
              >
                <span className="font-semibold text-black text-sm md:text-base leading-snug">{q}</span>
                <ChevronDown size={18} style={{ color: "#B8860B", flexShrink: 0 }} />
              </summary>
              <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function Home() {
  // Top 5 iPhones: one row per model, highest storage price
  const allProds = await fetchPublicActiveProducts();
  const topIphones = Object.values(
    allProds
      .filter(p => p.category === "iphone")
      .reduce<Record<string, { model: string; storage: string; price: number }>>((acc, p) => {
        if (!acc[p.model] || p.price_good > acc[p.model].price) {
          acc[p.model] = { model: p.model, storage: p.storage, price: p.price_good };
        }
        return acc;
      }, {})
  )
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden" style={{ background: "#f5f5f7" }}>
        {/* Layout container — min-height drives section height on desktop */}
        <div
          className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center pt-5 pb-10 md:pt-10 md:pb-20"
          style={{ minHeight: "clamp(420px, 38vw, 580px)" }}
        >
          {/* Left Content */}
          <div className="flex flex-col gap-2 md:gap-4 relative z-10 w-full md:flex-shrink-0" style={{ maxWidth: "460px" }}>
            <div>
              {/* Mobile: inline headings; Desktop: stacked */}
              <h1 className="flex flex-wrap items-baseline gap-x-2 md:block leading-tight" style={{ fontWeight: 700 }}>
                <span className="basis-full font-medium mb-1 md:mb-2 text-base md:text-xl" style={{ color: "#222222", fontWeight: 500 }}>รับซื้อ iPhone, iPad, MacBook, Apple Watch</span>
                <span className="md:block text-black" style={{ fontSize: "clamp(2rem, 7vw, 3.5rem)" }}>
                  ให้ราคาสูง
                </span>
                <span className="md:block" style={{ fontSize: "clamp(2rem, 7vw, 3.8rem)", color: "#B8860B" }}>
                  จ่ายเงินสดทันที
                </span>
              </h1>
            </div>
            <p className="text-sm md:text-lg" style={{ color: "#333333" }}>
              ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด<br />ขายง่าย ได้เงินไว
            </p>

            {/* Mobile: image full width */}
            <div className="md:hidden" style={{ margin: "-56px -1rem 0", width: "calc(100% + 2rem)" }}>
              <Image src="/hero-products.webp" alt="Apple products" width={1536} height={1024} priority fetchPriority="high" style={{ width: "100%", height: "auto", display: "block" }} sizes="100vw" />
            </div>

            {/* Mobile: badges below image */}
            <div className="md:hidden flex rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid #e5e5e5", boxShadow: "0 2px 16px rgba(0,0,0,0.10)" }}>
              {[
                { Icon: IconClock, title: "ให้ราคาสูง", sub: "มากกว่าที่อื่น" },
                { Icon: IconBolt, title: "จ่ายเงินสดทันที", sub: "ไม่ต้องรอนาน" },
                { Icon: IconShield, title: "ปลอดภัย เชื่อถือได้", sub: "ข้อมูลไม่รั่วไหล" },
              ].map(({ Icon, title, sub }, i) => (
                <div key={title} className="flex flex-col items-center gap-1 px-2 py-3"
                  style={{ flex: "1 1 0", minWidth: 0, ...(i > 0 ? { borderLeft: "1px solid #e5e5e5" } : {}) }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(184,134,11,0.22)" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: "#B8860B" }} />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-black leading-snug" style={{ fontSize: "10px" }}>{title}</p>
                    <p className="leading-snug" style={{ fontSize: "9px", color: "#6B7280" }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Feature Badges */}
            <div className="hidden md:flex rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e5e5", backgroundColor: "#fff" }}>
              {[
                { Icon: IconClock, title: "ให้ราคาสูง", sub: "มากกว่าที่อื่น" },
                { Icon: IconBolt, title: "จ่ายเงินสดทันที", sub: "ไม่ต้องรอนาน" },
                { Icon: IconShield, title: "ปลอดภัย เชื่อถือได้", sub: "ข้อมูลไม่รั่วไหล" },
              ].map(({ Icon, title, sub }, i) => (
                <div key={title} className="flex items-center gap-2 px-3 py-2.5"
                  style={{ flex: "1 1 0", minWidth: 0, ...(i > 0 ? { borderLeft: "1px solid #e5e5e5" } : {}) }}>
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(184,134,11,0.22)" }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: "#B8860B" }} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-black leading-snug" style={{ fontSize: "11px" }}>{title}</p>
                    <p className="leading-snug" style={{ fontSize: "10px", color: "#6B7280" }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTAs — stacked full-width on mobile, row on desktop */}
            <div className="flex flex-col md:flex-row gap-3 mt-3 md:mt-0">
              <a
                href="/sell"
                className="flex items-center justify-center gap-2 bg-black text-white font-bold px-7 py-4 rounded-full hover:bg-gray-800 transition-colors text-base"
              >
                ประเมินราคาฟรี →
              </a>
              <a
                href="/trade-in"
                className="flex items-center justify-center font-semibold px-7 py-4 rounded-full hover:bg-black hover:text-white transition-colors text-base"
                style={{ backgroundColor: "rgba(255,255,255,0.9)", border: "2px solid #111" }}
              >
                ดูรายการรับซื้อ
              </a>
            </div>
          </div>
        </div>

        {/* Desktop: image absolute-positioned from right */}
        <Image
          src="/hero-products.webp"
          alt="iPhone, iPad, MacBook, Apple Watch, AirPods"
          width={1536}
          height={1024}
          priority
          fetchPriority="high"
          className="hidden md:block absolute pointer-events-none select-none"
          style={{
            right: 0,
            top: "50%",
            transform: "translateY(-50%)",
            height: "clamp(480px, 43vw, 640px)",
            width: "auto",
            maxWidth: "none",
          }}
          sizes="(max-width: 768px) 0px, 50vw"
        />
      </section>

      {/* Feature Strip */}
      <section style={{ position: "relative", zIndex: 10, marginTop: "16px" }}>
        <div>
          <div className="flex" style={{ background: "#111111" }}>
            {[
              { Icon: Truck, title: "รับซื้อถึงที่", sub: "ทั่ว กทม. และปริมณฑล" },
              { Icon: Clock, title: "ตรวจเช็คไว", sub: "มีมาตรฐาน ใช้เวลาไม่นาน" },
              { Icon: Banknote, title: "จ่ายเงินสดทันที", sub: "โอนเงินสด ไม่ต้องรอ" },
              { Icon: ShieldCheck, title: "ไม่กดราคา", sub: "ให้ราคาดีที่สุด" },
            ].map(({ Icon, title, sub }, i) => (
              <div
                key={title}
                className="flex flex-col items-center gap-2 px-4 py-5"
                style={{ flex: "1 1 0", minWidth: 0, ...(i > 0 ? { borderLeft: "1px solid #333" } : {}) }}
              >
                <Icon size={22} color="#B8860B" />
                <div className="text-center">
                  <p className="font-semibold text-white text-sm leading-snug">{title}</p>
                  <p className="text-xs mt-0.5 leading-snug" style={{ color: "#888" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-8 md:py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-left md:text-center text-black mb-5 md:mb-10">
            เรารับซื้ออุปกรณ์ Apple
          </h2>
          <div
            className="-mx-4 md:mx-0 px-4 md:px-0 flex overflow-x-auto gap-3 pb-2 md:grid md:grid-cols-5 md:overflow-visible md:gap-4 md:pb-0"
            style={{ scrollbarWidth: "none" }}
          >
            {[
              { img: "/product-iphone.webp", name: "iPhone",      sub: "ทุกรุ่น", scale: 1,    href: "/sell?category=iphone" },
              { img: "/product-ipad.webp",    name: "iPad",         sub: "ทุกรุ่น", scale: 1,    href: "/sell?category=ipad"   },
              { img: "/product-macbook.webp", name: "MacBook",      sub: "ทุกรุ่น", scale: 1.35, href: "/sell?category=macbook"},
              { img: "/product-watch.webp",   name: "Apple Watch",  sub: "ทุกรุ่น", scale: 1,    href: "/sell?category=watch"  },
              { img: "/product-airpods.webp",name: "AirPods",      sub: "ทุกรุ่น", scale: 1,    href: null                    },
            ].map((p) => (
              <a
                key={p.name}
                href={p.href ?? undefined}
                className="flex-none w-[28vw] md:w-auto flex flex-col items-center bg-white border border-gray-100 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm transition-shadow group"
                style={{ textDecoration: "none", cursor: p.href ? "pointer" : "default" }}
              >
                <div className={`relative w-full h-20 md:h-28 mb-2 md:mb-3 flex items-center justify-center transition-transform ${p.href ? "group-hover:scale-105" : ""}`}>
                  <Image src={p.img} alt="" fill className="object-contain" style={{ transform: `scale(${p.scale})` }} sizes="(max-width: 768px) 28vw, 180px" />
                </div>
                <p className="font-bold text-black text-xs md:text-lg text-center">{p.name}</p>
                <p className="text-xs mb-4 hidden md:block" style={{ color: "#6B7280" }}>{p.sub}</p>
                {p.href ? (
                  <span className="hidden md:block w-full border border-gray-300 font-medium py-2 rounded-full text-sm text-center transition-colors group-hover:bg-black group-hover:text-white group-hover:border-black" style={{ color: "#374151" }}>
                    ประเมินราคา
                  </span>
                ) : (
                  <span className="hidden md:block w-full border font-medium py-2 rounded-full text-sm text-center" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", color: "#6B7280" }}>
                    เร็วๆ นี้
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How to Sell */}
      <HowToSellSection />

      {/* Reviews */}
      <ReviewSection />

      {/* Comparison Section */}
      <section className="py-8 md:py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-left md:text-center text-black mb-2">
            ทำไมต้องเลือก <span style={{ color: "#B8860B" }}>Khaiphone.com</span>?
          </h2>
          <p className="text-sm md:text-base text-left md:text-center mb-8 md:mb-10" style={{ color: "#6B7280" }}>
            เปรียบเทียบกับช่องทางอื่น
          </p>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-4 text-center text-xs md:text-sm font-bold">
              <div className="bg-gray-100 px-2 py-4 text-left pl-4" style={{ color: "#6B7280" }}>เปรียบเทียบ</div>
              <div className="px-2 py-4 text-white" style={{ background: "#111" }}>
                <div className="text-xs mb-0.5" style={{ color: "#B8860B" }}>●</div>
                Khaiphone.com
              </div>
              <div className="bg-gray-100 px-2 py-4 leading-snug" style={{ color: "#374151" }}>Trade-in<br/>กับศูนย์</div>
              <div className="bg-gray-100 px-2 py-4 leading-snug" style={{ color: "#374151" }}>ขาย<br/>ออนไลน์เอง</div>
            </div>

            {/* Rows */}
            {[
              { label: "ราคาที่ได้สูงกว่า",              us: true,  b: false, c: null  },
              { label: "ได้เงินสด (ไม่ใช่เครดิต)",       us: true,  b: false, c: null  },
              { label: "รับซื้อถึงที่",                  us: true,  b: false, c: false },
              { label: "ไม่ต้องรอนาน",                   us: true,  b: null,  c: false },
              { label: "ไม่มีค่าธรรมเนียม",              us: true,  b: true,  c: null  },
              { label: "รับซื้อทุกรุ่น ทุกสภาพ",         us: true,  b: false, c: null  },
              { label: "Top-up เมื่อซื้อรุ่นใหม่",       us: false, b: true,  c: false },
            ].map(({ label, us, b, c }, i) => (
              <div
                key={label}
                className="grid grid-cols-4 text-center text-sm"
                style={{ borderTop: "1px solid #e5e7eb", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
              >
                <div className="px-4 py-3.5 text-left text-xs md:text-sm font-medium" style={{ color: "#374151" }}>{label}</div>
                <div className="px-2 py-3.5 font-bold" style={{ color: us ? "#B8860B" : "#D1D5DB" }}>{us ? "✓" : "✗"}</div>
                <div className="px-2 py-3.5" style={{ color: b === true ? "#374151" : b === false ? "#D1D5DB" : "#F59E0B" }}>
                  {b === true ? "✓" : b === false ? "✗" : "บางที"}
                </div>
                <div className="px-2 py-3.5" style={{ color: c === true ? "#374151" : c === false ? "#D1D5DB" : "#F59E0B" }}>
                  {c === true ? "✓" : c === false ? "✗" : "บางที"}
                </div>
              </div>
            ))}

            {/* Highlight row */}
            <div className="grid grid-cols-4 text-center" style={{ borderTop: "1px solid #e5e7eb", background: "rgba(184,134,11,0.06)" }}>
              <div className="px-4 py-3.5 text-left text-xs md:text-sm font-semibold" style={{ color: "#B8860B" }}>ราคาสูงกว่า Trade-in</div>
              <div className="px-2 py-3.5 leading-snug" style={{ color: "#B8860B" }}><span className="font-bold text-xs whitespace-nowrap">+฿2,000–4,000</span><br/><span className="font-normal text-xs" style={{ color: "#6B7280" }}>ขึ้นอยู่กับรุ่น</span></div>
              <div className="px-2 py-3.5 text-xs" style={{ color: "#6B7280" }}>ราคาอ้างอิง</div>
              <div className="px-2 py-3.5 text-xs" style={{ color: "#6B7280" }}>—</div>
            </div>
          </div>
        </div>
      </section>

      {/* iPhone Pricing — premium service layout */}
      <section className="py-10 md:py-16 px-4 bg-white">
        <div className="max-w-3xl mx-auto">

          {/* Header — left on mobile, centered on desktop */}
          <div className="text-left md:text-center mb-8 md:mb-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-4" style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B" }}>
              ☆ อัปเดตราคาทุกวัน
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-black mb-2">
              ราคารับซื้อ iPhone <span style={{ color: "#B8860B" }}>ยอดนิยม</span>
            </h2>
            <p className="text-sm md:text-base" style={{ color: "#6B7280" }}>
              ประเมินเบื้องต้น ใช้เวลาไม่ถึง 1 นาที
            </p>
          </div>

          {/* Trust indicators — 2×2 grid on mobile, flex row with dividers on desktop */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:flex md:flex-nowrap md:justify-center mb-8">
            {([
              { Icon: Clock,       label: "ประเมินฟรี" },
              { Icon: Lock,        label: "กรอกข้อมูลรับราคาทันที" },
              { Icon: ShieldCheck, label: "ไม่ผูกมัด" },
              { Icon: Banknote,    label: "รับเงินสดทันที" },
            ] as const).map(({ Icon, label }, i) => (
              <div
                key={label}
                className={`flex items-center gap-2 md:px-4 md:py-2${i > 0 ? " md:border-l md:border-gray-300" : ""}`}
              >
                <Icon size={13} style={{ color: "#B8860B", flexShrink: 0 }} />
                <span className="text-xs font-medium" style={{ color: "#374151" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Pricing card */}
          <div className="rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid #E5E7EB" }}>
            {topIphones.map(({ model, storage, price }, i) => {
              const slug = toSlug(model);
              const detail = `${storage.split("/")[0].trim()} • มือสองสภาพดี`;
              const priceText = `฿${price.toLocaleString("th-TH")}`;
              return (
              <a
                key={model}
                href={`/sell/${slug}`}
                className="group flex items-center gap-3 md:gap-6 px-5 md:px-8 py-4 md:py-5 hover:bg-gray-50 transition-colors"
                style={{ borderTop: i > 0 ? "1px solid #F3F4F6" : "none", display: "flex" }}
              >
                {/* Left: model info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm md:text-base text-black leading-snug mb-0.5">{model}</p>
                  <p className="text-xs md:text-sm" style={{ color: "#6B7280" }}>{detail}</p>
                </div>

                {/* Middle: price */}
                <div className="flex-shrink-0 text-right md:text-left">
                  <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>ราคาสูงสุด</p>
                  <div className="flex items-center gap-1.5 justify-end md:justify-start">
                    <p className="font-bold text-xl md:text-2xl leading-none" style={{ color: "#B8860B" }}>{priceText}</p>
                    <div className="w-4 h-4 rounded-full border hidden md:flex items-center justify-center flex-shrink-0" style={{ borderColor: "#D1D5DB" }}>
                      <span style={{ fontSize: 9, color: "#6B7280", lineHeight: 1 }}>i</span>
                    </div>
                  </div>
                </div>

                {/* Right: CTA button — always visible on desktop, hidden on mobile */}
                <span className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0 font-bold text-sm px-5 py-2.5 rounded-full bg-black text-white whitespace-nowrap group-hover:bg-gray-800 transition-colors">
                  ประเมินราคาทันที →
                </span>

                {/* Mobile: chevron only */}
                <ChevronRight size={15} className="flex-shrink-0 md:hidden" style={{ color: "#D1D5DB" }} />
              </a>
            ); })}

            {/* "ไม่พบรุ่นที่ต้องการ?" footer row */}
            <div
              className="flex items-center gap-3 px-5 md:px-8 py-4 md:py-5"
              style={{ borderTop: "1px solid #F3F4F6", background: "#FAFAFA" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F3F4F6" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="5" y="2" width="14" height="20" rx="2" />
                  <circle cx="12" cy="17" r="0.5" fill="#6B7280" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-black leading-snug">ไม่พบรุ่นที่ต้องการ?</p>
                <p className="text-xs mt-0.5 leading-snug" style={{ color: "#6B7280" }}>ประเมินราคา iPhone รุ่นอื่นๆ ได้มากกว่า 50 รุ่น</p>
              </div>
              <a href="/sell" className="flex-shrink-0 text-sm font-bold whitespace-nowrap" style={{ color: "#B8860B" }}>
                ดูรุ่นทั้งหมด →
              </a>
            </div>
          </div>

          {/* Bottom trust badges */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {([
              {
                Icon: ShieldCheck,
                title: "ราคาดีที่สุดในตลาด",
                sub: "เราประเมินตามราคาตลาดปัจจุบัน ให้ราคาสูงและยุติธรรม",
              },
              {
                Icon: Clock,
                title: "รับเงินโดยเร็วใน 1 ชั่วโมง",
                sub: "นัดรับถึงที่ ตรวจเช็คไว จ่ายเงินสดทันที",
              },
            ] as const).map(({ Icon, title, sub }) => (
              <div key={title} className="flex items-start gap-3 rounded-2xl px-5 py-4 bg-white" style={{ border: "1px solid #E5E7EB" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(184,134,11,0.08)" }}>
                  <Icon size={14} style={{ color: "#B8860B" }} />
                </div>
                <div>
                  <p className="font-bold text-sm text-black mb-0.5">{title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FAQ */}
      <FAQSection />

      {/* Blog Section */}
      <BlogSection />

      {/* CTA Banner */}
      <section className="py-7 md:py-14 px-4" style={{ backgroundColor: "#B8860B" }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold text-white">ประเมินราคาฟรี ตอนนี้เลย!</h3>
            <p className="text-white mt-1">ไม่ต้องกรอกข้อมูลส่วนตัว ไม่ผูกมัด</p>
          </div>
          <a
            href="/sell"
            className="flex items-center gap-2 bg-black text-white font-bold px-8 py-4 rounded-full hover:bg-gray-900 transition-colors text-lg whitespace-nowrap"
          >
            ประเมินราคาฟรี →
          </a>
        </div>
      </section>

      <Footer />

    </div>
  );
}
