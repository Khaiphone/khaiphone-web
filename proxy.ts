import { NextRequest, NextResponse } from "next/server";

// ── Rate limiting ─────────────────────────────────────────────────────────────
const store = new Map<string, number[]>();
const WINDOW_MS    = 60_000;
const MAX_REQUESTS = 30;

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now        = Date.now();
  const timestamps = (store.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  timestamps.push(now);
  store.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

// ── Subdomain → internal path map ────────────────────────────────────────────
const SUBDOMAIN_MAP: Record<string, string> = {
  admin:   "/admin",
  finance: "/finance",
  stock:   "/stock",
};

export function proxy(req: NextRequest) {
  const host     = req.headers.get("host") ?? "";
  const { pathname } = req.nextUrl;
  const isDev    = process.env.NODE_ENV === "development";

  // ── admin.khaiphone.com/* → rewrite to /admin/* ───────────────────
  const parts    = host.split(".");
  const subdomain = parts.length >= 3 ? parts[0] : null;

  if (subdomain && subdomain in SUBDOMAIN_MAP) {
    const base = SUBDOMAIN_MAP[subdomain];
    // Pass through if path already starts with any known base (e.g. /admin/login after auth redirect)
    const alreadyRouted = Object.values(SUBDOMAIN_MAP).some(b => pathname.startsWith(b));
    if (alreadyRouted) return NextResponse.next();
    // Redirect "/" so the browser URL actually changes — keeps usePathname() correct
    // and prevents the public MobileNav from flashing before the admin layout renders
    if (pathname === "/") {
      const home = subdomain === "admin" ? `${base}/dashboard` : base;
      return NextResponse.redirect(new URL(home, req.url));
    }
    const newPathname = `${base}${pathname}`;
    return NextResponse.rewrite(new URL(newPathname + req.nextUrl.search, req.url));
  }

  // ── khaiphone.com/admin → redirect to admin.khaiphone.com ────────
  if (!isDev) {
    for (const [sub, base] of Object.entries(SUBDOMAIN_MAP)) {
      if (pathname === base || pathname.startsWith(`${base}/`)) {
        const url      = req.nextUrl.clone();
        url.host       = `${sub}.${host.replace(/^www\./, "")}`;
        url.pathname   = pathname.slice(base.length) || "/";
        return NextResponse.redirect(url, 301);
      }
    }
  }

  // ── Rate limit POST requests ──────────────────────────────────────
  if (req.method === "POST") {
    const ip = getIp(req);
    if (isRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|.*\\.\\w+$).*)"],
};
