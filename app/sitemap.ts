import type { MetadataRoute } from "next";
import { fetchPublicActiveProducts } from "@/app/actions/products";

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://khaiphone.com";
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`,            lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${base}/sell`,        lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/trade-in`,   lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${base}/how-to-sell`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`,         lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/blog`,        lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: `${base}/contact`,     lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/reviews`,     lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${base}/track`,       lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`,     lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${base}/terms`,       lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];

  const products = await fetchPublicActiveProducts();
  const seenSlugs = new Set<string>();
  const productPages: MetadataRoute.Sitemap = [];
  for (const p of products) {
    const slug = toSlug(p.model);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    productPages.push({
      url: `${base}/sell/${slug}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return [...staticPages, ...productPages];
}
