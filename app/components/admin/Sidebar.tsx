"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Clock,
  Search,
  CalendarCheck,
  CheckCircle,
  XCircle,
  Users,
  Calendar,
  CreditCard,
  BarChart2,
  MessageCircle,
  Settings,
  UserCog,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

const mainNavItems: NavItem[] = [
  { href: "/admin/dashboard", icon: <LayoutDashboard size={18} />, label: "ภาพรวม" },
  { href: "/admin/requests", icon: <Inbox size={18} />, label: "คำขอทั้งหมด" },
  { href: "/admin/requests?status=new", icon: <FileText size={18} />, label: "คำขอใหม่", badge: 12 },
  { href: "/admin/requests?status=pending", icon: <Clock size={18} />, label: "รอดำเนินการ", badge: 8 },
  { href: "/admin/requests?status=inspecting", icon: <Search size={18} />, label: "กำลังตรวจสอบ", badge: 15 },
  { href: "/admin/requests?status=scheduled", icon: <CalendarCheck size={18} />, label: "นัดรับเครื่อง", badge: 10 },
  { href: "/admin/requests?status=paid", icon: <CheckCircle size={18} />, label: "รับเงินแล้ว", badge: 23 },
  { href: "/admin/requests?status=cancelled", icon: <XCircle size={18} />, label: "ยกเลิก", badge: 3 },
];

const secondaryNavItems: NavItem[] = [
  { href: "/admin/customers", icon: <Users size={18} />, label: "ลูกค้า" },
  { href: "/admin/appointments", icon: <Calendar size={18} />, label: "นัดหมาย" },
  { href: "/admin/payments", icon: <CreditCard size={18} />, label: "การชำระเงิน" },
  { href: "/admin/reports", icon: <BarChart2 size={18} />, label: "รายงาน" },
  { href: "/admin/chat", icon: <MessageCircle size={18} />, label: "แชทลูกค้า" },
  { href: "/admin/settings", icon: <Settings size={18} />, label: "ตั้งค่า" },
  { href: "/admin/users", icon: <UserCog size={18} />, label: "ผู้ใช้งาน" },
];

function NavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <Link
      href={item.href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        borderRadius: "8px",
        textDecoration: "none",
        transition: "all 0.15s",
        backgroundColor: isActive ? "#B8860B" : "transparent",
        color: isActive ? "#ffffff" : "rgba(255,255,255,0.7)",
        fontSize: "13px",
        fontWeight: isActive ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)";
        }
      }}
    >
      <span style={{ flexShrink: 0 }}>{item.icon}</span>
      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {item.label}
      </span>
      {item.badge !== undefined && (
        <span
          style={{
            backgroundColor: "rgba(255,255,255,0.15)",
            color: "#ffffff",
            borderRadius: "9999px",
            padding: "1px 7px",
            fontSize: "11px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string): boolean {
    const hrefPath = href.split("?")[0];
    if (href.includes("?")) {
      return pathname === hrefPath;
    }
    if (hrefPath === "/admin/dashboard") {
      return pathname === "/admin/dashboard";
    }
    return pathname.startsWith(hrefPath);
  }

  const sidebarContent = (
    <div
      style={{
        width: "216px",
        minWidth: "216px",
        backgroundColor: "#111111",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Image
            src="/logo-icon.webp"
            alt="ขายไอโฟน"
            width={32}
            height={32}
            style={{ borderRadius: "6px" }}
          />
          <div>
            <p style={{ color: "#ffffff", fontSize: "13px", fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
              ขายไอโฟน.com
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "10px", margin: 0, lineHeight: 1.3 }}>
              Admin Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {mainNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
          ))}
        </div>

        <div
          style={{
            height: "1px",
            backgroundColor: "rgba(255,255,255,0.06)",
            margin: "12px 4px",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {secondaryNavItems.map((item) => (
            <NavLink key={item.href} item={item} isActive={isActive(item.href)} />
          ))}
        </div>
      </div>

      {/* User Card */}
      <div
        style={{
          padding: "12px 8px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 12px",
            borderRadius: "8px",
            cursor: "pointer",
            backgroundColor: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "#B8860B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            KA
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "#ffffff", fontSize: "12px", fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
              Khai Admin
            </p>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", margin: 0, lineHeight: 1.3 }}>
              Administrator
            </p>
          </div>
          <ChevronDown size={14} color="rgba(255,255,255,0.4)" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex" style={{ flexShrink: 0 }}>
        {sidebarContent}
      </div>

      {/* Mobile toggle button */}
      <button
        className="md:hidden"
        onClick={() => setMobileOpen(true)}
        style={{
          position: "fixed",
          top: "16px",
          left: "16px",
          zIndex: 50,
          backgroundColor: "#111111",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "8px",
          color: "#ffffff",
          cursor: "pointer",
        }}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
            }}
            onClick={() => setMobileOpen(false)}
          />
          <div style={{ position: "relative", zIndex: 50 }}>
            {sidebarContent}
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            style={{
              position: "absolute",
              top: "16px",
              left: "232px",
              backgroundColor: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              zIndex: 50,
            }}
          >
            <X size={24} />
          </button>
        </div>
      )}
    </>
  );
}
