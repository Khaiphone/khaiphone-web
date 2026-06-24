const STATIC_CACHE = "kp-static-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // ลบ cache เวอร์ชันเก่าทิ้ง (กันเสิร์ฟไฟล์ค้าง)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("kp-static-") && k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// แคชเฉพาะ static asset ที่ปลอดภัย (immutable/สาธารณะ) เท่านั้น
// ห้ามแตะ: Supabase API, server action, RSC, HTML auth, ข้อมูลลูกค้า, เอกสาร, signed URL
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // server actions เป็น POST → ผ่าน network ปกติ
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin) return; // cross-origin (Supabase ฯลฯ) → ไม่แตะ

  const p = url.pathname;
  const isNextStatic = p.startsWith("/_next/static/");
  const isAsset = /\.(?:png|jpe?g|webp|svg|gif|ico|woff2?|ttf)$/.test(p);
  const isManifest = p.endsWith("manifest.json") || p.endsWith(".webmanifest");
  // RSC/HTML/dynamic → ไม่แคช
  if (!isNextStatic && !isAsset && !isManifest) return;

  if (isNextStatic) {
    // ชื่อไฟล์ hash แล้ว immutable → cache-first
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
  } else {
    // icon/manifest/รูปสาธารณะ → stale-while-revalidate
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? "Khaiphone Admin";
  const options = {
    body:    data.body  ?? "",
    icon:    data.icon  ?? "/icon-192.png",
    badge:   "/icon-192.png",
    tag:     data.tag   ?? "khaiphone-admin",
    data:    { url: data.url ?? "/admin/dashboard" },
    vibrate: [200, 100, 200],
    renotify: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/admin/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find(c => c.url.startsWith(self.location.origin));
      if (existing) {
        // Let Next.js router handle navigation so history stays intact
        existing.postMessage({ type: "NAVIGATE", url });
        return existing.focus();
      }
      return clients.openWindow(url);
    })
  );
});
