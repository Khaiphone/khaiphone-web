import { cache } from "react";
import type { Metadata } from "next";
import { fetchPublicActiveProducts } from "@/app/actions/products";

interface Props {
  params: Promise<{ model: string }>;
  children: React.ReactNode;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khaiphone.com";

const getProducts = cache(() => fetchPublicActiveProducts());

function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    iphone: "iPhone",
    ipad: "iPad",
    macbook: "MacBook",
    watch: "Apple Watch",
    airpods: "AirPods",
  };
  return map[category?.toLowerCase()] ?? category;
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
  const { model: modelSlug } = await params;
  const decoded = decodeURIComponent(modelSlug).replace(/-/g, " ");

  const products = await getProducts();
  const variants = products.filter(
    (p) => p.model.toLowerCase().replace(/[^a-z0-9]+/g, "-") === modelSlug.toLowerCase()
  );

  const product = variants[0];
  const category = product ? categoryLabel(product.category) : decoded.split(" ")[0];

  const prices = variants.map((v) => v.price_good).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;

  const priceText =
    minPrice && maxPrice
      ? minPrice === maxPrice
        ? ` สูงสุด ${minPrice.toLocaleString("th-TH")} บาท`
        : ` ${minPrice.toLocaleString("th-TH")}–${maxPrice.toLocaleString("th-TH")} บาท`
      : "";

  const title = `ขาย ${decoded}${priceText}`;
  const description = `รับซื้อ ${decoded} ทุกความจุ${priceText} ประเมินราคาออนไลน์ฟรี รู้ราคาทันที ไม่ผูกมัด จ่ายเงินสดทันที ขายง่าย ได้เงินไว — ขายไอโฟน.com`;

  const canonicalUrl = `${SITE_URL}/sell/${modelSlug}`;

  void category; // used in JSON-LD below

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${title} | ขายไอโฟน.com`,
      description,
      url: canonicalUrl,
      type: "website",
      locale: "th_TH",
      siteName: "ขายไอโฟน.com",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function ModelLayout({ params, children }: Props) {
  const { model: modelSlug } = await params;
  const decoded = decodeURIComponent(modelSlug).replace(/-/g, " ");

  const products = await getProducts();
  const variants = products.filter(
    (p) => p.model.toLowerCase().replace(/[^a-z0-9]+/g, "-") === modelSlug.toLowerCase()
  );

  const product = variants[0];
  const category = product ? categoryLabel(product.category) : decoded.split(" ")[0];

  const prices = variants.map((v) => v.price_good).filter(Boolean);
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const canonicalUrl = `${SITE_URL}/sell/${modelSlug}`;

  const jsonLd =
    variants.length > 0 && minPrice
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: decoded,
          description: `รับซื้อ ${decoded} ทุกความจุ ประเมินราคาออนไลน์ฟรี ไม่ผูกมัด`,
          brand: { "@type": "Brand", name: category },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "THB",
            lowPrice: minPrice,
            highPrice: maxPrice ?? minPrice,
            offerCount: variants.length,
            seller: {
              "@type": "LocalBusiness",
              name: "ขายไอโฟน.com",
              url: SITE_URL,
            },
          },
          url: canonicalUrl,
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
