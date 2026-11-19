// روزشمار شمسی — کارکرد آفلاین نسخه‌ی نصب‌شده (طراحی و توسعه : علی شکری)
const CACHE = "roozshomar-web-2.7.1.1";
const YEARS = [];
for (let y = 1400; y <= 1411; y++) YEARS.push("events-" + y + ".json");
const SHELL = ["./", "index.html", "today.html", "manifest.webmanifest", "today.webmanifest",
  "app.css", "today.css", "core.js", "ui.js", "app.js", "today.js",
  "Vazirmatn-FD-Regular.ttf", "Vazirmatn-FD-Bold.ttf",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png",
  "today-192.png", "today-512.png", "today-touch-icon.png"].concat(YEARS);

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// اول از حافظه (کاملاً آفلاین)؛ فایل تازه در پس‌زمینه گرفته می‌شود تا نسخه‌ی بعدی به‌روز باشد
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
