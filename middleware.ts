import { NextRequest, NextResponse } from "next/server";

// In-memory store: ip -> [timestamp, ...] (best-effort; resets on cold start)
const store = new Map<string, number[]>();
const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // max 30 requests per minute per IP

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (store.get(ip) ?? []).filter(t => now - t < WINDOW_MS);
  timestamps.push(now);
  store.set(ip, timestamps);
  return timestamps.length > MAX_REQUESTS;
}

// Only rate-limit public-facing submit and estimate event paths
const RATE_LIMITED_PATHS = ["/api/", "/_next/"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit only POST to server action routes (Next.js App Router uses POST for actions)
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
  // Apply only to sell submit and public pages, not to static assets or admin
  matcher: ["/sell/:path*", "/api/:path*"],
};
