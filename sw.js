/* Nauticonnect – service worker : l'appli s'ouvre même avec peu de réseau */
const CACHE = "nauticonnect-v14";
const SHELL = ["./", "index.html", "app.css", "app.js", "config.js", "manifest.webmanifest", "confidentialite.html",
  "icon-192.png", "icon-512.png", "maskable-512.png", "apple-180.png", "favicon-64.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return; // Supabase & co : toujours en direct
  e.respondWith(fetch(e.request, { cache: "no-store" }).then(r => { const c = r.clone(); caches.open(CACHE).then(cc => cc.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match("index.html"))));
});

/* notifications push */
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Nauticonnect", {
    body: d.body || "", icon: "icon-192.png", badge: "favicon-64.png", tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || "#" }, vibrate: [120, 60, 120] }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL("./" + (e.notification.data && e.notification.data.url || "#"), self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    for (const w of ws) if (w.url.startsWith(self.registration.scope)) { w.focus(); return w.navigate(url); }
    return clients.openWindow(url);
  }));
});
