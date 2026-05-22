"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Smartphone, Truck, Search, Banknote } from "lucide-react";

const howToSteps = [
  { step: "01", Icon: Smartphone, title: "ประเมินราคา",           desc: "กรอกรุ่นและสภาพเครื่อง เพื่อประเมินราคาฟรี ภายใน 5 นาที",     img: "/step-1-estimate.webp" },
  { step: "02", Icon: Truck,      title: "นัดหมาย / ส่งเครื่อง",  desc: "นัดรับถึงที่ หรือส่งพัสดุมาประเมินฟรี สะดวกทุกที่ทั่วไทย", img: "/step-2-pickup.webp"   },
  { step: "03", Icon: Search,     title: "ตรวจเช็ค / ยืนยันราคา", desc: "ตรวจสอบเครื่องจริง และแจ้งราคาสุดท้ายอย่างโปร่งใส",         img: "/step-3-inspect.webp"  },
  { step: "04", Icon: Banknote,   title: "รับเงินทันที",           desc: "รับเงินสด หรือโอนเงินเข้าบัญชีทันที ไม่ต้องรอ",             img: "/step-4-payment.webp"  },
];

export default function HowToSellSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  function handleScroll() {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    setActiveIndex(Math.round(scrollLeft / clientWidth));
  }

  return (
    <section className="py-8 md:py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold text-left md:text-center text-black mb-5 md:mb-10">
          วิธีการขาย ง่ายๆ 4 ขั้นตอน
        </h2>

        {/* Desktop: 4 cards */}
        <div className="hidden md:grid grid-cols-4 gap-4">
          {howToSteps.map(({ step, title, desc, img }) => (
            <div key={step} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
              {img ? (
                <div className="relative h-44 w-full"><Image src={img} alt={title} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 25vw" /></div>
              ) : (
                <div className="h-44 w-full" style={{ background: "#f0f0f0" }} />
              )}
              <div className="p-5">
                <p className="text-xs font-semibold mb-1" style={{ color: "#B8860B" }}>{step}</p>
                <p className="font-bold text-black text-base mb-2">{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: swipe carousel */}
      <div className="md:hidden overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-scroll"
          style={{ scrollbarWidth: "none", scrollSnapType: "x mandatory" }}
        >
          {howToSteps.map(({ step, title, desc, img }) => (
            <div key={step} style={{ minWidth: "100%", flexShrink: 0, scrollSnapAlign: "start", padding: "0 1rem", boxSizing: "border-box" }}>
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                {img ? (
                  <div className="relative h-44 w-full"><Image src={img} alt={title} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 25vw" /></div>
                ) : (
                  <div className="h-44 w-full" style={{ background: "#f0f0f0" }} />
                )}
                <div className="p-5">
                  <p className="text-xs font-semibold mb-1" style={{ color: "#B8860B" }}>{step}</p>
                  <p className="font-bold text-black text-base mb-2">{title}</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#6B7280" }}>{desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {howToSteps.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? "20px" : "8px",
                height: "8px",
                background: i === activeIndex ? "#B8860B" : "#D1D5DB",
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
