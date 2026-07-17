"use client";

import { useState } from "react";
import Link from "next/link";
import { HelpCircle, ChevronRight, X, Search } from "lucide-react";
import { lookupIpadByANumber } from "@/lib/ipad-model-info";
import type { IpadANumberMatch } from "@/lib/ipad-model-info";

const LINE_URL = "https://line.me/R/ti/p/@khaiphone";

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function IpadModelHelp() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const match: IpadANumberMatch | null = lookupIpadByANumber(query);
  const showNoMatch = !match && query.trim().length >= 4;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-2xl text-left"
        style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.25)" }}
      >
        <HelpCircle size={18} style={{ color: "#B8860B", flexShrink: 0 }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: "#B8860B" }}>
          ไม่แน่ใจว่า iPad รุ่นไหน? เช็ครุ่นจากเลข Model (A…)
        </span>
        <ChevronRight size={16} style={{ color: "#B8860B" }} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full bg-white"
            style={{ maxWidth: 380, borderRadius: 16, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-bold text-black">วิธีเช็ครุ่น iPad ของคุณ</h2>
              <button type="button" onClick={() => setOpen(false)} className="p-1 -m-1" aria-label="ปิด">
                <X size={20} style={{ color: "#9CA3AF" }} />
              </button>
            </div>

            <ol className="text-sm mb-4 space-y-1.5" style={{ color: "#374151" }}>
              <li>1. เข้า <b>ตั้งค่า → ทั่วไป → เกี่ยวกับ</b></li>
              <li>2. ดูบรรทัด <b>"หมายเลขรุ่น"</b> (Model Number) — ถ้าขึ้นเป็นรหัสตัวอักษร ให้แตะ 1 ครั้งจะสลับเป็นเลขขึ้นต้นด้วย A เช่น A2377</li>
              <li>3. พิมพ์เลขนั้นในช่องด้านล่าง</li>
            </ol>

            <div
              className="flex items-center gap-2 px-3 rounded-xl mb-3"
              style={{ border: "1px solid #E5E7EB", height: 48 }}
            >
              <Search size={16} style={{ color: "#9CA3AF", flexShrink: 0 }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="เช่น A2377"
                autoCapitalize="characters"
                autoCorrect="off"
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: "#111" }}
              />
            </div>

            {match && (
              <div className="rounded-xl p-4 mb-1" style={{ background: "rgba(184,134,11,0.06)", border: "1px solid rgba(184,134,11,0.25)" }}>
                <p className="text-sm font-bold text-black">{match.model}</p>
                <p className="text-xs mb-3" style={{ color: "#6B7280" }}>{match.subtitle}</p>
                <Link
                  href={`/sell?category=ipad&model=${toSlug(match.model)}`}
                  scroll={false}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 w-full font-semibold text-white text-sm"
                  style={{ background: "#B8860B", borderRadius: 999, height: 44 }}
                >
                  เลือกรุ่นนี้
                  <ChevronRight size={16} />
                </Link>
              </div>
            )}

            {showNoMatch && (
              <div className="rounded-xl p-4 mb-1 text-center" style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                <p className="text-sm mb-3" style={{ color: "#6B7280" }}>
                  ไม่พบรุ่นนี้ในรายการรับซื้อ — สอบถามทีมงานได้เลย
                </p>
                <a
                  href={LINE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full font-semibold text-white text-sm"
                  style={{ background: "#06C755", borderRadius: 999, height: 44 }}
                >
                  สอบถามทาง LINE
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
