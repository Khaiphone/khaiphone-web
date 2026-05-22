"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";

interface Product {
  model: string;
  priceGood: number;
  slug: string;
}

export default function NotFoundSearch({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(p => p.model.toLowerCase().includes(q)).slice(0, 6);
  }, [query, products]);

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        background: "#fff", border: "1.5px solid #E5E5E5",
        borderRadius: 14, padding: "12px 16px",
        boxShadow: focused ? "0 0 0 3px rgba(184,134,11,0.12)" : "none",
        borderColor: focused ? "#B8860B" : "#E5E5E5",
        transition: "all 150ms",
      }}>
        <Search size={18} style={{ color: "#9CA3AF", flexShrink: 0 }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="ค้นหารุ่นที่ต้องการขาย เช่น iPhone 17 Pro"
          style={{
            flex: 1, border: "none", outline: "none", fontSize: 14,
            color: "#111", background: "transparent", fontFamily: "inherit",
          }}
        />
      </div>

      {focused && results.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", borderRadius: 14, overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.1)", border: "1px solid #E5E5E5",
          zIndex: 50,
        }}>
          {results.map(p => (
            <Link
              key={p.slug}
              href={`/sell/${p.slug}`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", textDecoration: "none",
                borderBottom: "1px solid #F3F4F6",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#F9F9F7")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111" }}>{p.model}</p>
                <p style={{ margin: 0, fontSize: 11, color: "#9CA3AF" }}>
                  เริ่มต้น ฿{p.priceGood.toLocaleString("th-TH")}
                </p>
              </div>
              <ArrowRight size={14} style={{ color: "#D1D5DB" }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
