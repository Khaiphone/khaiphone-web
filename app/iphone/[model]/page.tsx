import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { iphones } from "@/lib/products";
import { iphonePageData, iphoneImages, iphoneNarratives } from "@/lib/iphoneData";
import { fetchPublicActiveProducts } from "@/app/actions/products";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khaiphone.com";
const getDbProducts = cache(fetchPublicActiveProducts);
const UPDATED_DATE_ISO  = "2026-06-10";
const UPDATED_DATE_THAI = "10 มิ.ย. 2569";

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function generateStaticParams() {
  return iphones
    .filter((p) => !p.discontinued)
    .map((p) => ({ model: toSlug(p.model) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ model: string }>;
}): Promise<Metadata> {
  const { model: slug } = await params;
  const product = iphones.find((p) => toSlug(p.model) === slug);
  if (!product) return { title: "ไม่พบรุ่น | Khaiphone.com" };

  const allDbProducts = await getDbProducts();
  const dbProduct = allDbProducts.find((p) => toSlug(p.model) === slug);
  const priceGood = dbProduct?.price_good ?? product.priceGood;

  const canonical = `${SITE_URL}/iphone/${slug}`;
  const image = iphoneImages[slug] ?? "/product-iphone.webp";
  const priceText = priceGood.toLocaleString("th-TH");
  const title = `ขาย ${product.model} ราคาสูงสุด ${priceText} บาท | Khaiphone.com`;
  const description = `รับซื้อ ${product.model} สภาพดีราคาสูงสุด ${priceText} บาท ประเมินราคาออนไลน์ฟรีภายใน 1 นาที จ่ายเงินสดทันที รับถึงที่ทั่วไทย — Khaiphone.com`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "th_TH",
      siteName: "Khaiphone.com",
      title,
      description,
      url: canonical,
      images: [{ url: `${SITE_URL}${image}`, alt: `ขาย ${product.model}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}${image}`],
    },
  };
}

const PRICE_FACTORS = [
  { icon: "🔋", label: "แบตเตอรี่", desc: "ต่ำกว่า 80% ราคาลด ควรเช็กจาก Settings → Battery Health" },
  { icon: "📱", label: "สภาพจอ", desc: "จอแตก รอย เส้น กระทบราคามากที่สุด" },
  { icon: "☁️", label: "iCloud", desc: "ต้องออก iCloud ก่อนขาย มิฉะนั้นรับซื้อไม่ได้" },
  { icon: "📦", label: "กล่องและอุปกรณ์", desc: "มีกล่องครบได้ราคาสูงกว่าประมาณ 500–1,000 บาท" },
  { icon: "🔧", label: "ประวัติซ่อม", desc: "เคยซ่อมนอกศูนย์หรือเปลี่ยนชิ้นส่วนมีผลต่อราคา" },
  { icon: "💾", label: "ความจุ", desc: "ความจุสูงกว่าได้ราคาสูงกว่า ต่างกัน 2,000–8,000 บาทตามรุ่น" },
];

const STEPS = [
  { n: "1", title: "ประเมินราคาออนไลน์", desc: "กรอกข้อมูลเครื่อง รู้ราคาทันที ใช้เวลาไม่ถึง 1 นาที ไม่ผูกมัด" },
  { n: "2", title: "นัดรับเครื่องถึงที่", desc: "ทีมงานรับเครื่องถึงที่หรือนัดพบได้ ตรวจสอบและยืนยันราคา" },
  { n: "3", title: "รับเงินสดทันที", desc: "โอนเงินหรือรับเงินสดได้เลยทันที ไม่ต้องรอ ไม่มีค่าธรรมเนียม" },
];

export default async function IphonePage({
  params,
}: {
  params: Promise<{ model: string }>;
}) {
  const { model: slug } = await params;
  const product = iphones.find((p) => toSlug(p.model) === slug);
  if (!product) notFound();

  const allDbProducts = await getDbProducts();
  const dbProduct = allDbProducts.find((p) => toSlug(p.model) === slug);
  const priceGood = dbProduct?.price_good ?? product.priceGood;
  const priceFair = Math.round((priceGood * 0.85) / 500) * 500;
  const pricePoor = Math.round((priceGood * 0.60) / 500) * 500;

  const data = iphonePageData[slug];
  const narrative = iphoneNarratives[slug] ?? null;
  const image = iphoneImages[slug] ?? "/product-iphone.webp";
  const canonical = `${SITE_URL}/iphone/${slug}`;
  const sellHref = `/sell/${slug}`;
  const priceText = priceGood.toLocaleString("th-TH");
  const storages = product.storage.split(" / ");

  const seriesMatch = slug.match(/^iphone-(\d+)/);
  const seriesNum = seriesMatch?.[1];
  const relatedProducts = seriesNum
    ? iphones.filter((p) => {
        if (p.discontinued) return false;
        const s = toSlug(p.model);
        return s !== slug && new RegExp(`^iphone-${seriesNum}(-|e|$)`).test(s);
      })
    : [];

  // ── JSON-LD schemas ──────────────────────────────────────────────────────────

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.model,
    description: `รับซื้อ ${product.model} ทุกความจุ สภาพดีราคาสูงสุด ${priceText} บาท ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด`,
    brand: { "@type": "Brand", name: "Apple" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "THB",
      lowPrice: pricePoor,
      highPrice: priceGood,
      offerCount: storages.length * 3,
      seller: {
        "@type": "LocalBusiness",
        name: "Khaiphone.com",
        url: SITE_URL,
        telephone: "+66-95-553-5167",
        areaServed: "TH",
      },
    },
    url: canonical,
    image: `${SITE_URL}${image}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "iPhone", item: `${SITE_URL}/iphone` },
      { "@type": "ListItem", position: 3, name: product.model, item: canonical },
    ],
  };

  const faqSchema = data?.faq
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: data.faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `ขาย ${product.model} ราคาสูงสุด ${priceText} บาท`,
    description: `รับซื้อ ${product.model} สภาพดีราคาสูงสุด ${priceText} บาท`,
    url: canonical,
    dateModified: UPDATED_DATE_ISO,
    publisher: {
      "@type": "Organization",
      name: "Khaiphone.com",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
    },
    breadcrumb: { "@id": canonical + "#breadcrumb" },
  };

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <Header />

      {/* Breadcrumb */}
      <div className="px-4 py-2.5 border-b border-gray-100" style={{ background: "#f9f9f7" }}>
        <div className="max-w-5xl mx-auto flex items-center gap-1 text-xs" style={{ color: "#9CA3AF" }}>
          <Link href="/" className="hover:text-black transition-colors">หน้าแรก</Link>
          <ChevronRight size={11} />
          <Link href="/iphone" className="hover:text-black transition-colors">iPhone</Link>
          <ChevronRight size={11} />
          <span style={{ color: "#374151" }}>{product.model}</span>
        </div>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────────────────── */}
      <section style={{ background: "#111111" }}>
        <div className="max-w-5xl mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center gap-8 md:gap-12">
          {/* Text */}
          <div className="flex-1 text-center md:text-left order-2 md:order-1">
            <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "#B8860B" }}>
              รับซื้อ Apple มือสอง
            </p>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-3">
              {product.model}
            </h1>
            {data?.highlight && (
              <p className="text-sm md:text-base mb-6 leading-relaxed" style={{ color: "#9CA3AF" }}>
                {data.highlight}
              </p>
            )}
            <div className="mb-8">
              <p className="text-xs mb-1" style={{ color: "#6B7280" }}>ราคารับซื้อสูงสุด</p>
              <p className="text-4xl md:text-5xl font-bold" style={{ color: "#B8860B" }}>
                ฿{priceText}
              </p>
              <p className="text-xs mt-1.5" style={{ color: "#6B7280" }}>สภาพดี · ออก iCloud แล้ว · อัปเดต {UPDATED_DATE_THAI}</p>
            </div>
            <Link
              href={sellHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-black transition-opacity hover:opacity-90"
              style={{ background: "#B8860B", color: "#000" }}
            >
              ประเมินราคาฟรี →
            </Link>
          </div>

          {/* Product image */}
          <div className="flex-shrink-0 order-1 md:order-2">
            <Image
              src={image}
              alt={product.model}
              width={260}
              height={320}
              className="object-contain drop-shadow-2xl"
              style={{ maxHeight: 320 }}
              priority
            />
          </div>
        </div>
      </section>

      {/* ── Specs strip ──────────────────────────────────────────────────────────── */}
      {data && (
        <section style={{ background: "#1a1a1a", borderTop: "1px solid #2a2a2a" }}>
          <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap justify-center md:justify-start gap-4 md:gap-8">
            {[
              { label: "ชิป", value: data.chip },
              { label: "จอ", value: data.display },
              { label: "กล้อง", value: data.camera },
              { label: "ความจุ", value: storages.join(", ") },
            ].map(({ label, value }) => (
              <div key={label} className="text-center md:text-left">
                <p className="text-xs font-medium mb-0.5" style={{ color: "#6B7280" }}>{label}</p>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Price table ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-black">ราคารับซื้อวันนี้</h2>
              <p className="text-sm mt-1" style={{ color: "#6B7280" }}>{product.model} · อัปเดต {UPDATED_DATE_THAI}</p>
            </div>
            <Link
              href={sellHref}
              className="self-start md:self-auto inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#B8860B" }}
            >
              ประเมินราคาตามความจุจริง →
            </Link>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                  <th className="px-5 py-3.5 text-left font-semibold" style={{ color: "#374151" }}>สภาพเครื่อง</th>
                  <th className="px-5 py-3.5 text-left font-semibold" style={{ color: "#374151" }}>เกณฑ์</th>
                  <th className="px-5 py-3.5 text-right font-semibold" style={{ color: "#374151" }}>ราคารับซื้อ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "สภาพดีมาก",
                    criteria: "ออก iCloud แล้ว · ไม่มีรอย · แบต 80%+",
                    price: priceGood,
                    highlight: true,
                  },
                  {
                    label: "สภาพพอใช้",
                    criteria: "มีรอยเล็กน้อย · ไม่มีกล่อง",
                    price: priceFair,
                    highlight: false,
                  },
                  {
                    label: "มีตำหนิ",
                    criteria: "รอยมาก · จอแตก · แบตต่ำ",
                    price: pricePoor,
                    highlight: false,
                  },
                ].map(({ label, criteria, price, highlight }, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < 2 ? "1px solid #F3F4F6" : "none",
                      background: highlight ? "rgba(184,134,11,0.04)" : "white",
                    }}
                  >
                    <td className="px-5 py-4 font-semibold" style={{ color: highlight ? "#B8860B" : "#374151" }}>
                      {label}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: "#6B7280" }}>{criteria}</td>
                    <td className="px-5 py-4 text-right font-bold text-base" style={{ color: highlight ? "#B8860B" : "#374151" }}>
                      ฿{price.toLocaleString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3" style={{ color: "#9CA3AF" }}>
            * ราคาข้างต้นสำหรับความจุมาตรฐาน ความจุที่สูงกว่าได้ราคาเพิ่ม กดปุ่ม "ประเมินราคาตามความจุจริง" เพื่อดูราคาแยกตามความจุ
          </p>
        </div>
      </section>

      {/* ── Narrative ───────────────────────────────────────────────────────────── */}
      {narrative && (
        <section className="px-4 py-12 md:py-16" style={{ borderTop: "1px solid #F3F4F6" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-4">เกี่ยวกับ {product.model}</h2>
            <div className="space-y-3 max-w-3xl">
              {narrative.map((para, i) => (
                <p key={i} className="text-sm md:text-base leading-relaxed" style={{ color: "#374151" }}>
                  {para}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Price factors ────────────────────────────────────────────────────────── */}
      <section className="px-4 py-12 md:py-16" style={{ background: "#f9f9f7" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">ปัจจัยที่มีผลต่อราคารับซื้อ {product.model}</h2>
          <p className="text-sm mb-8" style={{ color: "#6B7280" }}>ราคาจริงขึ้นอยู่กับสภาพเครื่องและปัจจัยเหล่านี้</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {PRICE_FACTORS.map(({ icon, label, desc }) => (
              <div key={label} className="bg-white rounded-2xl p-5" style={{ border: "1px solid #E5E7EB" }}>
                <span className="text-2xl mb-3 block">{icon}</span>
                <p className="font-semibold text-black text-sm mb-1">{label}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How to sell ──────────────────────────────────────────────────────────── */}
      <section className="px-4 py-12 md:py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-black mb-2">ขั้นตอนการขาย {product.model}</h2>
          <p className="text-sm mb-8" style={{ color: "#6B7280" }}>ง่าย เร็ว จ่ายเงินทันที</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="flex gap-4">
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "#111111" }}
                >
                  {n}
                </div>
                <div>
                  <p className="font-bold text-black mb-1">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href={sellHref}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#111111" }}
            >
              ประเมินราคา {product.model} ฟรี →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────────── */}
      {data?.faq && (
        <section className="px-4 py-12 md:py-16" style={{ background: "#f9f9f7" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-2">คำถามที่พบบ่อย</h2>
            <p className="text-sm mb-8" style={{ color: "#6B7280" }}>เกี่ยวกับการขาย {product.model}</p>
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #E5E7EB" }}>
              {data.faq.map(({ q, a }, i) => (
                <details key={i} style={{ borderBottom: i < data.faq.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                  <summary
                    className="flex items-center justify-between gap-4 px-6 py-5 cursor-pointer select-none"
                    style={{ listStyle: "none" }}
                  >
                    <span className="font-semibold text-black text-sm leading-snug">{q}</span>
                    <span className="flex-shrink-0 text-xl font-light" style={{ color: "#B8860B" }}>+</span>
                  </summary>
                  <p className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Related models ──────────────────────────────────────────────────────── */}
      {relatedProducts.length > 0 && (
        <section className="px-4 py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-2">รุ่นที่เกี่ยวข้อง</h2>
            <p className="text-sm mb-8" style={{ color: "#6B7280" }}>iPhone ซีรีส์เดียวกันที่รับซื้ออยู่</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => {
                const s = toSlug(p.model);
                return (
                  <Link
                    key={s}
                    href={`/iphone/${s}`}
                    className="bg-white rounded-2xl p-5 flex flex-col gap-1.5 transition-shadow hover:shadow-md"
                    style={{ border: "1px solid #E5E7EB" }}
                  >
                    <p className="font-bold text-black text-sm leading-snug">{p.model}</p>
                    <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>รับซื้อสูงสุด</p>
                    <p className="text-lg font-bold" style={{ color: "#B8860B" }}>
                      ฿{p.priceGood.toLocaleString("th-TH")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Final CTA ────────────────────────────────────────────────────────────── */}
      <section className="px-4 py-16 md:py-20" style={{ background: "#111111" }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: "#B8860B" }}>
            Khaiphone.com · รับซื้อ Apple มือสองทั่วไทย
          </p>
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-3">
            ขาย {product.model} วันนี้
          </h2>
          <p className="text-sm md:text-base mb-8" style={{ color: "#9CA3AF" }}>
            ราคาสูงสุด ฿{priceText} · ประเมินฟรี · จ่ายสดทันที · รับถึงที่ทั่วไทย
          </p>
          <Link
            href={sellHref}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-base font-bold text-black transition-opacity hover:opacity-90"
            style={{ background: "#B8860B" }}
          >
            ประเมินราคาฟรี →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
