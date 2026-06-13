self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

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
