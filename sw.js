const CACHE_VERSION = "__CACHE_VERSION__";
const CACHE_NAME = `coshin-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "manifest.json",
  "icon.svg",
  "favicon-16.png",
  "favicon-32.png",
  "apple-touch-icon.png",
  "icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// Network-first strategy so edits and state updates take effect immediately on reload,
// with fallback to cache for offline capabilities.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  // In local dev (__CACHE_VERSION__ is unsubstituted), bypass SW cache completely so every reload fetches fresh code & state
  if (CACHE_VERSION === "__CACHE_VERSION__") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
  );
});
