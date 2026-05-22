"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Phone, Menu, X, ChevronDown } from "lucide-react";

type IconProps = { className?: string; style?: React.CSSProperties };

function IconClock({ className, style }: IconProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.629 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

const SELL_CATEGORIES = [
  { name: "iPhone",      sub: "ทุกรุ่น ตั้งแต่ 11–17",  img: "/product-iphone.webp", href: "/sell?category=iphone" },
  { name: "iPad",        sub: "iPad Air, Pro, mini",      img: "/product-ipad.webp",    href: "/sell?category=ipad"   },
  { name: "MacBook",     sub: "Air และ Pro ทุกรุ่น",      img: "/product-macbook.webp", href: "/sell?category=macbook"},
  { name: "Apple Watch", sub: "SE, Series, Ultra",         img: "/product-watch.webp",   href: "/sell?category=watch"  },
];

const navLinks = [
  { label: "หน้าแรก",         href: "/"          },
  { label: "รายการรับซื้อ",   href: "/trade-in"  },
  { label: "วิธีการขาย",      href: "/how-to-sell" },
  { label: "ติดตามสถานะ",     href: "/track"     },
  { label: "คำถามที่พบบ่อย",  href: "/faq"       },
  { label: "ติดต่อเรา",       href: "/contact"   },
];

export default function Header() {
  const pathname = usePathname();
  const [orderUrl, setOrderUrl] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openDropdown() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setDropdownOpen(true);
  }
  function closeDropdown() {
    closeTimer.current = setTimeout(() => setDropdownOpen(false), 120);
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("khaiphone_submission");
      if (!raw) return;
      const { orderNumber, customer } = JSON.parse(raw);
      if (!orderNumber || !customer?.phone) return;
      const phone = customer.phone.replace(/[-\s]/g, "");
      setOrderNo(orderNumber);
      setOrderUrl(`/request/${orderNumber}?phone=${encodeURIComponent(phone)}`);
    } catch {}
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Checkbox — controls mobile menu open/close state, no JS needed */}
      <input type="checkbox" id="menu-toggle" className="sr-only peer" />

      {/* Top Bar */}
      <div className="hidden md:block bg-gray-900 text-white text-sm py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex flex-wrap gap-5 items-center">
            {["รับซื้อถึงที่ทั่วไทย", "จ่ายเงินสดทันที", "ให้ราคาสูง เป็นธรรม"].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <IconClock className="w-3.5 h-3.5" style={{ color: "#B8860B" }} />
                {t}
              </span>
            ))}
          </div>
          <div className="flex gap-4 items-center text-gray-300">
            <span>📞 095-553-5167</span>
            <span>💬 @khaiphone</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-0">
            <Image src="/logo-icon.webp" alt="ขายไอโฟน.com" width={40} height={40} className="flex-shrink-0 md:mr-1 rounded-lg" style={{ width: 40, height: 40 }} />
            <div>
              <div className="font-bold text-lg leading-none text-black">ขายไอโฟน.com</div>
              <div className="text-xs text-gray-400">รับซื้อ-ขาย Apple มือสอง</div>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="transition-colors"
                style={{ color: isActive(href) && href !== "#" ? "#B8860B" : "#4B5563" }}
                onMouseEnter={e => { if (!isActive(href)) (e.target as HTMLElement).style.color = "#111"; }}
                onMouseLeave={e => { if (!isActive(href)) (e.target as HTMLElement).style.color = "#4B5563"; }}
              >
                {label}
              </a>
            ))}
            {orderUrl && (
              <a
                href={orderUrl}
                className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full"
                style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B", border: "1px solid rgba(184,134,11,0.25)" }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B8860B", flexShrink: 0, animation: "pulse 2s infinite" }} />
                ดูสถานะ #{orderNo}
              </a>
            )}

            {/* Dropdown trigger */}
            <div className="relative" onMouseEnter={openDropdown} onMouseLeave={closeDropdown}>
              <a
                href="/sell"
                className="flex items-center gap-1 bg-black text-white font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-gray-800 transition-colors"
              >
                ประเมินราคาฟรี
                <ChevronDown size={14} style={{ transition: "transform 200ms", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </a>

              {/* Dropdown panel */}
              {dropdownOpen && (
                <div
                  className="absolute right-0 top-full pt-2 z-50"
                  style={{ minWidth: 380 }}
                  onMouseEnter={openDropdown}
                  onMouseLeave={closeDropdown}
                >
                  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-3 grid grid-cols-2 gap-2">
                    {SELL_CATEGORIES.map(cat => (
                      <a
                        key={cat.name}
                        href={cat.href}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group"
                        style={{ textDecoration: "none" }}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors">
                          <Image src={cat.img} alt={cat.name} width={32} height={32} className="object-contain" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-black leading-tight">{cat.name}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{cat.sub}</p>
                        </div>
                      </a>
                    ))}
                    <div className="col-span-2 pt-1 mt-1 border-t border-gray-100">
                      <a href="/sell" className="flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl hover:bg-gray-50 transition-colors" style={{ color: "#B8860B", textDecoration: "none" }}>
                        ดูทั้งหมด →
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile Buttons */}
          <div className="md:hidden flex items-center gap-2">
            <a href="tel:0955535167" className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50">
              <Phone size={16} className="text-black" />
            </a>
            <label
              htmlFor="menu-toggle"
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center cursor-pointer"
            >
              <Menu size={16} className="text-black" style={{ pointerEvents: "none" }} />
            </label>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay — shown when checkbox is checked */}
      <div className="fixed inset-0 z-[60] hidden peer-checked:block md:hidden">
        {/* Backdrop — clicking unchecks the checkbox */}
        <label htmlFor="menu-toggle" className="absolute inset-0 bg-black/50 block cursor-pointer" />

        {/* Drawer */}
        <div className="absolute right-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl">
          {/* Drawer header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-0">
              <Image src="/logo-icon.webp" alt="ขายไอโฟน.com" width={40} height={40} className="flex-shrink-0 rounded-lg" style={{ width: 40, height: 40 }} />
              <div>
                <div className="font-bold text-base leading-none text-black">ขายไอโฟน.com</div>
                <div className="text-xs text-gray-400">รับซื้อ-ขาย Apple มือสอง</div>
              </div>
            </div>
            <label htmlFor="menu-toggle" className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center cursor-pointer">
              <X size={15} className="text-black" style={{ pointerEvents: "none" }} />
            </label>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="flex items-center px-3 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: isActive(href) && href !== "#" ? "rgba(184,134,11,0.08)" : "transparent",
                  color: isActive(href) && href !== "#" ? "#B8860B" : "#111",
                }}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Bottom CTAs */}
          <div className="px-4 pb-8 pt-3 border-t border-gray-100 flex flex-col gap-3">
            {orderUrl && (
              <a
                href={orderUrl}
                className="flex items-center justify-center gap-2 font-semibold py-3 rounded-full text-sm"
                style={{ background: "rgba(184,134,11,0.1)", color: "#B8860B", border: "1px solid rgba(184,134,11,0.3)" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B8860B", flexShrink: 0 }} />
                ดูสถานะคำขอ #{orderNo}
              </a>
            )}
            <a
              href="/sell"
              className="flex items-center justify-center font-bold py-3.5 rounded-full text-white text-sm"
              style={{ background: "#111" }}
            >
              ประเมินราคาฟรี →
            </a>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="tel:0955535167"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-gray-200 text-xs font-semibold text-black"
              >
                <Phone size={13} /> โทรหาเรา
              </a>
              <a
                href="https://line.me/R/ti/p/@khaiphone"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-white text-xs font-semibold"
                style={{ background: "#06C755" }}
              >
                <IconLine className="w-3.5 h-3.5" /> LINE
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
