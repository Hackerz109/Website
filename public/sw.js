// Service worker for the admin PWA. Meets installability requirements for
// "Add to Home Screen" AND handles Web Push (order notifications) — it does
// not cache anything else or change how the app behaves; every normal
// request just goes straight to the network as before.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// A new-order alert arriving from /api/order-notify (via sendPushToAdmins).
// Payload shape: { title, body, url }.
self.addEventListener("push", (event) => {
  let data = { title: "New order", body: "You have a new order." };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON payload — fall back to the default text above.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/admin/orders" },
    }),
  );
});

// Tapping the notification focuses an already-open admin tab if there is
// one, otherwise opens a new one at the order.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/admin/orders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      for (const client of clients) {
        if ("navigate" in client && "focus" in client) {
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    }),
  );
});
