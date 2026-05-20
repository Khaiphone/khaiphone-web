"use client";

import { Star, ShieldCheck, ThumbsUp, Award, CheckCircle } from "lucide-react";

const reviews = [
  {
    name: "คุณนนท์",
    initials: "นท",
    rating: 5,
    date: "20 พ.ค. 2569",
    text: "ให้ราคาสูงจริง ได้เงินไว และมาเลยตามนัดครับ พนักงานบริการดีมาก ขั้นตอนไม่ยุ่งยาก แนะนำเลยครับ",
    product: {
      model: "iPhone 15 Pro Max",
      storage: "256GB",
      color: "Natural Titanium",
      price: "฿32,000",
      image: "/product-iphone.webp",
    },
    soldDate: "20 พ.ค. 2569",
  },
  {
    name: "คุณอาร์ม",
    initials: "อม",
    rating: 5,
    date: "19 พ.ค. 2569",
    text: "บริการดีมากครับ รับถึงที่ สะดวกมาก โทรมานัดแป๊บเดียวมาถึงเลย ประทับใจครับ",
    product: {
      model: "iPhone 14 Pro",
      storage: "128GB",
      color: "Deep Purple",
      price: "฿24,500",
      image: "/product-iphone.webp",
    },
    soldDate: "19 พ.ค. 2569",
  },
  {
    name: "คุณปอ",
    initials: "ปอ",
    rating: 5,
    date: "18 พ.ค. 2569",
    text: "มืออาชีพ เช็กไว จ่ายทันที ประทับใจมากครับ ให้คำแนะนำดีมาก ราคายุติธรรม",
    product: {
      model: "iPhone 13",
      storage: "128GB",
      color: "Midnight",
      price: "฿16,800",
      image: "/product-iphone.webp",
    },
    soldDate: "18 พ.ค. 2569",
  },
];

const TRUST_BADGES = [
  { Icon: ShieldCheck, title: "รีวิวจริง 100%", sub: "จากลูกค้าที่ใช้บริการจริง" },
  { Icon: ThumbsUp,    title: "ให้ราคาสูง",     sub: "จ่ายจริง จบไว" },
  { Icon: Award,       title: "เชื่อถือได้",    sub: "ร้านค้าจดทะเบียนถูกต้อง" },
];

function ReviewCard({ r }: { r: (typeof reviews)[number] }) {
  return (
    <div
      className="flex flex-col rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #222222 100%)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      {/* Avatar + name + date */}
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
            <p className="text-xs" style={{ color: "#6B7280" }}>{r.date}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(212,175,55,0.2)", color: "#D4AF37" }}
          >
            5 ★
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: r.rating }).map((_, i) => (
              <Star key={i} size={14} fill="#D4AF37" color="#D4AF37" />
            ))}
          </div>
        </div>
      </div>

      {/* Review text */}
      <p className="text-sm leading-relaxed mb-4" style={{ color: "#D1D5DB" }}>{r.text}</p>

      {/* Product box */}
      <div
        className="flex items-center gap-3 rounded-xl p-2.5 mb-3"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: "#2a2a2a" }}>
          <img
            src={r.product.image}
            alt={r.product.model}
            className="w-full h-full object-contain p-1"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold leading-snug">{r.product.model}</p>
          <p className="text-xs" style={{ color: "#9CA3AF" }}>{r.product.storage} | {r.product.color}</p>
          <p className="text-xs" style={{ color: "#6B7280" }}>ราคาประเมิน</p>
          <p className="font-bold text-sm" style={{ color: "#D4AF37" }}>{r.product.price}</p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-2.5 mt-auto"
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
    <section style={{ background: "#111111" }} className="py-12 md:py-16 px-4">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-left md:text-center mb-6 md:mb-8">
          <p className="text-white font-bold text-2xl md:text-3xl mb-3">รีวิวจากลูกค้าจริง</p>
          <div className="flex items-baseline gap-3 md:justify-center mb-1">
            <span className="font-bold text-5xl" style={{ color: "#D4AF37" }}>5.0</span>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={24} fill="#D4AF37" color="#D4AF37" />
              ))}
            </div>
          </div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>จาก 1,200+ รีวิว</p>
        </div>

        {/* Trust Badges */}
        <div
          className="flex gap-3 mb-8 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {TRUST_BADGES.map(({ Icon, title, sub }) => (
            <div
              key={title}
              className="flex items-center gap-3 flex-shrink-0 rounded-xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <Icon size={18} color="#D4AF37" />
              <div>
                <p className="text-white text-xs font-semibold leading-snug">{title}</p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {reviews.map(r => (
            <ReviewCard key={r.name} r={r} />
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
