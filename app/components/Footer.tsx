import { Phone, MessageCircle, Clock, MapPin } from "lucide-react";
import CookieReopenButton from "./CookieReopenButton";

const serviceLinks = [
  { label: "หน้าหลัก",      href: "/"         },
  { label: "ประเมินราคา",   href: "/sell"      },
  { label: "รายการรับซื้อ", href: "/trade-in"  },
  { label: "วิธีการขาย",   href: "/#how-to"   },
  { label: "รีวิวลูกค้า",   href: "/reviews"   },
  { label: "บทความ",        href: "/blog"      },
];

const helpLinks = [
  { label: "คำถามที่พบบ่อย",       href: "/#faq"    },
  { label: "เงื่อนไขการรับซื้อ",    href: "/terms"   },
  { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
  { label: "ติดต่อเรา",             href: "/contact" },
];

const contactItems = [
  { Icon: Phone,         label: "095-553-5167",         href: "tel:0955535167"                   },
  { Icon: MessageCircle, label: "LINE: @khaiphone",      href: "https://line.me/R/ti/p/@khaiphone" },
  { Icon: Clock,         label: "เปิดทุกวัน 09:00 – 00:00", href: null                           },
  { Icon: MapPin,        label: "รังสิต ปทุมธานี",       href: null                               },
];

const bottomLinks = [
  { label: "นโยบายความเป็นส่วนตัว", href: "/privacy" },
  { label: "เงื่อนไขการให้บริการ",  href: "/terms"   },
];

export default function Footer() {
  return (
    <footer style={{ background: "#111" }}>
      <div className="max-w-6xl mx-auto px-4 pt-14 pb-8">

        {/* 4-column grid */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 pb-14"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Column 1 — Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo-icon.webp" alt="ขายไอโฟน.com" className="w-9 h-9 object-contain" />
              <div>
                <p className="font-bold text-white text-sm leading-snug">ขายไอโฟน.com</p>
                <p className="text-xs leading-snug" style={{ color: "#6B7280" }}>รับซื้อ Apple มือสอง</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "#6B7280" }}>
              ให้ราคาสูง จ่ายเงินสดทันที<br />
              บริการรับถึงที่ทั่ว กทม.
            </p>
            <div className="flex items-center gap-2 text-xs" style={{ color: "#6B7280" }}>
              <Clock size={12} style={{ flexShrink: 0 }} />
              <span>เปิดทุกวัน 09:00 – 00:00</span>
            </div>
          </div>

          {/* Column 2 — บริการ */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#9CA3AF" }}>
              บริการ
            </p>
            <ul className="flex flex-col gap-3.5">
              {serviceLinks.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#718096", lineHeight: 1.75 }}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — ช่วยเหลือ */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#9CA3AF" }}>
              ช่วยเหลือ
            </p>
            <ul className="flex flex-col gap-3.5">
              {helpLinks.map(({ label, href }) => (
                <li key={label}>
                  <a href={href} className="text-sm transition-colors hover:text-white" style={{ color: "#718096", lineHeight: 1.75 }}>
                    {label}
                  </a>
                </li>
              ))}
              <li>
                <span className="text-sm transition-colors hover:text-white" style={{ color: "#718096", lineHeight: 1.75 }}>
                  <CookieReopenButton />
                </span>
              </li>
            </ul>
          </div>

          {/* Column 4 — ติดต่อเรา */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: "#9CA3AF" }}>
              ติดต่อเรา
            </p>
            <ul className="flex flex-col gap-4">
              {contactItems.map(({ Icon, label, href }) => (
                <li key={label}>
                  {href ? (
                    <a
                      href={href}
                      className="flex items-center gap-2.5 text-sm transition-colors hover:text-white"
                      style={{ color: "#718096", lineHeight: 1.75 }}
                    >
                      <Icon size={13} style={{ flexShrink: 0 }} />
                      {label}
                    </a>
                  ) : (
                    <span className="flex items-center gap-2.5 text-sm" style={{ color: "#718096", lineHeight: 1.75 }}>
                      <Icon size={13} style={{ flexShrink: 0 }} />
                      {label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "#4B5563" }}>
            © 2025 ขายไอโฟน.com สงวนลิขสิทธิ์
          </p>
          <div className="flex items-center gap-5">
            {bottomLinks.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-xs transition-colors hover:text-white"
                style={{ color: "#4B5563" }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  );
}
