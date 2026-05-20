"use client";

import { Star, ShieldCheck, ThumbsUp, Award, CheckCircle } from "lucide-react";

const reviews = [
  {
    name: "นนท์",
    phone: "085-xxx-xx72",
    initials: "นท",
    date: "20 พ.ค. 2569",
    text: "ขายมาหลายที่แล้ว ที่นี่ให้ราคาดีที่สุดเลยครับ มานัดรับถึงที่ ตรวจไม่นาน โอนมาเลยไม่ต้องรอ ประทับใจมากครับ",
    product: { model: "iPhone 15 Pro Max", storage: "256GB", color: "Natural Titanium", image: "/iPhone-15-pro-max.webp" },
    soldDate: "20 พ.ค. 2569",
  },
  {
    name: "อาร์ม",
    phone: "092-xxx-xx14",
    initials: "อม",
    date: "19 พ.ค. 2569",
    text: "ไม่เคยขายออนไลน์เลย กลัวโดนโกง แต่ที่นี่โอเคมากครับ คุยกันตกลงราคาแล้วนัดรับวันเดียวกัน เจ้าหน้าที่สุภาพดีมาก",
    product: { model: "iPhone 14 Pro", storage: "128GB", color: "Deep Purple", image: "/iPhone-14-pro-max.webp" },
    soldDate: "19 พ.ค. 2569",
  },
  {
    name: "ปอ",
    phone: "063-xxx-xx58",
    initials: "ปอ",
    date: "18 พ.ค. 2569",
    text: "แอดไลน์แล้วได้ราคาประเมินเลย นัดรับที่บ้านได้ ไม่มีหักอะไรเพิ่ม ได้เงินครบตามที่คุยไว้ จะแนะนำคนรอบข้างเลยครับ",
    product: { model: "iPhone 13", storage: "128GB", color: "Midnight", image: "/iPhone-13.webp" },
    soldDate: "18 พ.ค. 2569",
  },
];

const TRUST_BADGES = [
  { Icon: ShieldCheck, title: "รีวิวจริง 100%",  sub: "จากลูกค้าที่ใช้บริการจริง" },
  { Icon: ThumbsUp,    title: "ให้ราคาสูง",      sub: "จ่ายจริง จบไว" },
  { Icon: Award,       title: "เชื่อถือได้",     sub: "ร้านค้าจดทะเบียนถูกต้อง" },
];

function ReviewCard({ r }: { r: (typeof reviews)[number] }) {
  return (
    <div
      className="flex flex-col h-full rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #222222 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Avatar + name + stars */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
            style={{ background: "linear-gradient(135deg, #D4AF37, #B8860B)", color: "#fff" }}
          >
            {r.initials}
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-snug">{r.name}</p>
            <p className="text-xs" style={{ color: "#6B7280" }}>{r.phone}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={13} fill="#D4AF37" color="#D4AF37" />
            ))}
          </div>
          <p className="text-xs" style={{ color: "#6B7280" }}>{r.date}</p>
        </div>
      </div>

      {/* Review text */}
      <p className="text-sm leading-relaxed mb-4 flex-1" style={{ color: "#D1D5DB" }}>{r.text}</p>

      {/* Product box — no price */}
      <div
        className="flex items-center gap-3 rounded-xl p-2.5 mb-3"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: "#2a2a2a" }}>
          <img
            src={r.product.image}
            alt={r.product.model}
            className="w-full h-full object-contain p-1"
            onError={e => {
              const img = e.currentTarget as HTMLImageElement;
              img.src = "/product-iphone.webp";
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold leading-snug">{r.product.model}</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>{r.product.storage} | {r.product.color}</p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="flex items-center gap-1 text-xs" style={{ color: "#4ADE80" }}>
          <CheckCircle size={12} fill="#4ADE80" color="#4ADE80" />
          ยืนยันตัวตนแล้ว
        </span>
        <span className="text-xs" style={{ color: "#6B7280" }}>
          ขายแล้วเมื่อ {r.soldDate}
        </span>
      </div>
    </div>
  );
}

export default function ReviewSection() {
  return (
    <section style={{ background: "#111111" }} className="py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="text-left md:text-center mb-6 md:mb-8">
          <p className="text-white font-bold text-2xl md:text-3xl mb-3">รีวิวจากลูกค้าจริง</p>
          <div className="flex items-center gap-2 mb-1 md:justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={22} fill="#D4AF37" color="#D4AF37" />
            ))}
          </div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>จาก 300+ รีวิว</p>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8">
          {TRUST_BADGES.map(({ Icon, title, sub }) => (
            <div
              key={title}
              className="flex flex-col md:flex-row items-center md:items-center gap-1.5 md:gap-3 rounded-xl px-3 py-3 md:px-4 text-center md:text-left"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Icon size={18} color="#D4AF37" className="flex-shrink-0" />
              <div>
                <p className="text-white text-xs font-semibold leading-snug">{title}</p>
                <p className="text-xs hidden md:block" style={{ color: "#9CA3AF" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Review Cards: horizontal scroll on mobile, 3-col grid on desktop */}
        <div
          className="-mx-4 md:mx-0 px-4 md:px-0 flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible pb-4 md:pb-0 mb-8"
          style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
        >
          {reviews.map(r => (
            <div
              key={r.name}
              className="flex-none w-[82vw] md:w-auto md:flex-auto"
              style={{ scrollSnapAlign: "start" }}
            >
              <ReviewCard r={r} />
            </div>
          ))}
        </div>

        {/* View all button */}
        <div className="flex justify-center">
          <a
            href="/reviews"
            className="px-8 py-3 rounded-full text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black"
            style={{ border: "1px solid rgba(255,255,255,0.2)" }}
          >
            ดูรีวิวทั้งหมด →
          </a>
        </div>

      </div>
    </section>
  );
}
