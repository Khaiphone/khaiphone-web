"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Target, Megaphone, Wallet, Boxes, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import AppSplash from "@/app/components/AppSplash";

const GOLD = "#B8860B";
const NAV = [
  { href: "/ceo",           label: "ภาพรวม",     icon: LayoutDashboard },
  { href: "/ceo/goals",     label: "เป้าหมาย",    icon: Target },
  { href: "/ceo/ads",       label: "โฆษณา",       icon: Megaphone },
  { href: "/ceo/capital",   label: "เงินทุน",      icon: Wallet },
  { href: "/ceo/inventory", label: "สต็อก",        icon: Boxes },
  { href: "/ceo/growth",    label: "การเติบโต",    icon: TrendingUp },
  { href: "/ceo/settings",  label: "ตั้งค่า",       icon: Settings },
];

export default function CeoLayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session) { router.replace("/admin/login"); return; }
      const profile = await fetchMyProfile(session.user.id);
      if (cancelled) return;
      // CEO = owner เท่านั้น
      if (profile?.role !== "owner") {
        const host = window.location.host;
        const adminHost = host.replace(/^ceo\./, "admin.");
        window.location.href = `${window.location.protocol}//${adminHost}/admin/dashboard`;
        return;
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = "/ceo-manifest.json";
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  if (!ready) return <AppSplash logo="/icon-192.png" name="KP CEO" accent={GOLD} bg="#F5F5F7" light />;

  return (
    <div style={{ minHeight: "100dvh", background: "#F4F5F7", color: "#111", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex" }}>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex" style={{ width: 232, flexShrink: 0, flexDirection: "column", background: "#16161A", color: "#fff", position: "sticky", top: 0, height: "100dvh" }}>
        <div style={{ padding: "22px 22px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-192.png" alt="KP" width={34} height={34} style={{ borderRadius: 9 }} />
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: 0.3 }}>KHAIPHONE</p>
              <p style={{ margin: 0, fontSize: 11, color: GOLD, fontWeight: 600 }}>Mission Control</p>
            </div>
          </div>
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px" }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, textDecoration: "none",
                  background: active ? "rgba(184,134,11,0.18)" : "transparent",
                  color: active ? GOLD : "rgba(255,255,255,0.7)", fontWeight: active ? 700 : 500, fontSize: 13.5 }}>
                <Icon size={17} /> {label}
              </Link>
            );
          })}
        </nav>
        <div style={{ marginTop: "auto", padding: 16, fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>ดูอย่างเดียว · ข้อมูลจาก Finance / Stock / Requests</div>
      </aside>

      {/* Mobile top nav */}
      <div className="md:hidden" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 30, background: "#16161A", display: "flex", gap: 4, overflowX: "auto", padding: "10px 12px", paddingTop: "calc(env(safe-area-inset-top) + 10px)" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap",
                background: active ? "rgba(184,134,11,0.18)" : "rgba(255,255,255,0.05)",
                color: active ? GOLD : "rgba(255,255,255,0.7)", fontWeight: active ? 700 : 500, fontSize: 12.5 }}>
              <Icon size={14} /> {label}
            </Link>
          );
        })}
      </div>

      <main style={{ flex: 1, minWidth: 0, padding: "24px", paddingTop: "calc(env(safe-area-inset-top) + 64px)" }} className="md:!pt-6">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
      </main>
    </div>
  );
}
