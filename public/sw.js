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
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
