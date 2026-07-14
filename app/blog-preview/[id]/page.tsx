import { notFound } from "next/navigation";
import { fetchAdminArticle } from "@/app/actions/articles";
import ArticleView from "@/app/blog/ArticleView";

// พรีวิวบทความก่อนเผยแพร่ (ทุกสถานะ) — auth-gated ผ่าน fetchAdminArticle (requireAuth)
// อยู่นอก /admin เพื่อให้เห็นหน้าตาเหมือนหน้า blog จริงเป๊ะ (ไม่มี admin shell ครอบ)
export const dynamic = "force-dynamic";

export default async function BlogPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await fetchAdminArticle(id).catch(() => null);
  if (!article) notFound();

  return (
    <>
      <div style={{ background: "#B45309", color: "#fff", textAlign: "center", fontSize: 13, fontWeight: 700, padding: "7px 12px" }}>
        👁️ พรีวิว — {article.status === "published" ? "เผยแพร่แล้ว" : "ยังไม่เผยแพร่ (draft)"} · หน้าตาจริงเมื่ออนุมัติ
      </div>
      <ArticleView article={article} related={[]} />
    </>
  );
}
