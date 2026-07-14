import Link from "next/link";
import { Calendar, Clock, ChevronRight, ArrowLeft } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import type { Article, ArticleCard } from "@/lib/blog-types";
import { buildArticleSchema, buildBreadcrumbSchema, buildFaqSchema } from "@/lib/article-schema";

// Render บทความ — โครง/สไตล์/JSON-LD เดียวกันทั้งบทความ static เดิมและบทความจาก DB
export default function ArticleView({ article, related }: { article: Article; related: ArticleCard[] }) {
  const sections = article.content;
  const articleSchema = buildArticleSchema(article);
  const breadcrumbSchema = buildBreadcrumbSchema(article);
  const faqSchema = buildFaqSchema(sections);

  return (
    <div className="min-h-screen bg-white pb-16 md:pb-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <Header />

      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-100" style={{ background: "#f9f9f7" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-1.5 text-xs" style={{ color: "#6B7280" }}>
          <Link href="/" className="hover:text-black transition-colors">หน้าแรก</Link>
          <ChevronRight size={12} />
          <Link href="/blog" className="hover:text-black transition-colors">บทความ</Link>
          <ChevronRight size={12} />
          <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold" style={{ background: "#B8860B" }}>
            {article.category}
          </span>
        </div>
      </div>

      {/* Article header */}
      <div className="px-4 py-10 md:py-14" style={{ background: "#f9f9f7", borderBottom: "1px solid #F3F4F6" }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-4xl font-bold text-black leading-snug mb-5">{article.title}</h1>
          <p className="text-base md:text-lg leading-relaxed mb-6" style={{ color: "#6B7280" }}>{article.excerpt}</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
              <Calendar size={13} />{article.displayDate}
            </span>
            <span className="flex items-center gap-1.5 text-sm" style={{ color: "#6B7280" }}>
              <Clock size={13} />{article.readTime}
            </span>
          </div>
        </div>
      </div>

      {/* Hero image */}
      {article.image && (
        <div className="px-4 pb-2" style={{ background: "#f9f9f7" }}>
          <div className="max-w-3xl mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={article.image} alt={article.title} className="w-full rounded-2xl" style={{ display: "block", maxHeight: 480, objectFit: "contain" }} />
          </div>
        </div>
      )}

      {/* Article body */}
      <article className="px-4 py-10 md:py-14">
        <div className="max-w-3xl mx-auto">
          {sections.map((section, i) => {
            if (section.type === "heading") {
              return <h2 key={i} className="text-xl md:text-2xl font-bold text-black mt-8 mb-3 leading-snug">{section.text}</h2>;
            }
            if (section.type === "subheading") {
              return <h3 key={i} className="text-lg md:text-xl font-bold text-black mt-6 mb-2 leading-snug">{section.text}</h3>;
            }
            if (section.type === "paragraph") {
              return <p key={i} className="text-sm md:text-base leading-relaxed mb-4" style={{ color: "#374151" }}>{section.text}</p>;
            }
            if (section.type === "list") {
              return (
                <ul key={i} className="flex flex-col gap-2.5 mb-5 pl-1">
                  {section.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm md:text-base" style={{ color: "#374151" }}>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5" style={{ background: "#B8860B" }}>{j + 1}</span>
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
            if (section.type === "image") {
              if (!section.src) return null; // ช่องรูปว่าง — ไม่ render บนหน้าจริง (published ต้องมีรูปแล้ว)
              return (
                <figure key={i} className="my-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={section.src} alt={section.alt ?? article.title} className="w-full rounded-2xl" style={{ display: "block" }} />
                  {section.caption && <figcaption className="text-xs mt-2 text-center" style={{ color: "#6B7280" }}>{section.caption}</figcaption>}
                </figure>
              );
            }
            if (section.type === "faq") {
              return (
                <div key={i} className="mt-2 mb-5">
                  {section.items.map(({ q, a }, j) => (
                    <details key={j} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer select-none" style={{ listStyle: "none" }}>
                        <span className="font-semibold text-black text-sm md:text-base leading-snug">{q}</span>
                        <span className="flex-shrink-0 font-bold text-lg" style={{ color: "#B8860B" }}>+</span>
                      </summary>
                      <p className="pb-4 text-sm leading-relaxed" style={{ color: "#6B7280" }}>{a}</p>
                    </details>
                  ))}
                </div>
              );
            }
            if (section.type === "table") {
              return (
                <div key={i} className="rounded-xl overflow-hidden my-5" style={{ border: "1px solid #E5E7EB" }}>
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr style={{ background: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                        {section.headers.map((h) => <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "#374151" }}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: ri < section.rows.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-4 py-3" style={{ color: ci === row.length - 1 ? "#B8860B" : "#374151", fontWeight: ci === row.length - 1 ? 700 : ci === 0 ? 500 : 400 }}>{cell}</td>
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
            <a href="/sell" className="flex-shrink-0 flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white whitespace-nowrap transition-opacity hover:opacity-90" style={{ background: "#B8860B" }}>
              ประเมินราคาฟรี →
            </a>
          </div>

          {/* Back link */}
          <div className="mt-8 pt-8" style={{ borderTop: "1px solid #F3F4F6" }}>
            <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:text-black" style={{ color: "#6B7280" }}>
              <ArrowLeft size={14} />กลับไปหน้าบทความทั้งหมด
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
                <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col gap-2.5" style={{ textDecoration: "none" }}>
                  <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "16/9" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <span className="absolute bottom-2.5 left-2.5 text-xs font-semibold text-white px-2.5 py-1 rounded-full" style={{ background: "#B8860B" }}>{p.category}</span>
                  </div>
                  <p className="text-sm font-bold text-black leading-snug line-clamp-2 group-hover:text-[#B8860B] transition-colors">{p.title}</p>
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
