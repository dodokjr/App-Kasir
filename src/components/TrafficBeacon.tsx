"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Mencatat kunjungan halaman ke /api/traffic (lalu ke Google Sheets). Mengikuti Do Not Track dan tidak memakai cookie.
// ID pengunjung hanya angka acak di browser ini, bukan IP dan bukan data pribadi.
export default function TrafficBeacon() {
  const path = usePathname();
  const last = useRef("");

  useEffect(() => {
    if (!path || last.current === path || path.startsWith("/developer")) return;
    if (navigator.doNotTrack === "1") return;
    last.current = path;
    let vid = "";
    try {
      vid = localStorage.getItem("kt-vid") || "";
      if (!vid) { vid = crypto.randomUUID(); localStorage.setItem("kt-vid", vid); }
    } catch { vid = ""; }
    if (!vid) return;
    fetch("/api/traffic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, ref: document.referrer, vid }),
      keepalive: true,
    }).catch(() => {});
  }, [path]);

  return null;
}
