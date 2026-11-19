/* Service worker Kasir Toko: membuat halaman Kasir bisa dibuka tanpa internet.
 * - File aplikasi (/_next/static/*): disimpan, dipakai dulu dari simpanan.
 * - Halaman /kasir: ambil dari jaringan; jika gagal atau lambat (5 detik), pakai salinan terakhir.
 * - Data (/api/*) TIDAK pernah disimpan di sini. Data offline disimpan aplikasi di localStorage.
 * Naikkan VERSION bila isi file ini berubah. */
const VERSION = "kt-v1";
const STATIC = VERSION + "-static";
const PAGES = VERSION + "-pages";
const PAGE_PATHS = ["/kasir"];

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const sameOrigin = (u) => { try { return new URL(u, self.location.origin).origin === self.location.origin; } catch (_) { return false; } };

// Halaman yang sudah terbuka sebelum service worker aktif tidak lewat sini, jadi halaman memberi tahu apa yang perlu disimpan
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type === "CACHE_URLS") e.waitUntil(cacheStatic(d.urls || []));
  if (d.type === "CACHE_PAGES") e.waitUntil(cachePages(d.paths || []));
});

async function cacheStatic(urls) {
  const c = await caches.open(STATIC);
  await Promise.all(urls.filter((u) => sameOrigin(u) && new URL(u, self.location.origin).pathname.startsWith("/_next/static/")).map(async (u) => {
    try { if (!(await c.match(u))) await c.add(u); } catch (_) { /* lewati */ }
  }));
}

async function cachePages(paths) {
  const c = await caches.open(PAGES);
  await Promise.all(paths.filter((p) => PAGE_PATHS.includes(p)).map(async (p) => {
    try {
      const res = await fetch(p, { credentials: "same-origin" });
      // Jangan simpan halaman login yang muncul saat belum masuk (hasil pengalihan)
      if (res.ok && !res.redirected) await c.put(p, res);
    } catch (_) { /* sedang offline */ }
  }));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/_next/static/")) { e.respondWith(cacheFirst(req)); return; }
  if (req.mode === "navigate" && PAGE_PATHS.includes(url.pathname)) e.respondWith(networkFirst(req, url.pathname));
});

async function cacheFirst(req) {
  const c = await caches.open(STATIC);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}

async function networkFirst(req, path) {
  const c = await caches.open(PAGES);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000))]);
    if (res.ok && !res.redirected) c.put(path, res.clone());
    return res;
  } catch (err) {
    const hit = await c.match(path);
    if (hit) return hit;
    throw err;
  }
}