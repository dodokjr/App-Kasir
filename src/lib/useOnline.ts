"use client";
import { useEffect, useState } from "react";

// Status koneksi. navigator.onLine saja tidak cukup (Wi-Fi tersambung tanpa internet tetap "online"),
// jadi permintaan yang gagal karena jaringan juga menandai offline. Saat dicurigai offline,
// aplikasi memeriksa /api/ping tiap 8 detik sampai tersambung lagi.
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    const net = (e: Event) => setOnline((e as CustomEvent<boolean>).detail && navigator.onLine);
    window.addEventListener("online", on); window.addEventListener("offline", off); window.addEventListener("kt-net", net);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); window.removeEventListener("kt-net", net); };
  }, []);
  useEffect(() => {
    if (online) return;
    const t = setInterval(async () => {
      try { const r = await fetch("/api/ping", { cache: "no-store" }); if (r.ok) setOnline(navigator.onLine); } catch { /* masih offline */ }
    }, 8000);
    return () => clearInterval(t);
  }, [online]);
  return online;
}