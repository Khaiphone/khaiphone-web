import type { Article, Section } from "@/lib/blog-types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://khaiphone.com";

// รูป static = path (/blog_x.webp) → เติม domain; รูปจาก storage = absolute อยู่แล้ว
export function absImageUrl(img: string): string {
  return img.startsWith("http") ? img : `${SITE_URL}${img}`;
}

export function faqItemsOf(sections: Section[]) {
  return sections
    .filter((s): s is Extract<Section, { type: "faq" }> => s.type === "faq")
    .flatMap((s) => s.items);
}

export function buildArticleSchema(article: Article) {
  const canonical = `${SITE_URL}/blog/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    image: article.image ? absImageUrl(article.image) : undefined,
    url: canonical,
    author: { "@type": "Organization", name: "Khaiphone.com", url: SITE_URL },
    publisher: { "@type": "Organization", name: "Khaiphone.com", url: SITE_URL },
  };
}

export function buildBreadcrumbSchema(article: Article) {
  const canonical = `${SITE_URL}/blog/${article.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าหลัก", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "บทความ", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: article.title, item: canonical },
    ],
  };
}

export function buildFaqSchema(sections: Section[]) {
  const items = faqItemsOf(sections);
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
