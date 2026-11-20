"use client";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker, LayerGroup } from "leaflet";

export type Pin = { id: string; lat: number; lng: number; title: string; lines: string[]; tone: "ok" | "warn" | "muted"; href?: string };
type Focus = { lat: number; lng: number; zoom?: number; token: number } | null;
type Pick = { lat: number | null; lng: number | null; onPick: (lat: number, lng: number) => void };

const COLOR = { ok: "#0b6e4f", warn: "#d64530", muted: "#6b7a72" };
const INDONESIA: [number, number] = [-2.5, 118];

const pinSvg = (color: string, big: boolean) =>
  `<svg width="${big ? 38 : 30}" height="${big ? 46 : 36}" viewBox="0 0 30 36" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.4))"><path d="M15 0C6.7 0 0 6.7 0 15c0 11 15 21 15 21s15-10 15-21C30 6.7 23.3 0 15 0z" fill="${color}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#fff"/></svg>`;

// Isi popup dibuat dengan textContent (bukan HTML) supaya nama cabang tidak bisa menyisipkan kode
function popup(p: Pin): HTMLElement {
  const box = document.createElement("div");
  const t = document.createElement("strong"); t.textContent = p.title; box.appendChild(t);
  for (const l of p.lines) { const d = document.createElement("div"); d.textContent = l; box.appendChild(d); }
  if (p.href) {
    const a = document.createElement("a");
    a.href = p.href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Buka rute di Google Maps";
    a.style.cssText = "display:inline-block;margin-top:6px;font-weight:600;color:#0b6e4f";
    box.appendChild(a);
  }
  return box;
}

export default function BranchMap({ pins, selectedId, focus, pick, height = 420, label }: { pins: Pin[]; selectedId?: string; focus?: Focus; pick?: Pick; height?: number; label: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const lib = useRef<typeof import("leaflet") | null>(null);
  const group = useRef<LayerGroup | null>(null);
  const pickMarker = useRef<Marker | null>(null);
  const pickRef = useRef<Pick | undefined>(pick);
  const fitKey = useRef("");
  const [ready, setReady] = useState(false);
  pickRef.current = pick;

  // Buat peta sekali. Leaflet butuh `window`, jadi dimuat di browser saja
  useEffect(() => {
    let dead = false;
    (async () => {
      // Bergantung pada bundler, Leaflet bisa tersedia di `default` atau langsung di modul
      const mod = (await import("leaflet")) as unknown as { default?: typeof import("leaflet") } & typeof import("leaflet");
      const L = mod.default ?? mod;
      if (dead || !el.current || map.current) return;
      lib.current = L;
      const m = L.map(el.current, { scrollWheelZoom: false }).setView(INDONESIA, 5);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
      group.current = L.layerGroup().addTo(m);
      m.on("click", (e) => pickRef.current?.onPick(e.latlng.lat, e.latlng.lng));
      // Zoom dengan roda mouse hanya setelah peta diklik, agar halaman tetap bisa digulir
      m.once("focus", () => m.scrollWheelZoom.enable());
      map.current = m; setReady(true);
    })();
    return () => { dead = true; map.current?.remove(); map.current = null; group.current = null; pickMarker.current = null; setReady(false); };
  }, []);

  // Penanda cabang
  useEffect(() => {
    const L = lib.current, m = map.current, g = group.current;
    if (!ready || !L || !m || !g) return;
    g.clearLayers();
    for (const p of pins) {
      const big = p.id === selectedId;
      const icon = L.divIcon({ className: "", html: pinSvg(COLOR[p.tone], big), iconSize: big ? [38, 46] : [30, 36], iconAnchor: big ? [19, 46] : [15, 36], popupAnchor: [0, -34] });
      const mk = L.marker([p.lat, p.lng], { icon, title: p.title, zIndexOffset: big ? 1000 : 0 }).addTo(g);
      mk.bindPopup(popup(p));
      if (big) mk.openPopup();
    }
    // Sesuaikan zoom hanya saat kumpulan cabang berubah, bukan tiap data diperbarui
    const key = pins.map((p) => p.id).join(",");
    if (key !== fitKey.current && pins.length && !pick) {
      fitKey.current = key;
      if (pins.length === 1) m.setView([pins[0].lat, pins[0].lng], 15);
      else m.fitBounds(pins.map((p) => [p.lat, p.lng] as [number, number]), { padding: [40, 40], maxZoom: 15 });
    }
  }, [ready, pins, selectedId, pick]);

  useEffect(() => {
    if (ready && focus && map.current) map.current.setView([focus.lat, focus.lng], focus.zoom ?? 16, { animate: true });
  }, [ready, focus]);

  // Mode pilih lokasi: penanda bisa digeser
  useEffect(() => {
    const L = lib.current, m = map.current;
    if (!ready || !L || !m || !pick) return;
    if (pick.lat === null || pick.lng === null) { pickMarker.current?.remove(); pickMarker.current = null; return; }
    if (!pickMarker.current) {
      const icon = L.divIcon({ className: "", html: pinSvg(COLOR.ok, true), iconSize: [38, 46], iconAnchor: [19, 46] });
      pickMarker.current = L.marker([pick.lat, pick.lng], { icon, draggable: true, title: "Geser untuk memindahkan" }).addTo(m);
      pickMarker.current.on("dragend", () => { const ll = pickMarker.current!.getLatLng(); pickRef.current?.onPick(ll.lat, ll.lng); });
    } else pickMarker.current.setLatLng([pick.lat, pick.lng]);
  }, [ready, pick, pick?.lat, pick?.lng]);

  // `isolate` membuat lapisan peta tidak menimpa menu dan dialog di atasnya
  return <div className="isolate overflow-hidden rounded-2xl border border-line"><div ref={el} style={{ height, width: "100%" }} role="application" aria-label={label} className="bg-paper" /></div>;
}