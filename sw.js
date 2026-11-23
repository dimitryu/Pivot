// העלו את המספר בכל עדכון כדי שמכשירים מותקנים יטענו את הקבצים החדשים.
const VERSION = "pivot-v3";
const SHELL = ["./", "index.html", "styles.css", "manifest.json", "js/app.js", "js/store.js", "js/lib.js", "js/planner.js", "js/stats.js", "js/seed.js", "js/firebase-config.js", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Firebase והתחברות תמיד מהרשת
  if (/firestore\.googleapis|identitytoolkit|securetoken|googleapis\.com\/google\.firestore|accounts\.google|apis\.google/.test(url.host + url.pathname)) return;
  // רשת קודם, ואם אין חיבור אז מהמטמון. כך עדכונים מגיעים מיד כשיש אינטרנט.
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
