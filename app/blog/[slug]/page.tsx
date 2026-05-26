import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { blogPosts } from "@/lib/blogData";

// ── Static generation ──────────────────────────────────────────────────────────

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) return { title: "ไม่พบบทความ | ขายไอโฟน.com" };
  return {
    title: `${post.title} | ขายไอโฟน.com`,
    description: post.excerpt,
  };
}

// ── Article content ────────────────────────────────────────────────────────────

type Section =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

const CONTENT: Record<string, Section[]> = {
  "iphone-broken-screen": [
    { type: "paragraph", text: "หนึ่งในคำถามที่พบบ่อยที่สุดจากลูกค้าคือ iPhone จอแตก ยังขายได้ไหม? คำตอบคือ ได้ครับ — เรารับซื้อ iPhone จอแตกทุกรุ่น แต่ราคาจะต่างกันขึ้นอยู่กับระดับความเสียหาย" },
    { type: "heading", text: "แตกแบบไหนยังรับซื้อ?" },
    { type: "list", items: [
      "จอแตกนิ้วเดียว ยังแสดงภาพปกติ — ราคาลดเล็กน้อยจากปกติ",
      "จอแตกหลายเส้น ยังใช้งานได้ — ราคาลดปานกลาง",
      "จอแตกทั้งหน้า สัมผัสได้บ้าง — ราคาลดมากขึ้น",
      "จอดำ แสดงผลไม่ได้ — รับซื้อ แต่ต้องประเมินจากส่วนอื่น",
    ]},
    { type: "callout", text: "เครื่องที่จอแตกหนักแต่เนื้อเครื่องดี แบตดี iCloud ออกแล้ว ยังได้ราคาดีกว่าที่คิดไว้มาก" },
    { type: "heading", text: "ปัจจัยอื่นที่ส่งผลต่อราคา" },
    { type: "paragraph", text: "นอกจากสภาพจอ ยังมีปัจจัยสำคัญอื่นที่ส่งผลต่อราคารับซื้อ เช่น สภาพเนื้อเครื่อง (มีรอยกด บิดหรือเปล่า) สุขภาพแบตเตอรี่ ความจุ รุ่น และว่าออก iCloud หรือยัง" },
    { type: "heading", text: "ขั้นตอนการขาย iPhone จอแตก" },
    { type: "list", items: [
      "ประเมินราคาออนไลน์ฟรี ใช้เวลาไม่ถึง 1 นาที",
      "ออก iCloud และ Sign out Apple ID ให้เรียบร้อย",
      "นัดรับถึงที่หรือส่งพัสดุมาประเมิน",
      "ทีมงานตรวจสอบและยืนยันราคา",
      "รับเงินสดทันที",
    ]},
  ],

  "iphone-price-may-2024": [
    { type: "paragraph", text: "ราคารับซื้อ iPhone เดือนพฤษภาคม 2567 อัปเดตล่าสุด — ราคาเหล่านี้เป็นราคาประเมินเบื้องต้นสำหรับเครื่องสภาพดี ออก iCloud แล้ว มีกล่อง" },
    { type: "heading", text: "ราคารับซื้อ iPhone Series 17" },
    { type: "table", headers: ["รุ่น", "ความจุ", "ราคาสูงสุด"], rows: [
      ["iPhone 17 Pro Max", "256GB", "฿38,000"],
      ["iPhone 17 Pro",     "256GB", "฿32,000"],
      ["iPhone 17",         "128GB", "฿25,000"],
      ["iPhone 17 Air",     "128GB", "฿22,000"],
    ]},
    { type: "heading", text: "ราคารับซื้อ iPhone Series 16" },
    { type: "table", headers: ["รุ่น", "ความจุ", "ราคาสูงสุด"], rows: [
      ["iPhone 16 Pro Max", "256GB", "฿30,000"],
      ["iPhone 16 Pro",     "256GB", "฿25,000"],
      ["iPhone 16",         "128GB", "฿18,000"],
      ["iPhone 16 Plus",    "128GB", "฿19,000"],
    ]},
    { type: "callout", text: "ราคาข้างต้นเป็นราคาเบื้องต้นสำหรับเครื่องสภาพดีมาก ราคาจริงอาจสูงหรือต่ำกว่าขึ้นอยู่กับสภาพเครื่องจริง" },
    { type: "heading", text: "ปัจจัยที่ทำให้ราคาลด" },
    { type: "list", items: [
      "จอแตก รอยขีด สีซีด",
      "แบตเตอรี่ต่ำกว่า 80%",
      "ไม่มีกล่อง ไม่มีอุปกรณ์",
      "ยังติด iCloud (ราคาลดมาก)",
      "เครื่อง ZP/A หรือ TH/A บางรุ่นต่างกัน",
    ]},
  ],

  "what-to-delete-before-sell": [
    { type: "paragraph", text: "ก่อนส่งมอบ iPhone ให้ผู้รับซื้อ มีสิ่งสำคัญที่ต้องทำให้ครบทุกข้อ เพื่อปกป้องข้อมูลส่วนตัวและให้การขายราบรื่น" },
    { type: "heading", text: "เช็กลิสต์ 5 อย่างก่อนขาย iPhone" },
    { type: "list", items: [
      "Backup ข้อมูลขึ้น iCloud หรือ Mac/PC — เพื่อให้นำข้อมูลไปใช้บน iPhone เครื่องใหม่ได้",
      "ปิด Find My iPhone (ออก iCloud) — สำคัญมาก ถ้าไม่ออก iCloud จะขายไม่ได้",
      "Sign out Apple ID จากทุก App — Settings → [ชื่อ] → Sign Out",
      "Factory Reset (ลบข้อมูลทั้งหมด) — Settings → General → Transfer or Reset iPhone → Erase All Content",
      "นำ SIM การ์ดออก — อย่าลืม ก่อนส่งมอบเครื่อง",
    ]},
    { type: "callout", text: "ขั้นตอนสำคัญที่สุดคือออก iCloud ก่อนเสมอ มิฉะนั้นเครื่องจะถูก Activation Lock และขายไม่ได้" },
    { type: "heading", text: "ขั้นตอนการออก iCloud แบบละเอียด" },
    { type: "list", items: [
      "เปิด Settings → แตะชื่อของคุณด้านบน",
      "เลื่อนลงมาด้านล่างสุด แตะ Sign Out",
      "กรอกรหัสผ่าน Apple ID",
      "เลือกว่าต้องการเก็บข้อมูลอะไรไว้ใน iPhone แล้วแตะ Sign Out",
      "ยืนยัน — iPhone จะออกจาก iCloud และ Find My จะปิดโดยอัตโนมัติ",
    ]},
    { type: "heading", text: "หลังจากทำครบแล้ว" },
    { type: "paragraph", text: "เมื่อ Factory Reset เสร็จ iPhone จะรีสตาร์ทและแสดงหน้าต้อนรับ (Hello Screen) พร้อมสำหรับผู้ซื้อรายใหม่ ตอนนี้สามารถส่งมอบเครื่องได้อย่างปลอดภัยแล้ว" },
  ],

  "macbook-buyback-2024": [
    { type: "paragraph", text: "ปี 2024 เรารับซื้อ MacBook ทุกรุ่นที่ใช้ชิป Apple Silicon (M1 ขึ้นไป) รวมถึง Intel รุ่นใหม่ๆ ด้วย ราคาดี ประเมินไว จ่ายเงินสดทันที" },
    { type: "heading", text: "MacBook รุ่นที่รับซื้อและราคาประมาณ" },
    { type: "table", headers: ["รุ่น", "ชิป", "ราคาสูงสุด"], rows: [
      ["MacBook Pro 16\" M3 Max", "M3 Max", "฿75,000"],
      ["MacBook Pro 14\" M3 Pro", "M3 Pro", "฿55,000"],
      ["MacBook Pro 13\" M2",     "M2",     "฿32,000"],
      ["MacBook Air 15\" M3",     "M3",     "฿38,000"],
      ["MacBook Air 13\" M2",     "M2",     "฿28,000"],
      ["MacBook Air 13\" M1",     "M1",     "฿20,000"],
    ]},
    { type: "callout", text: "ราคาขึ้นอยู่กับ RAM, Storage, สภาพเครื่อง และ Battery Cycle Count — ยิ่งน้อยยิ่งดี" },
    { type: "heading", text: "สิ่งที่ต้องเตรียมก่อนขาย MacBook" },
    { type: "list", items: [
      "Sign out Apple ID และ iCloud ใน System Settings",
      "ปิด Find My Mac",
      "Erase All Content and Settings (macOS Ventura ขึ้นไป) หรือ Erase via Recovery Mode",
      "ชาร์จแบตให้เต็มก่อนส่งมอบ",
      "เตรียมกล่องและสายชาร์จถ้ามี",
    ]},
    { type: "heading", text: "ทำไมต้องเช็ก Battery Cycle Count?" },
    { type: "paragraph", text: "Battery Cycle Count บอกว่าแบตใช้มาแล้วกี่รอบ Apple ออกแบบแบตให้ทนได้ 1,000 cycles โดยยังรักษาความจุ 80% MacBook ที่ Cycle Count ต่ำ (ไม่เกิน 300) จะได้ราคาดีกว่าอย่างชัดเจน" },
  ],
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const sections = CONTENT[slug] ?? [];
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <Header />

      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
          <Link href="/" className="hover:text-black transition-colors">หน้าแรก</Link>
          <ChevronRight size={12} />
          <Link href="/blog" className="hover:text-black transition-colors">บทความ</Link>
          <ChevronRight size={12} />
          <span
            className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
            style={{ background: "#B8860B" }}
          >
            {post.category}
          </span>
        </div>
      </div>

      {/* Article header */}
      <div className="px-4 py-10 md:py-14" style={{ background: "#f9f9f7", borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-black leading-snug mb-5">
            {post.title}
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: "#6B7280" }}>
            {post.excerpt}
          </p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
              <Calendar size={13} />{post.displayDate}
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
              <Clock size={13} />{post.readTime}
            </span>
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div className="px-4 pb-2" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.image} alt={post.title} className="w-full object-cover rounded-2xl" style={{ aspectRatio: "16/7", maxHeight: 340 }} />
        </div>
      </div>

      {/* Article body */}
      <article className="px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">

          {sections.map((section, i) => {
            if (section.type === "heading") {
              return (
                <h2 key={i} className="text-xl md:text-2xl font-bold text-black mt-8 mb-3 leading-snug">
                  {section.text}
                </h2>
              );
            }
            if (section.type === "paragraph") {
              return (
                <p key={i} className="text-sm md:text-base leading-relaxed mb-4" style={{ color: "#374151" }}>
                  {section.text}
                </p>
              );
            }
            if (section.type === "list") {
              return (
                <ul key={i} className="flex flex-col gap-2.5 mb-5 pl-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm md:text-base" style={{ color: "#374151" }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5" style={{ background: "#B8860B" }}>
                        {j + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              );
            }
            if (section.type === "callout") {
              return (
                <div key={i} className="flex items-start gap-3 rounded-2xl px-5 py-4 my-5" style={{ background: "rgba(184,134,11,0.07)", border: "1.5px solid rgba(184,134,11,0.2)" }}>
                  <span className="flex-shrink-0 text-base mt-0.5">💡</span>
                  <p className="text-sm leading-relaxed font-medium" style={{ color: "#374151" }}>{section.text}</p>
                </div>
              );
            }
            if (section.type === "table") {
              return (
                <div key={i} className="rounded-xl overflow-hidden my-5" style={{ border: "1px solid #E5E7EB" }}>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                        {section.headers.map((h) => (
                          <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#374151" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: ri < section.rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-3" style={{ color: ci === row.length - 1 ? "#B8860B" : "#374151", fontWeight: ci === row.length - 1 ? 700 : ci === 0 ? 500 : 400 }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            return null;
          })}

          {/* CTA inline */}
          <div className="mt-10 rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5" style={{ background: "rgba(184,134,11,0.07)", border: "1.5px solid rgba(184,134,11,0.2)" }}>
            <div className="flex-1">
              <p className="font-bold text-black mb-1">อยากรู้ราคาขายเครื่องของคุณ?</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>ประเมินฟรีภายใน 1 นาที ไม่มีค่าใช้จ่าย ไม่ผูกมัด</p>
            </div>
            <a
              href="/sell"
              className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: "#B8860B" }}
            >
              ประเมินราคาฟรี →
            </a>
          </div>

          {/* Back link */}
          <div className="mt-8 pt-8" style={{ borderTop: "1px solid #F3F4F6" }}>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-black"
              style={{ color: "#6B7280" }}
            >
              <ArrowLeft size={14} />
              กลับไปหน้าบทความทั้งหมด
            </Link>
          </div>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="px-4 pb-12 md:pb-16" style={{ borderTop: "1px solid #F3F4F6", background: "#f9f9f7" }}>
          <div className="max-w-3xl mx-auto pt-10">
            <h2 className="text-lg font-bold text-black mb-6">บทความที่เกี่ยวข้อง</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group flex flex-col gap-2.5"
                  style={{ textDecoration: "none" }}
                >
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span
                      className="absolute bottom-2.5 left-2.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full"
                      style={{ background: "#B8860B" }}
                    >
                      {p.category}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-black leading-snug line-clamp-2 group-hover:text-[#B8860B] transition-colors">
                    {p.title}
                  </p>
                  <span className="text-xs" style={{ color: "#6B7280" }}>{p.displayDate}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
