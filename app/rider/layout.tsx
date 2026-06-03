"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, Wallet, UserCircle, Bell, Menu } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import { fetchRiderOnlineStatus } from "@/app/actions/rider";

const BG     = "#0B0B0D";
const CARD   = "#1A1A1C";
const BORDER = "#2C2C2E";
const ACCENT = "#4ADE80";
const GREEN  = "#30D158";
const TEXT   = "#F2F2F7";
const TEXT2  = "#8E8E93";

const NAV = [
  { href: "/rider",          label: "หน้าแรก",   icon: Home       },
  { href: "/rider/earnings", label: "รายได้",    icon: Wallet     },
  { href: "/rider/history",  label: "งานของฉัน", icon: Clock      },
  { href: "/rider/account",  label: "โปรไฟล์",   icon: UserCircle },
] as const;

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady]       = useState(false);
  const [riderName, setRiderName] = useState("");
  const [userId, setUserId]     = useState<string>("");
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-status-bar-style", "black");
    setMeta("apple-mobile-web-app-title", "KP Rider");
    setMeta("theme-color", "#0B0B0D");
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/admin/login"); return; }
      const profile = await fetchMyProfile(session.user.id);
      if (!profile || (profile.role !== "owner" && profile.role !== "staff")) {
        router.replace("/admin/login");
        return;
      }
      setRiderName(profile.name ?? "ไรเดอร์");
      setUserId(session.user.id);
      const online = await fetchRiderOnlineStatus(session.user.id);
      setIsOnline(online);
      setReady(true);
    });
  }, [router]);

  // Listen for online status changes from home/account pages
  useEffect(() => {
    const handler = (e: Event) => {
      setIsOnline((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener("rider-online-change", handler);
    return () => window.removeEventListener("rider-online-change", handler);
  }, []);

  if (!ready) return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${BORDER}`, borderTopColor: ACCENT, animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const isJobPage = /^\/rider\/job\//.test(pathname);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      {!isJobPage && (
        <header style={{
          background: CARD, borderBottom: `1px solid ${BORDER}`,
          padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          {/* Left: hamburger placeholder */}
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: TEXT2, display: "flex" }}>
            <Menu size={22} color={TEXT2} />
          </button>

          {/* Center: greeting */}
          <div style={{ textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: 11, color: TEXT2, letterSpacing: 0.5 }}>สวัสดีครับ,</p>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: TEXT }}>{riderName}</p>
          </div>

          {/* Right: online dot + bell */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 9, height: 9, borderRadius: "50%",
              background: isOnline ? GREEN : BORDER,
              boxShadow: isOnline ? `0 0 6px ${GREEN}` : "none",
            }} />
            <Bell size={22} color={TEXT2} />
          </div>
        </header>
      )}

      {/* Content */}
      <main style={{ paddingBottom: isJobPage ? 0 : "calc(64px + env(safe-area-inset-bottom))" }}>
        {children}
      </main>

      {/* Bottom Nav */}
      {!isJobPage && (
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: CARD, borderTop: `1px solid ${BORDER}`,
          display: "flex", paddingBottom: "env(safe-area-inset-bottom)",
          zIndex: 10,
        }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                padding: "10px 0", gap: 3, textDecoration: "none",
                color: active ? ACCENT : TEXT2,
              }}>
                <Icon size={21} strokeWidth={active ? 2.5 : 1.8} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
