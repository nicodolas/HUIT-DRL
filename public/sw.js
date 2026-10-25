// HUIT Điểm Rèn Luyện - Service Worker v2.0.0
const CACHE_NAME = "huit-drl-v2";
const STATIC_ASSETS = [
  "/",
  "/records",
  "/goals",
  "/handbook",
  "/report",
  "/profile",
  "/icon.svg",
  "/manifest.json",
];

// Install: Cache essential shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for API, Stale-while-revalidate for static assets
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET and chrome extensions
  if (event.request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // API calls: Network first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ error: "Bạn đang offline. Vui lòng kết nối mạng." }), {
          headers: { "Content-Type": "application/json" },
          status: 503,
        });
      })
    );
    return;
  }

  // Static assets & navigation: Stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
