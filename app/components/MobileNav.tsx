"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { House, List, Search, MessageCircle, DollarSign } from "lucide-react";

export default function MobileNav() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const update = () => {
      const h = Math.max(
        0,
        window.innerHeight - window.visualViewport!.offsetTop - window.visualViewport!.height,
      );
      document.documentElement.style.setProperty("--browser-bar-h", `${h}px`);
    };
    update();
    window.visualViewport!.addEventListener("resize", update);
    window.visualViewport!.addEventListener("scroll", update);
    return () => {
      window.visualViewport!.removeEventListener("resize", update);
      window.visualViewport!.removeEventListener("scroll", update);
    };
  }, []);

  // Admin has its own BottomTabNav — hide public nav on all admin routes
  if (pathname.startsWith("/admin")) return null;

  const isSell = pathname === "/sell" || pathname.startsWith("/sell/") || pathname.startsWith("/estimate/");
  const isTradeIn = pathname === "/trade-in";
  const isHome = pathname === "/";
  const isContact = pathname === "/contact";
  const isTrack = pathname === "/track" || pathname.startsWith("/request/");

  function tabColor(active: boolean) {
    return active ? "#B8860B" : undefined;
  }
  function tabClass(active: boolean) {
    return active ? "text-xs font-medium" : "text-xs text-gray-500";
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
      }}
    >
      <div className="flex items-end h-16">
        <a href="/" className="flex-1 flex flex-col items-center justify-end pb-2 gap-0.5">
          <House size={20} style={{ color: tabColor(isHome) }} className={!isHome ? "text-gray-500" : ""} />
          <span className={tabClass(isHome)} style={isHome ? { color: "#B8860B" } : undefined}>หน้าแรก</span>
        </a>
        <a href="/trade-in" className="flex-1 flex flex-col items-center justify-end pb-2 gap-0.5">
          <List size={20} style={{ color: tabColor(isTradeIn) }} className={!isTradeIn ? "text-gray-500" : ""} />
          <span className={tabClass(isTradeIn)} style={isTradeIn ? { color: "#B8860B" } : undefined}>รายการรับซื้อ</span>
        </a>
        <a href="/sell" className="flex-1 flex flex-col items-center justify-end pb-1 gap-0.5">
          <div
            className="w-14 h-14 rounded-full bg-black flex items-center justify-center"
            style={{ marginTop: "-24px", boxShadow: "0 4px 16px rgba(0,0,0,0.35)" }}
          >
            <DollarSign size={26} style={{ color: "#B8860B" }} />
          </div>
          <span className={tabClass(isSell)} style={isSell ? { color: "#B8860B" } : undefined}>ประเมินราคา</span>
        </a>
        <a href="/track" className="flex-1 flex flex-col items-center justify-end pb-2 gap-0.5">
          <Search size={20} style={{ color: tabColor(isTrack) }} className={!isTrack ? "text-gray-500" : ""} />
          <span className={tabClass(isTrack)} style={isTrack ? { color: "#B8860B" } : undefined}>ติดตามสถานะ</span>
        </a>
        <a href="/contact" className="flex-1 flex flex-col items-center justify-end pb-2 gap-0.5">
          <MessageCircle size={20} style={{ color: tabColor(isContact) }} className={!isContact ? "text-gray-500" : ""} />
          <span className={tabClass(isContact)} style={isContact ? { color: "#B8860B" } : undefined}>ติดต่อเรา</span>
        </a>
      </div>
    </nav>
  );
}
