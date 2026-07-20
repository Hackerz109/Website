// Minimal service worker — exists so the site meets installability
// requirements for "Add to Home Screen" on Android/Chrome. It does not
// cache anything or change how the app behaves; every request just goes
// straight to the network as normal.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
