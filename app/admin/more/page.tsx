"use client";

import { unsubscribeDeviceFromPush } from "@/lib/push-client";
import { useRouter } from "next/navigation";
import {
  Users, CreditCard, BarChart2, Settings,
  UserCircle, LogOut, ChevronRight, ArrowLeft, SlidersHorizontal, UsersRound,
  Package, BookOpen, FileText,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminRole } from "@/app/admin/role-context";
import { useAdminTheme } from "@/lib/admin-theme";

const BG     = "var(--admin-bg)";
const CARD   = "var(--admin-card)";
const BORDER = "var(--admin-border)";
const TEXT   = "var(--admin-text)";
const TEXT2  = "var(--admin-text2)";
const TEXT3  = "var(--admin-text3)";
const GOLD   = "var(--admin-gold)";

export default function MorePage() {
  const router = useRouter();
  const { role } = useAdminRole();
  const { dark } = useAdminTheme();

  const OWNER_ITEMS = [
    { icon: SlidersHorizontal, label: "ตั้งค่าราคา",  sub: "ราคารุ่น, ค่าหักมาตรฐาน",  href: "/admin/price-settings", color: dark ? "#D4A843" : "#B8860B" },
    { icon: Package,           label: "สต็อคเครื่อง", sub: "สถานะและราคาขายออก",         href: "/admin/stock",          color: "#0EA5E9" },
    { icon: BookOpen,          label: "บัญชี",         sub: "กำไร / ขาดทุน ต่อเครื่อง",  href: "/admin/accounting",     color: "#10B981" },
    { icon: Users,             label: "ลูกค้า",        sub: "จัดการข้อมูลลูกค้า",        href: "/admin/customers",      color: "#3B82F6" },
    { icon: CreditCard,        label: "การชำระเงิน",   sub: "ประวัติการจ่ายเงิน",         href: "/admin/payments",       color: "#8B5CF6" },
    { icon: BarChart2,         label: "รายงาน",        sub: "สถิติและสรุปผล",            href: "/admin/reports",        color: "#F97316" },
    { icon: FileText,          label: "บทความ",        sub: "เขียน / อนุมัติบทความ blog", href: "/admin/articles",       color: "#EC4899" },
    { icon: Settings,          label: "ตั้งค่า",       sub: "การตั้งค่าระบบ",             href: "/admin/settings",       color: "#6B7280" },
    { icon: UsersRound,        label: "จัดการทีม",     sub: "เพิ่ม / จัดการพนักงาน",      href: "/admin/staff",          color: "#06B6D4" },
  ];

  const COMMON_ITEMS = [
    { icon: UserCircle, label: "บัญชีผู้ใช้", sub: "ข้อมูลของฉัน", href: "/admin/profile", color: "#6B7280" },
  ];

  const items = role === "owner" ? [...OWNER_ITEMS, ...COMMON_ITEMS] : COMMON_ITEMS;

  async function handleLogout() {
    await unsubscribeDeviceFromPush(); // ถอน push ของเครื่องก่อน (ต้องใช้ session)
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <div style={{ padding: "12px 16px 16px", paddingTop: "calc(env(safe-area-inset-top) + 12px)", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", color: TEXT2, cursor: "pointer", padding: 4, display: "flex" }}>
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 style={{ color: TEXT, fontSize: "18px", fontWeight: 700, margin: 0 }}>เพิ่มเติม</h1>
            {role && (
              <p style={{ color: TEXT3, fontSize: 11, margin: "2px 0 0" }}>
                {role === "owner" ? "เจ้าของ / ผู้จัดการ" : "พนักงาน"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: "16px" }}>
        <div style={{ background: CARD, borderRadius: "16px", overflow: "hidden", marginBottom: "12px", border: `1px solid ${BORDER}` }}>
          {items.map(({ icon: Icon, label, sub, href, color }, i) => (
            <button
              key={href}
              onClick={() => router.push(href)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "14px",
                padding: "14px 16px", background: "transparent", border: "none",
                borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : "none",
                cursor: "pointer", touchAction: "manipulation", textAlign: "left", fontFamily: "inherit",
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: "12px", background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={20} color={color} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: TEXT, fontSize: "15px", fontWeight: 500, margin: 0 }}>{label}</p>
                <p style={{ color: TEXT2, fontSize: "12px", margin: "2px 0 0" }}>{sub}</p>
              </div>
              <ChevronRight size={16} color={TEXT3} />
            </button>
          ))}
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "14px",
            padding: "14px 16px", background: CARD,
            border: "1px solid rgba(239,68,68,0.25)", borderRadius: "16px",
            cursor: "pointer", touchAction: "manipulation", fontFamily: "inherit",
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: "12px", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LogOut size={20} color="#EF4444" />
          </div>
          <div style={{ flex: 1, textAlign: "left" }}>
            <p style={{ color: "#EF4444", fontSize: "15px", fontWeight: 600, margin: 0 }}>ออกจากระบบ</p>
          </div>
          <ChevronRight size={16} color={TEXT3} />
        </button>

        <p style={{ color: TEXT3, fontSize: "12px", textAlign: "center", marginTop: "24px" }}>
          Khaiphone.com Admin v1.0.0
        </p>
      </div>
    </div>
  );
}
