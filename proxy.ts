import { NextRequest, NextResponse } from "next/server";

// ── Rate limiting ─────────────────────────────────────────────────────────────
const store = new Map<string, number[]>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(key: string, windowMs: number, max: number): boolean {
  const now        = Date.now();
  const timestamps = (store.get(key) ?? []).filter(t => now - t < windowMs);
  timestamps.push(now);
  store.set(key, timestamps);
  return timestamps.length > max;
}

// ── Subdomain → internal path map ────────────────────────────────────────────
const SUBDOMAIN_MAP: Record<string, string> = {
  admin:   "/admin",
  finance: "/finance",
  stock:   "/stock",
  rider:   "/rider",
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
    // หรือ /print (หน้าเอกสาร global — ห้าม rewrite เข้า section ไม่งั้นกลายเป็น /finance/print → 404)
    const alreadyRouted = Object.values(SUBDOMAIN_MAP).some(b => pathname.startsWith(b)) || pathname.startsWith("/print");
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
    // Stricter limit for track lookup (brute-force protection)
    if (pathname === "/track") {
      if (isRateLimited(`track:${ip}`, 15 * 60_000, 5)) {
        return new NextResponse(
          JSON.stringify({ error: "Too many attempts. Please try again later." }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
    } else if (isRateLimited(`post:${ip}`, 60_000, 30)) {
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
