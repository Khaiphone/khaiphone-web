"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/require-auth";
import type { Article, Section } from "@/lib/blog-types";

export interface AdminArticleListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  category: string;
  heroImage: string | null;
  articleDate: string;
  createdAt: string;
}

export interface AdminArticle extends Article {
  id: string;
  status: string;
}

// ─── List (รออนุมัติ + published) ──────────────────────────────────────────────
export async function fetchAdminArticles(): Promise<AdminArticleListItem[]> {
  await requireAuth();
  const supabase = createServerClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, status, category, hero_image, article_date, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    title: r.title as string,
    status: r.status as string,
    category: (r.category as string) ?? "",
    heroImage: (r.hero_image as string) ?? null,
    articleDate: (r.article_date as string) ?? "",
    createdAt: (r.created_at as string) ?? "",
  }));
}

export async function fetchPendingArticleCount(): Promise<number> {
  await requireAuth();
  const supabase = createServerClient();
  const { count } = await supabase
    .from("articles").select("id", { count: "exact", head: true })
    .eq("status", "pending_review");
  return count ?? 0;
}

// ─── Full article (edit) ───────────────────────────────────────────────────────
export async function fetchAdminArticle(id: string): Promise<AdminArticle | null> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: r } = await supabase.from("articles").select("*").eq("id", id).maybeSingle();
  if (!r) return null;
  return {
    id: r.id,
    status: r.status,
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

// ─── Save edits ────────────────────────────────────────────────────────────────
export async function updateArticle(
  id: string,
  patch: {
    title?: string; excerpt?: string; category?: string; readTime?: string; displayDate?: string;
    keywords?: string[]; heroImage?: string; content?: Section[];
    metaTitle?: string; metaDescription?: string; slug?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.excerpt !== undefined) row.excerpt = patch.excerpt;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.readTime !== undefined) row.read_time = patch.readTime;
  if (patch.displayDate !== undefined) row.display_date = patch.displayDate;
  if (patch.keywords !== undefined) row.keywords = patch.keywords;
  if (patch.heroImage !== undefined) row.hero_image = patch.heroImage;
  if (patch.content !== undefined) row.content = patch.content;
  if (patch.metaTitle !== undefined) row.meta_title = patch.metaTitle;
  if (patch.metaDescription !== undefined) row.meta_description = patch.metaDescription;
  if (patch.slug !== undefined) row.slug = patch.slug;
  const { error } = await supabase.from("articles").update(row).eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Upload image → storage bucket 'blog' → คืน public URL ─────────────────────
export async function uploadArticleImage(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAuth();
  const file = form.get("file") as File | null;
  if (!file) return { error: "ไม่พบไฟล์" };
  const supabase = createServerClient();
  const ext = (file.name.split(".").pop() ?? "webp").toLowerCase();
  // เก็บชื่อไฟล์เดิมแบบ SEO-friendly (slug อังกฤษ) + ต่อท้ายกันชื่อชน — Google Images อ่านชื่อไฟล์ด้วย
  const base = file.name
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const path = `${base || "blog-image"}-${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase.storage.from("blog").upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { error: error.message };
  const { data } = supabase.storage.from("blog").getPublicUrl(path);
  return { url: data.publicUrl };
}

// ─── Approve → published (+ revalidate) ────────────────────────────────────────
export async function approveArticle(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: a } = await supabase.from("articles").select("slug, hero_image, content").eq("id", id).single();
  if (!a) return { success: false, error: "ไม่พบบทความ" };
  if (!a.hero_image) return { success: false, error: "กรุณาอัปโหลดรูปหน้าปกก่อนอนุมัติ" };
  const { error } = await supabase
    .from("articles")
    .update({ status: "published", published_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/blog");
  revalidatePath(`/blog/${a.slug}`);
  revalidatePath("/sitemap.xml");
  return { success: true };
}

export async function unpublishArticle(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: a } = await supabase.from("articles").select("slug").eq("id", id).single();
  const { error } = await supabase
    .from("articles").update({ status: "pending_review", updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/blog");
  if (a?.slug) revalidatePath(`/blog/${a.slug}`);
  return { success: true };
}

export async function deleteArticle(id: string): Promise<{ success: boolean; error?: string }> {
  await requireAuth();
  const supabase = createServerClient();
  const { data: a } = await supabase.from("articles").select("slug, status").eq("id", id).single();
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) return { success: false, error: error.message };
  if (a?.status === "published") { revalidatePath("/blog"); if (a?.slug) revalidatePath(`/blog/${a.slug}`); }
  return { success: true };
}
