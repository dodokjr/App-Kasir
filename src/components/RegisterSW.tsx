"use client";
import { useEffect } from "react";

// Mendaftarkan service worker (hanya di produksi) agar halaman Kasir tetap bisa dibuka saat internet mati.
// Di mode dev (npm run dev) tidak aktif supaya tidak mengganggu hot reload.
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").then(async () => {
      const reg = await navigator.serviceWorker.ready;
      // File yang dimuat halaman ini sebelum service worker aktif perlu disimpan juga
      const urls = performance.getEntriesByType("resource").map((r) => r.name).filter((n) => n.includes("/_next/static/"));
      reg.active?.postMessage({ type: "CACHE_URLS", urls });
      reg.active?.postMessage({ type: "CACHE_PAGES", paths: ["/kasir"] });
    }).catch(() => { /* tanpa service worker, mode offline hanya jalan selama halaman tidak dimuat ulang */ });
  }, []);
  return null;
}