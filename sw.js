// Deutsch-Heft service worker: keeps the app working offline.
const VERSION = "heft-v1";
const SHELL = ["./", "index.html", "seed.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Dictionary lookups always go to the network.
  if (url.hostname.endsWith("wiktionary.org") || url.hostname.endsWith("mymemory.translated.net")) return;
  // App files: answer from cache, refresh in the background.
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match(e.request, {ignoreSearch: url.origin === location.origin});
      const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === "opaque")) cache.put(e.request, r.clone()); return r; }).catch(() => null);
      return hit || (await net) || (e.request.mode === "navigate" ? cache.match("index.html") : Response.error());
    }));
  }
});
