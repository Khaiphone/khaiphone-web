"use client";

import { useState, useMemo } from "react";
import { Calendar, Clock } from "lucide-react";
import type { BlogPost } from "@/lib/blogData";

const CATEGORIES = [
  "ทั้งหมด",
  "ราคาล่าสุด",
  "วิธีการขาย",
  "ปัญหาเครื่อง",
  "ความปลอดภัย",
  "MacBook / iPad",
  "เปรียบเทียบ",
];

export default function BlogSearch({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ทั้งหมด");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return posts.filter((post) => {
      const matchCat =
        activeCategory === "ทั้งหมด" || post.category === activeCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [posts, query, activeCategory]);

  return (
    <>
      {/* Search — gray bg continues from hero */}
      <div className="px-4 pb-10" style={{ background: "#f9f9f7" }}>
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "#6B7280" }}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาบทความ เช่น จอแตก, iCloud, แบต, ราคา iPhone 15"
              className="w-full pl-11 pr-10 py-3.5 rounded-xl text-sm bg-white"
              style={{
                border: "1.5px solid #E5E7EB",
                outline: "none",
                fontFamily: "var(--font-prompt), sans-serif",
                color: "#111",
              }}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="ล้างการค้นหา"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm leading-none"
                style={{ color: "#9CA3AF" }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category filter — sticky */}
      <div
        className="sticky top-0 z-20 bg-white px-4 py-3.5"
        style={{ borderBottom: "1px solid #F3F4F6" }}
      >
        <div
          className="max-w-6xl mx-auto flex gap-2 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="flex-none px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors"
              style={
                cat === activeCategory
                  ? { background: "#B8860B", color: "#fff" }
                  : { background: "#fff", color: "#374151", border: "1.5px solid #E5E7EB" }
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Blog grid */}
      <section className="py-10 md:py-14 px-4">
        <div className="max-w-6xl mx-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <p className="font-semibold text-black mb-1">ไม่พบบทความที่ตรงกัน</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
              {filtered.map((post) => (
                <a
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col gap-3"
                  style={{ textDecoration: "none" }}
                >
                  <div
                    className="relative rounded-xl overflow-hidden"
                    style={{ aspectRatio: "16/9" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className="absolute bottom-3 left-3 text-xs font-semibold text-white px-3 py-1 rounded-full"
                      style={{ background: "#B8860B" }}
                    >
                      {post.category}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-bold text-black text-sm md:text-base leading-snug line-clamp-2 mb-2 group-hover:text-[#B8860B] transition-colors">
                      {post.title}
                    </h2>
                    <div className="flex items-center gap-4">
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "#6B7280" }}
                      >
                        <Calendar size={11} />
                        {post.displayDate}
                      </span>
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: "#6B7280" }}
                      >
                        <Clock size={11} />
                        {post.readTime}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
