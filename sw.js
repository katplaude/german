// Deutsch-Heft service worker: app works offline, updates arrive on the next launch.
const VERSION = "heft-v2";
const SHELL = ["./", "index.html", "seed.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const ONLINE_ONLY = ["wiktionary.org", "mymemory.translated.net", "languagetool.org"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (ONLINE_ONLY.some(h => url.hostname.endsWith(h))) return;
  // Fonts: cache first.
  if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const r = await fetch(e.request); if (r && (r.ok || r.type === "opaque")) cache.put(e.request, r.clone()); return r;
    }));
    return;
  }
  // App files: network first (so updates show up), cache when offline or slow.
  if (url.origin === location.origin) {
    e.respondWith(caches.open(VERSION).then(async cache => {
      const cached = () => cache.match(e.request, {ignoreSearch:true}).then(h => h || (e.request.mode === "navigate" ? cache.match("index.html") : undefined));
      const net = fetch(e.request).then(r => { if (r && r.ok) cache.put(e.request, r.clone()); return r; });
      const timeout = new Promise(res => setTimeout(res, 3500));
      try {
        const r = await Promise.race([net, timeout.then(cached)]);
        if (r) return r;
        return await net;
      } catch {
        return (await cached()) || Response.error();
      }
    }));
  }
});
