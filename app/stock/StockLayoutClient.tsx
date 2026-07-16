"use client";

import EnablePushBanner from "@/app/components/EnablePushBanner";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchMyProfile } from "@/app/actions/admin-users";
import type { AdminRole } from "@/app/actions/admin-users";
import type { Permission } from "@/lib/admin-permissions";
import { StockThemeProvider, useThemeColors } from "@/components/stock/ThemeContext";
import StockSidebar from "@/components/stock/Sidebar";
import MobileBottomNav from "@/components/stock/MobileBottomNav";
import { MobileMenuProvider, useMobileMenu } from "@/components/stock/MobileMenuContext";
import { StockRoleProvider } from "./role-context";
import { StockNavReadyContext } from "./nav-ready-context";
import { shouldRedirect } from "@/lib/route-guard";
import AppSplash from "@/app/components/AppSplash";

function StockLayoutInner({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  const { isOpen, close } = useMobileMenu();
  const pathname = usePathname();

  useEffect(() => { close(); }, [pathname]);

  // status-bar / theme-color ตามธีม (default light) — กัน "ด้านบนดำ" / ตัวเลขขาวอ่านไม่ออก
  useEffect(() => {
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("apple-mobile-web-app-status-bar-style", c.dark ? "black-translucent" : "default");
    setMeta("theme-color", c.dark ? "#050505" : "#F9F9F7");
  }, [c.dark]);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.bg }}>
      {/* Desktop sidebar */}
      <div className="hidden md:block" style={{ width: 240, flexShrink: 0 }}>
        <StockSidebar />
      </div>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div className="md:hidden">
          <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 39 }} />
          <StockSidebar />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }} className="md:ml-0">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
}

export default function StockLayoutClient({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [navReady, setNavReady] = useState(false);
  // default = light; อ่าน synchronous กัน flash (light เว้นแต่เลือก dark ไว้)
  const [splashLight] = useState(() => typeof window === "undefined" || localStorage.getItem("stock-theme") !== "dark");
  const [role, setRole] = useState<AdminRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const latestPathRef = useRef(pathname);
  latestPathRef.current = pathname;

  const markFirstScreenReady = useCallback(() => setNavReady(true), []);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setNavReady(true), 4000); // fallback
    return () => clearTimeout(t);
  }, [ready]);

  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (link) link.href = "/stock-manifest.json";
    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) { appleIcon = document.createElement("link"); appleIcon.rel = "apple-touch-icon"; document.head.appendChild(appleIcon); }
    appleIcon.href = "/stock-apple-touch-icon.png";
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  // Notification tap: SW sends postMessage → router.push keeps history intact
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "NAVIGATE" && typeof e.data.url === "string") router.push(e.data.url);
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    const isLoginPage = pathname === "/stock/login";
    const startPath = pathname;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        if (!isLoginPage && shouldRedirect({ reason: "no-session", from: startPath, current: latestPathRef.current, target: "/stock/login", cancelled, pathnameSensitive: false })) router.replace("/stock/login");
        return;
      }
      if (isLoginPage) { router.replace("/stock/dashboard"); return; }
      const profile = await fetchMyProfile(session.user.id);
      if (cancelled) return;
      const canAccess = profile?.role === "owner" || (profile?.permissions ?? []).includes("view_stock");
      if (!canAccess) {
        const host = window.location.host;
        const adminHost = host.replace(/^stock\./, "admin.");
        window.location.href = `${window.location.protocol}//${adminHost}/admin/dashboard`;
        return;
      }
      if (profile) { setRole(profile.role); setPermissions(profile.permissions); }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [router, pathname]);

  if (pathname === "/stock/login") return <>{children}</>;
  if (!ready) return <AppSplash logo="/splash-icon-stock.png" name="KP Stock" accent="#D4A843" bg={splashLight ? "#F9F9F7" : "#050505"} light={splashLight} />;

  return (
    <StockNavReadyContext.Provider value={{ navReady, markFirstScreenReady }}>
    <StockThemeProvider>
      <StockRoleProvider value={{ role, permissions, canViewFinance: role === "owner" || permissions.includes("view_finance") }}>
        <MobileMenuProvider>
          <EnablePushBanner app="stock" />
          <StockLayoutInner>{children}</StockLayoutInner>
        </MobileMenuProvider>
      </StockRoleProvider>
    </StockThemeProvider>
    {/* ฉากหน้า: คลุมจนข้อมูล dashboard โหลดครบ แล้ว fade */}
    <AppSplash done={navReady} logo="/splash-icon-stock.png" name="KP Stock" accent="#D4A843" bg={splashLight ? "#F9F9F7" : "#050505"} light={splashLight} />
    </StockNavReadyContext.Provider>
  );
}
