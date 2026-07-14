import { createServerClient } from "@/lib/supabase-server";
import type { Article, ArticleCard, Section } from "@/lib/blog-types";

// แถวใน DB → Article (แปลง snake_case + ค่า default)
interface ArticleRow {
  slug: string; category: string | null; article_date: string | null; display_date: string | null;
  read_time: string | null; title: string; excerpt: string | null; hero_image: string | null;
  keywords: string[] | null; content: unknown; meta_title: string | null; meta_description: string | null;
}

function mapArticle(r: ArticleRow): Article {
  return {
    slug: r.slug,
    category: r.category ?? "บทความ",
    date: r.article_date ?? "",
    displayDate: r.display_date ?? "",
    readTime: r.read_time ?? "5 นาที",
    title: r.title,
    excerpt: r.excerpt ?? "",
    image: r.hero_image ?? "",
    keywords: r.keywords ?? undefined,
    content: Array.isArray(r.content) ? (r.content as Section[]) : [],
    metaTitle: r.meta_title ?? undefined,
    metaDescription: r.meta_description ?? undefined,
  };
}

const SELECT =
  "slug, category, article_date, display_date, read_time, title, excerpt, hero_image, keywords, content, meta_title, meta_description";

/** บทความที่ publish แล้ว (การ์ด — สำหรับ list/related) */
export async function fetchPublishedArticleCards(): Promise<ArticleCard[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("articles")
    .select("slug, category, article_date, display_date, read_time, title, excerpt, hero_image, keywords")
    .eq("status", "published")
    .order("article_date", { ascending: false });
  return (data ?? []).map((r) => ({
    slug: r.slug as string,
    category: (r.category as string) ?? "บทความ",
    title: r.title as string,
    image: (r.hero_image as string) ?? "",
    displayDate: (r.display_date as string) ?? "",
    date: (r.article_date as string) ?? "",
    excerpt: (r.excerpt as string) ?? "",
    keywords: (r.keywords as string[] | null) ?? undefined,
    readTime: (r.read_time as string) ?? "5 นาที",
  }));
}

/** บทความ published ทั้งหมด (เต็ม) */
export async function fetchPublishedArticles(): Promise<Article[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("status", "published")
    .order("article_date", { ascending: false });
  return (data ?? []).map((r) => mapArticle(r as ArticleRow));
}

/** slug ของบทความ published (สำหรับ generateStaticParams + sitemap) */
export async function fetchPublishedArticleSlugs(): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase.from("articles").select("slug").eq("status", "published");
  return (data ?? []).map((r) => r.slug as string);
}

/** บทความ published ตาม slug */
export async function fetchPublishedArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("articles")
    .select(SELECT)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ? mapArticle(data as ArticleRow) : null;
}
