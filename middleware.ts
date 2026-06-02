import { NextRequest, NextResponse } from "next/server";

// Map subdomain → internal path prefix
const SUBDOMAIN_MAP: Record<string, string> = {
  admin:   "/admin",
  finance: "/finance",
  stock:   "/stock",
};

export function middleware(request: NextRequest) {
  const host  = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;
  const isDev = process.env.NODE_ENV === "development";

  // Parse subdomain: "admin.khaiphone.com" → "admin"
  const parts = host.split(".");
  const subdomain = parts.length >= 3 ? parts[0] : null;

  // ── admin.khaiphone.com/* → rewrite to /admin/* ───────────────────
  if (subdomain && subdomain in SUBDOMAIN_MAP) {
    const base = SUBDOMAIN_MAP[subdomain];
    const url  = request.nextUrl.clone();
    url.pathname = pathname === "/" ? base : `${base}${pathname}`;
    return NextResponse.rewrite(url);
  }

  // ── khaiphone.com/admin → redirect to admin.khaiphone.com ────────
  // (only in production — dev uses /admin path directly)
  if (!isDev) {
    for (const [sub, base] of Object.entries(SUBDOMAIN_MAP)) {
      if (pathname === base || pathname.startsWith(`${base}/`)) {
        const url      = request.nextUrl.clone();
        const rootHost = host.replace(/^www\./, "");
        url.host       = `${sub}.${rootHost}`;
        url.pathname   = pathname.slice(base.length) || "/";
        return NextResponse.redirect(url, 301);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.\\w+$).*)"],
};
