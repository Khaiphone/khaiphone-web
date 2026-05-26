import Link from "next/link";
import Image from "next/image";
import { Home, ShoppingBag, HelpCircle, Phone, ArrowRight } from "lucide-react";
import { fetchPublicActiveProducts } from "@/app/actions/products";
import NotFoundSearch from "@/app/components/NotFoundSearch";

function toSlug(model: string) {
  return model.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function IconLine({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
    </svg>
  );
}

const QUICK_LINKS = [
  { href: "/sell",         icon: ShoppingBag, label: "รายการรับซื้อ" },
  { href: "/how-to-sell",  icon: HelpCircle,  label: "วิธีการขาย"    },
  { href: "/contact",      icon: Phone,       label: "ติดต่อเรา"     },
  { href: "https://line.me/R/ti/p/@khaiphone", icon: IconLine, label: "LINE OA", external: true },
];

export default async function NotFound() {
  const allProds = await fetchPublicActiveProducts();
  const seenModels = new Set<string>();
  const searchProducts = allProds
    .filter(p => {
      if (seenModels.has(p.model)) return false;
      seenModels.add(p.model);
      return true;
    })
    .map(p => ({
      model: p.model,
      priceGood: p.price_good,
      slug: toSlug(p.model),
    }));

  return (
    <div style={{ minHeight: "100vh", background: "#F9F9F7", display: "flex", flexDirection: "column" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E5E5E5", padding: "16px 20px" }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Image src="/logo-icon.webp" alt="logo" width={36} height={36} style={{ borderRadius: 8 }} />
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#111" }}>ขายไอโฟน.com</p>
            <p style={{ margin: 0, fontSize: 11, color: "#B8860B" }}>รับซื้อ Apple ให้ราคาสูง</p>
          </div>
        </Link>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 480, textAlign: "center" }}>

          {/* Illustration */}
          <div style={{ marginBottom: 28 }}>
            <div style={{
              width: 120, height: 120, borderRadius: 32, margin: "0 auto",
              background: "linear-gradient(135deg, #111 0%, #2a2a2a 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 32px rgba(184,134,11,0.2), 0 2px 8px rgba(0,0,0,0.15)",
              position: "relative",
            }}>
              <span style={{ fontSize: 52 }}>📦</span>
              <div style={{
                position: "absolute", top: -6, right: -6,
                width: 28, height: 28, borderRadius: "50%",
                background: "#B8860B", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: "#fff",
              }}>?</div>
            </div>
          </div>

          {/* Text */}
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: "0 0 10px", lineHeight: 1.3 }}>
            ไม่พบหน้าที่คุณกำลังค้นหา
          </h1>
          <p style={{ fontSize: 14, color: "#6B7280", margin: "0 0 32px", lineHeight: 1.7 }}>
            ลิงก์อาจถูกย้าย หรือพิมพ์ผิด<br />
            ลองกลับไปประเมินราคาหรือดูรายการรับซื้อของเรา
          </p>

          {/* Search bar */}
          <div style={{ marginBottom: 24 }}>
            <NotFoundSearch products={searchProducts} />
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            <Link
              href="/sell"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "#111", color: "#fff", textDecoration: "none",
                borderRadius: 14, padding: "14px 24px", fontSize: 15, fontWeight: 700,
              }}
            >
              ประเมินราคาฟรี <ArrowRight size={16} />
            </Link>
            <Link
              href="/"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                background: "#fff", color: "#374151", textDecoration: "none",
                borderRadius: 14, padding: "14px 24px", fontSize: 14, fontWeight: 600,
                border: "1.5px solid #E5E5E5",
              }}
            >
              <Home size={16} /> กลับหน้าแรก
            </Link>
          </div>

          {/* Quick links */}
          <div style={{ borderTop: "1px solid #E5E5E5", paddingTop: 24 }}>
            <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              ลิงก์ด่วน
            </p>
            <div style={{ display: "flex", flexWrap: "nowrap", gap: 6, justifyContent: "center", overflowX: "auto" }}>
              {QUICK_LINKS.map(({ href, icon: Icon, label, external }) => {
                const isLine = href.includes("line.me");
                const style: React.CSSProperties = {
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 12px", borderRadius: 99, flexShrink: 0,
                  background: "#fff", border: "1px solid #E5E5E5",
                  fontSize: 12, fontWeight: 500, color: "#374151",
                  textDecoration: "none", whiteSpace: "nowrap",
                };
                const content = <><Icon size={13} style={{ color: isLine ? "#06C755" : "#B8860B" }} />{label}</>;
                return external ? (
                  <a key={href} href={href} target="_blank" rel="noopener noreferrer" style={style}>{content}</a>
                ) : (
                  <Link key={href} href={href} style={style}>{content}</Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Footer note */}
      <div style={{ textAlign: "center", padding: "16px", borderTop: "1px solid #E5E5E5", background: "#fff" }}>
        <p style={{ margin: 0, fontSize: 12, color: "#6B7280" }}>
          © {new Date().getFullYear()} ขายไอโฟน.com — รับซื้อ Apple ให้ราคาสูง จ่ายเงินสดทันที
        </p>
      </div>

    </div>
  );
}
