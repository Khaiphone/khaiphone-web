"use client";

import { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import { ChevronRight, RotateCcw, Clock, Lock } from "lucide-react";
import { CATEGORIES, type CategoryKey } from "@/lib/products";

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

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function slugToModelName(slug: string): string {
  for (const cat of CATEGORIES) {
    for (const p of cat.products) {
      if (toSlug(p.model) === slug) return p.model;
    }
  }
  return slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getIphoneImage(model: string): string | null {
  // iPhone
  if (model.includes("iPhone") && model.includes("Air")) return `/iPhone-air.webp`;
  const iphoneM = model.match(/iPhone (\d+)/);
  if (iphoneM) {
    const gen = parseInt(iphoneM[1]);
    if (gen < 11 || gen > 17) return null;
    if (model.includes("Pro")) return `/iPhone-${gen}-pro-max.webp`;
    if (model.endsWith("e")) return `/iPhone-${gen}e.webp`;
    return `/iPhone-${gen}.webp`;
  }
  // iPad Pro
  if (model.includes("iPad Pro")) {
    if (model.includes("2020")) return `/ipad-pro-2020.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    if (chipM) return `/ipad-pro-m${chipM[1]}.webp`;
  }
  // iPad Air
  if (model.includes("iPad Air")) {
    const airM = model.match(/iPad Air (\d+)/);
    if (airM) return `/ipad-air-${airM[1]}.webp`;
  }
  // iPad mini
  if (model.includes("iPad mini")) {
    const miniM = model.match(/iPad mini (\d+)/);
    if (miniM) return `/ipad-mini-${miniM[1]}.webp`;
  }
  // iPad Gen
  const genM = model.match(/iPad Gen (\d+)/);
  if (genM) return `/ipad-gen-${genM[1]}.webp`;
  // Mac
  if (model.startsWith("MacBook") || model.startsWith("Mac mini") || model.startsWith("iMac")) {
    if (model.includes("MacBook Neo")) return `/macbook-neo.webp`;
    const chipM = model.match(/\bM(\d)\b/);
    const chip = chipM ? chipM[1] : null;
    if (model.includes("MacBook Air")) return chip ? `/macbook-air-m${chip}.webp` : null;
    if (model.includes("MacBook Pro")) return chip ? `/macbook-pro-m${chip}.webp` : null;
    if (model.includes("Mac mini"))   return chip ? `/mac-mini-m${chip}.webp`    : null;
    if (model.includes("iMac"))       return chip ? `/imac-m${chip}.webp`        : null;
  }
  // Apple Watch
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

const CATEGORY_IMAGES: Record<CategoryKey, { src: string; scale: number }> = {
  iphone:  { src: "/product-iphone.webp", scale: 1    },
  ipad:    { src: "/product-ipad.webp",    scale: 1    },
  macbook: { src: "/product-macbook.webp", scale: 1.35 },
  watch:   { src: "/product-watch.webp",   scale: 1    },
};

function SellPageContent() {
  const searchParams = useSearchParams();
  const activeCat = searchParams.get("category") as CategoryKey | null;
  const activeModelId = searchParams.get("model");

  const step2Ref = useRef<HTMLDivElement>(null);
  const [resumeModal, setResumeModal] = useState<{ slug: string; name: string; step: number } | null>(null);

  // Scan localStorage and show resume popup if there's in-progress wizard data.
  // Called both on mount (normal navigation) and on pageshow (iOS Safari bfcache restoration).
  function checkWizardProgress() {
    const wizardKeys = Object.keys(window.localStorage).filter(k => k.startsWith("khaiphone_wizard_"));
    const entries: { slug: string; step: number; savedAt: number }[] = [];
    try {
      for (const key of wizardKeys) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const saved = JSON.parse(raw) as { step: number; picks: (number | null)[]; savedAt?: number };
        const hasProgress = saved.step > 0 || saved.picks?.some(p => p !== null);
        if (!hasProgress) continue;
        const slug = key.replace("khaiphone_wizard_", "");
        entries.push({ slug, step: saved.step, savedAt: saved.savedAt ?? 0 });
      }
    } catch {}
    if (entries.length === 0) return;
    entries.sort((a, b) => b.savedAt - a.savedAt);
    const { slug, step } = entries[0];
    setResumeModal({ slug, name: slugToModelName(slug), step });
  }

  useEffect(() => {
    // Initial check — setTimeout lets Safari finish hydration first
    const timer = setTimeout(checkWizardProgress, 100);

    // pageshow fires even when Safari restores from bfcache (back button),
    // which does NOT remount React and does NOT re-run useEffect.
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        // Page restored from bfcache — re-run the check
        checkWizardProgress();
      }
    }
    window.addEventListener("pageshow", onPageShow);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCTA(e: React.MouseEvent, slug: string, name: string) {
    e.preventDefault();
    try {
      const raw = localStorage.getItem(`khaiphone_wizard_${slug}`);
      if (raw) {
        const saved = JSON.parse(raw) as { step: number; picks: (number | null)[] };
        const hasProgress = saved.step > 0 || saved.picks?.some((p: number | null) => p !== null);
        if (hasProgress) {
          setResumeModal({ slug, name, step: saved.step });
          return;
        }
      }
    } catch {}
    window.location.href = `/sell/${slug}`;
  }

  const currentProducts = activeCat ? CATEGORIES.find(c => c.key === activeCat)!.products : [];
  const selectedModel = activeModelId ? currentProducts.find(p => p.id === activeModelId) ?? null : null;

  // Scroll to step 2 when category first selected
  useEffect(() => {
    if (!activeCat) return;
    const id = setTimeout(() => {
      if (!step2Ref.current) return;
      const top = step2Ref.current.getBoundingClientRect().top + window.pageYOffset - 88;
      window.scrollTo({ top, behavior: "smooth" });
    }, 100);
    return () => clearTimeout(id);
  }, [activeCat]);

  return (
    <div className="min-h-screen bg-gray-50 pb-32 md:pb-0">
      <Header />

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 px-4 py-7 md:py-12">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-medium mb-2" style={{ color: "#B8860B" }}>ประเมินราคาฟรี ไม่ผูกมัด</p>
          <h1 className="text-2xl md:text-4xl font-bold text-black mb-3">ขายอุปกรณ์ Apple ของคุณ</h1>
          <p className="text-sm md:text-base text-gray-500">เลือกประเภทและรุ่น แล้วกรอกสภาพเครื่อง รับราคาประเมินทันที</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">

        {/* Step 1: Category */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#B8860B" }}>
            ขั้นตอนที่ 1 — เลือกประเภทสินค้า
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIES.map(cat => {
              const { src, scale } = CATEGORY_IMAGES[cat.key];
              const active = activeCat === cat.key;
              return (
                <Link
                  key={cat.key}
                  href={`/sell?category=${cat.key}`}
                  className="flex flex-col items-center gap-2 pt-4 pb-4 px-3 rounded-2xl border-2"
                  style={{
                    borderColor: active ? "#B8860B" : "#E5E7EB",
                    background: active ? "rgba(184,134,11,0.06)" : "#fff",
                  }}
                >
                  <div className="w-full h-20 flex items-center justify-center">
                    <img src={src} alt={cat.label} className="h-full w-full object-contain" style={{ transform: `scale(${scale})` }} />
                  </div>
                  <span className="font-semibold text-sm mt-1" style={{ color: active ? "#B8860B" : "#374151" }}>
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Step 2: Model list — all Link, no onClick/onChange */}
        {activeCat && (
          <div className="mb-6" ref={step2Ref}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#B8860B" }}>
              ขั้นตอนที่ 2 — เลือกรุ่น
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {currentProducts.map(p => {
                const active = activeModelId === p.id;
                const href = p.discontinued
                  ? `/sell?category=${activeCat}`
                  : `/sell?category=${activeCat}&model=${p.id}`;
                return (
                  <Link
                    key={p.id}
                    href={href}
                    scroll={false}
                    className="flex items-center gap-3 px-4 py-3.5 first:rounded-t-2xl last:rounded-b-2xl"
                    style={{ background: active ? "rgba(184,134,11,0.06)" : "transparent" }}
                  >
                    {/* Model icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ background: active ? "#111" : "#f5f5f7" }}
                    >
                      {(() => {
                        const img = getIphoneImage(p.model);
                        return img ? (
                          <img src={img} alt={p.model} className="w-full h-full object-contain p-1" />
                        ) : (
                          <IconApple className="w-5 h-5" style={{ color: active ? "#B8860B" : "#d1d5db" }} />
                        );
                      })()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm" style={{ color: p.discontinued ? "#9CA3AF" : "#111" }}>{p.model}</span>
                        {p.isNew && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(184,134,11,0.12)", color: "#B8860B" }}>ใหม่</span>
                        )}
                        {p.discontinued && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#FEE2E2", color: "#EF4444" }}>ยกเลิกการรับซื้อ</span>
                        )}
                      </div>
                      {p.discontinued
                        ? <span className="text-xs" style={{ color: "#D1D5DB" }}>ไม่รับซื้อรุ่นนี้</span>
                        : <span className="text-xs" style={{ color: "#9CA3AF" }}>เริ่มต้น {formatPrice(p.priceGood)}</span>
                      }
                    </div>

                    {/* Chevron or check */}
                    <div className="flex-shrink-0">
                      {active ? (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "#B8860B" }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      ) : (
                        <ChevronRight size={16} style={{ color: "#D1D5DB" }} />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      {selectedModel && !selectedModel.discontinued && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 px-4 py-3 bg-white border-t border-gray-100" style={{ transform: "translateZ(0)", WebkitTransform: "translateZ(0)" }}>
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">รุ่นที่เลือก</p>
              <p className="font-bold text-black text-sm truncate">{selectedModel.model}</p>
            </div>
            <a
              href={`/sell/${toSlug(selectedModel.model)}`}
              onClick={(e) => handleCTA(e, toSlug(selectedModel.model), selectedModel.model)}
              className="flex items-center gap-2 font-bold px-6 py-3 rounded-full text-white text-sm whitespace-nowrap"
              style={{ background: "#111111" }}
            >
              เริ่มประเมินราคา →
            </a>
          </div>
        </div>
      )}

      {/* Resume modal */}
      {resumeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setResumeModal(null)}
        >
          <div
            className="w-full bg-white"
            style={{ maxWidth: 360, borderRadius: 16, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: "#B8860B" }}>
              <Clock size={24} color="#fff" />
            </div>

            {/* Heading */}
            <h2 className="text-lg font-bold text-black text-center mb-2">มีการประเมินค้างอยู่</h2>

            {/* Model badge */}
            <div className="flex justify-center mb-3">
              <span className="px-3 py-1 rounded-full text-sm font-semibold text-white" style={{ background: "#111" }}>
                {resumeModal.name}
              </span>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-center mb-6" style={{ color: "#6B7280" }}>
              คุณทำประเมินไว้แล้วค้างขั้นตอนที่ {resumeModal.step} ต้องการทำต่อหรือเริ่มใหม่?
            </p>

            <div className="flex flex-col gap-3">
              {/* Primary — gold */}
              <a
                href={`/sell/${resumeModal.slug}`}
                className="flex items-center justify-center gap-2 w-full font-semibold text-white text-sm"
                style={{ background: "#B8860B", borderRadius: 999, height: 52 }}
              >
                ทำต่อจากที่ค้างไว้
                <ChevronRight size={16} />
              </a>

              {/* Secondary — outline */}
              <a
                href={`/sell/${resumeModal.slug}?r=1`}
                onClick={() => {
                  try { localStorage.removeItem(`khaiphone_wizard_${resumeModal.slug}`); } catch {}
                }}
                className="flex items-center justify-center gap-2 w-full font-semibold text-sm"
                style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 999, height: 52, color: "#374151" }}
              >
                <RotateCcw size={15} />
                เริ่มใหม่ตั้งแต่ต้น
              </a>
            </div>

            {/* Bottom trust text */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <Lock size={11} style={{ color: "#D1D5DB" }} />
              <span className="text-xs" style={{ color: "#9CA3AF" }}>ข้อมูลของคุณจะถูกบันทึกไว้อย่างปลอดภัย</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SellPage() {
  return (
    <Suspense fallback={null}>
      <SellPageContent />
    </Suspense>
  );
}
