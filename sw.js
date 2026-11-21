/* Nauticonnect – service worker : l'appli s'ouvre même avec peu de réseau */
const CACHE = "nauticonnect-v4";
const SHELL = ["./", "index.html", "app.css", "app.js", "config.js", "manifest.webmanifest", "confidentialite.html",
  "icon-192.png", "icon-512.png", "maskable-512.png", "apple-180.png", "favicon-64.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Supabase & co : toujours en direct
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(cc => cc.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match("index.html"))));
});
