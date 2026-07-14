// แทรกบทความ draft (pending_review) ลง Supabase — ใช้โดย skill write-article
// วิธีใช้:  node scripts/insert-article.mjs <path-to-article.json>
// article.json = { slug, title, excerpt, category, readTime, displayDate, articleDate, keywords[], content[], metaTitle, metaDescription }

import fs from "node:fs";
import path from "node:path";

const file = process.argv[2];
if (!file) { console.error("❌ ต้องระบุ path ของ article JSON"); process.exit(1); }

const root = process.cwd();
const env = fs.readFileSync(path.join(root, ".env.local"), "utf8");
const get = (k) => (env.match(new RegExp("^" + k + "=(.*)$", "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
const url = get("NEXT_PUBLIC_SUPABASE_URL") || get("SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY") || get("SUPABASE_SERVICE_KEY");
if (!url || !key) { console.error("❌ ไม่พบ SUPABASE URL / service key ใน .env.local"); process.exit(1); }

const a = JSON.parse(fs.readFileSync(file, "utf8"));
for (const f of ["slug", "title", "content"]) {
  if (!a[f] || (Array.isArray(a[f]) && a[f].length === 0)) { console.error(`❌ ขาดฟิลด์จำเป็น: ${f}`); process.exit(1); }
}

const row = {
  slug: a.slug,
  status: "pending_review",
  title: a.title,
  excerpt: a.excerpt ?? "",
  category: a.category ?? "บทความ",
  read_time: a.readTime ?? "5 นาที",
  keywords: a.keywords ?? [],
  article_date: a.articleDate ?? new Date().toISOString().slice(0, 10),
  display_date: a.displayDate ?? "",
  hero_image: null,        // ห้ามใส่รูป — admin อัปโหลดเอง
  content: a.content,
  meta_title: a.metaTitle ?? null,
  meta_description: a.metaDescription ?? null,
  source: "skill",
};

const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "return=representation" };
const res = await fetch(url + "/rest/v1/articles", { method: "POST", headers: H, body: JSON.stringify(row) });
const text = await res.text();
if (res.status >= 300) {
  console.error("❌ insert ล้มเหลว (" + res.status + "):", text.slice(0, 400));
  if (text.includes("duplicate key")) console.error("   → slug ซ้ำ เปลี่ยน slug ใหม่");
  process.exit(1);
}
const inserted = JSON.parse(text)[0];
console.log("✅ บันทึก draft สำเร็จ (pending_review)");
console.log("   id:   ", inserted.id);
console.log("   slug: ", inserted.slug);
console.log("   → รีวิว/ใส่รูป/อนุมัติที่: /admin/articles");
