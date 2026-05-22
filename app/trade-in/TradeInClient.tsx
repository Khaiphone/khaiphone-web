"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ChevronDown, Search, X } from "lucide-react";

type IconProps = { className?: string; style?: React.CSSProperties };

function IconApple({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.5-155.5-103.4C46.5 727.1 0 604.9 0 494.5 0 320.2 105.5 224 209.4 224c65.4 0 120 43.1 161.8 43.1 39.8 0 101.6-46.7 174.2-46.7zm-134.6-114.1c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" />
    </svg>
  );
}

function formatPrice(n: number) {
  return "฿" + n.toLocaleString("th-TH");
}

type Condition = "good" | "fair" | "poor";

export type TradeInProduct = {
  model: string;
  storage: string;
  priceGood: number;
  priceFair: number;
  pricePoor: number;
  isNew: boolean;
  discontinued: boolean;
};

export type TradeInCategory = {
  key: string;
  label: string;
  products: TradeInProduct[];
};

const CONDITIONS: { key: Condition; label: string }[] = [
  { key: "good", label: "สภาพดี" },
  { key: "fair", label: "สภาพพอใช้" },
  { key: "poor", label: "สภาพเสีย/แตก" },
];

function getPrice(p: TradeInProduct, cond: Condition) {
  if (cond === "good") return p.priceGood;
  if (cond === "fair") return p.priceFair;
  return p.pricePoor;
}

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getProductImage(model: string): string | null {
  if (model.includes("iPhone") && model.includes("Air")) return `/iPhone-air.webp`;
  const iphoneM = model.match(/iPhone (\d+)/);
  if (iphoneM) {
    const gen = parseInt(iphoneM[1]);
    if (gen < 11 || gen > 17) return null;
    if (model.includes("Pro")) return `/iPhone-${gen}-pro-max.webp`;
    if (model.endsWith("e")) return `/iPhone-${gen}e.webp`;
    return `/iPhone-${gen}.webp`;
  }
  if (model.includes("iPad Pro")) {
    if (model.includes("2020")) return `/ipad-pro-11-old.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    if (chipM) return `/ipad-pro-m${chipM[1]}.webp`;
  }
  if (model.includes("iPad Air")) {
    const airM = model.match(/iPad Air (\d+)/);
    if (airM) return `/ipad-air-${airM[1]}.webp`;
  }
  if (model.includes("iPad mini")) {
    const miniM = model.match(/iPad mini (\d+)/);
    if (miniM) return `/ipad-mini-${miniM[1]}.webp`;
  }
  const genM = model.match(/iPad Gen (\d+)/);
  if (genM) return `/ipad-gen-${genM[1]}.webp`;
  if (model.startsWith("MacBook") || model.startsWith("Mac mini") || model.startsWith("iMac")) {
    if (model.includes("MacBook Neo")) return `/macbook-neo.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    const chip = chipM ? chipM[1] : null;
    if (model.includes("MacBook Air")) return chip ? `/macbook-air-m${chip}.webp` : null;
    if (model.includes("MacBook Pro")) return chip ? `/macbook-pro-m${chip}.webp` : null;
    if (model.includes("Mac mini"))   return chip ? `/mac-mini-m${chip}.webp`    : null;
    if (model.includes("iMac"))       return chip ? `/imac-m${chip}.webp`        : null;
  }
  if (model.includes("Apple Watch")) {
    const seriesM = model.match(/Series (\d+)/);
    if (seriesM) return `/apple-watch-series-${seriesM[1]}.webp`;
    const seM = model.match(/SE \(Gen (\d+)\)/);
    if (seM) return `/apple-watch-se-${seM[1]}.webp`;
    if (model.includes("Ultra 3")) return `/apple-watch-ultra-3.webp`;
    if (model.includes("Ultra 2")) return `/apple-watch-ultra-2.webp`;
    if (model.includes("Ultra"))   return `/apple-watch-ultra-1.webp`;
  }
  return null;
}

function ProductCard({ p, condition }: { p: TradeInProduct; condition: Condition }) {
  const img = getProductImage(p.model);
  return (
    <details className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group" style={p.discontinued ? { pointerEvents: "none" } : {}}>
      <summary className="flex items-center gap-4 p-4 cursor-pointer list-none">
        <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: "#f5f5f7" }}>
          {img ? (
            <img
              src={img}
              alt={p.model}
              className="w-full h-full object-contain p-1"
              onError={e => {
                const el = e.currentTarget;
                el.style.display = "none";
                const icon = el.nextElementSibling as HTMLElement | null;
                if (icon) icon.style.display = "";
              }}
            />
          ) : null}
          <IconApple className="w-7 h-7" style={{ color: "#d1d5db", display: img ? "none" : "" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className="font-bold text-sm md:text-base leading-snug" style={{ color: p.discontinued ? "#9CA3AF" : "#111" }}>{p.model}</p>
            {p.isNew && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(184,134,11,0.12)", color: "#B8860B" }}>ใหม่ล่าสุด</span>
            )}
            {p.discontinued && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#EF4444" }}>ยกเลิกการรับซื้อ</span>
            )}
          </div>
          {p.storage && <p className="text-xs" style={{ color: "#9CA3AF" }}>{p.storage}</p>}
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {p.discontinued ? (
            <p className="text-sm" style={{ color: "#9CA3AF" }}>ไม่รับซื้อ</p>
          ) : (
            <>
              <p className="font-bold text-lg md:text-xl" style={{ color: "#111" }}>{formatPrice(getPrice(p, condition))}</p>
              <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#B8860B" }}>
                ดูทั้งหมด
                <ChevronDown size={13} />
              </span>
            </>
          )}
        </div>
      </summary>

      {!p.discontinued && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {CONDITIONS.map(c => (
              <div key={c.key} className="rounded-xl p-3 text-center" style={{ background: c.key === condition ? "#111111" : "#f5f5f7" }}>
                <p className="text-xs mb-1" style={{ color: c.key === condition ? "#B8860B" : "#9CA3AF" }}>{c.label}</p>
                <p className="font-bold text-sm" style={{ color: c.key === condition ? "#fff" : "#111" }}>{formatPrice(getPrice(p, c.key))}</p>
              </div>
            ))}
          </div>
          <a
            href={`/sell/${toSlug(p.model)}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-bold text-sm text-white"
            style={{ background: "#111111" }}
          >
            ประเมินราคาขาย →
          </a>
        </div>
      )}
    </details>
  );
}

function TradeInContent({ categories }: { categories: TradeInCategory[] }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "iphone";
  const [condition, setCondition] = useState<Condition>("good");
  const [search, setSearch] = useState("");

  const currentTab = categories.find(t => t.key === activeTab) ?? categories[0];
  const filtered = (currentTab?.products ?? []).filter(p =>
    p.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      <Header />

      <div className="bg-white border-b border-gray-100 px-4 py-6 md:py-10">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm font-medium mb-1" style={{ color: "#B8860B" }}>ราคารับซื้อล่าสุด</p>
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-2">รายการรับซื้อ</h1>
          <p className="text-sm md:text-base text-gray-500">เลือกรุ่นที่ต้องการขาย ดูราคารับซื้อแบบเรียลไทม์ อัปเดตทุกวัน</p>
        </div>
      </div>

      <div className="bg-white border-b border-gray-100 sticky top-[65px] z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {categories.map(tab => (
              <a
                key={tab.key}
                href={`/trade-in?tab=${tab.key}`}
                className="flex-shrink-0 px-4 md:px-6 py-3.5 text-sm font-semibold transition-colors border-b-2"
                style={{
                  borderColor: activeTab === tab.key ? "#B8860B" : "transparent",
                  color: activeTab === tab.key ? "#B8860B" : "#6B7280",
                }}
              >
                {tab.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-3">
        <div className="relative">
          <select
            value={condition}
            onChange={e => setCondition(e.target.value as Condition)}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-black focus:outline-none focus:ring-2 w-full sm:w-auto"
            style={{ WebkitAppearance: "none" }}
          >
            {CONDITIONS.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#6B7280" }} />
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9CA3AF" }} />
          <input
            type="text"
            placeholder="ค้นหารุ่น..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 bg-white text-sm w-full focus:outline-none focus:ring-2"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X size={14} style={{ color: "#9CA3AF" }} />
            </button>
          )}
        </div>

        <p className="self-center text-sm text-gray-400 hidden md:block">
          {filtered.length} รายการ
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <IconApple className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">ไม่พบรุ่นที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(p => (
              <ProductCard key={p.model} p={p} condition={condition} />
            ))}
          </div>
        )}
      </div>

      <section className="px-4 pb-8">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5 px-6 py-7 md:px-10 md:py-10" style={{ background: "#111111" }}>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white mb-1">ไม่เจอรุ่นที่ต้องการ?</h3>
              <p className="text-sm" style={{ color: "#9CA3AF" }}>ติดต่อเราได้เลย เรารับซื้อทุกรุ่น ทุกสภาพ</p>
            </div>
            <a
              href="https://line.me/R/ti/p/@khaiphone"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 font-bold px-7 py-3.5 rounded-full text-white text-sm whitespace-nowrap hover:opacity-90 transition-opacity"
              style={{ background: "#06C755" }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" /></svg>
              ติดต่อผ่าน LINE
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function TradeInClient({ categories }: { categories: TradeInCategory[] }) {
  return (
    <Suspense fallback={null}>
      <TradeInContent categories={categories} />
    </Suspense>
  );
}
