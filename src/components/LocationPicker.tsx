"use client";
import { useEffect, useState } from "react";
import BranchMap from "@/components/BranchMap";
import { api } from "@/lib/client";

type Branch = { id: string; name: string; street: string; lat: string; lng: string };
type Hit = { display_name: string; lat: string; lon: string };

// Dialog untuk menentukan letak cabang: cari alamat, pakai lokasi perangkat, atau klik/geser penanda di peta
export default function LocationPicker({ branch, onClose, onSaved }: { branch: Branch; onClose: () => void; onSaved: () => void }) {
  const has = !!branch.lat && !!branch.lng;
  const [pt, setPt] = useState<{ lat: number; lng: number } | null>(has ? { lat: Number(branch.lat), lng: Number(branch.lng) } : null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; token: number } | null>(has ? { lat: Number(branch.lat), lng: Number(branch.lng), zoom: 16, token: 1 } : null);
  const [q, setQ] = useState(has ? "" : `${branch.street}`);
  const [hits, setHits] = useState<Hit[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = ""; };
  }, [onClose]);

  const go = (lat: number, lng: number, zoom = 17) => { setPt({ lat, lng }); setFocus({ lat, lng, zoom, token: Date.now() }); };

  // Pencarian alamat memakai Nominatim (OpenStreetMap). Cocok untuk pemakaian sesekali
  async function search(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setMsg(""); setHits([]);
    if (!q.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=id&accept-language=id&q=${encodeURIComponent(q.trim())}`);
      if (!r.ok) throw new Error();
      const list: Hit[] = await r.json();
      if (!list.length) setMsg("Alamat tidak ditemukan. Coba tulis lebih singkat (nama jalan dan kota), atau klik langsung di peta.");
      setHits(list);
    } catch { setErr("Pencarian alamat sedang tidak tersedia. Klik langsung di peta untuk menentukan lokasi."); }
    setBusy(false);
  }
  function here() {
    setErr(""); setMsg("");
    if (!navigator.geolocation) { setErr("Perangkat ini tidak mendukung lokasi. Klik langsung di peta."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { go(p.coords.latitude, p.coords.longitude); setMsg("Lokasi perangkat dipakai. Geser penanda bila kurang tepat."); setBusy(false); },
      (x) => { setErr(x.code === 1 ? "Izin lokasi ditolak. Aktifkan izin lokasi di browser, atau klik langsung di peta." : "Lokasi tidak bisa dibaca. Klik langsung di peta."); setBusy(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }
  async function save() {
    if (!pt) return;
    setBusy(true); setErr("");
    try { await api("/api/branches", { method: "PATCH", body: { id: branch.id, lat: pt.lat, lng: pt.lng } }); onSaved(); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  async function clear() {
    if (!confirm(`Hapus lokasi cabang ${branch.name} dari peta?`)) return;
    setBusy(true);
    try { await api("/api/branches", { method: "PATCH", body: { id: branch.id, clear: true } }); onSaved(); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={`Atur lokasi cabang ${branch.name}`}>
      <div className="w-full max-w-2xl space-y-4 rounded-2xl bg-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div><h2 className="text-xl font-extrabold tracking-tight">Atur lokasi cabang</h2><p className="text-sm text-muted">{branch.name}, {branch.street}</p></div>
          <button className="btn-ghost" onClick={onClose} aria-label="Tutup">Tutup</button>
        </div>

        <form onSubmit={search} className="flex flex-wrap gap-2">
          <div className="min-w-[220px] flex-1"><label className="label" htmlFor="loc-q">Cari alamat</label><input id="loc-q" className="input" placeholder="Contoh: Jl. Melati 12, Bandung" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex items-end gap-2"><button className="btn-primary" disabled={busy}>Cari</button><button type="button" className="btn-ghost" disabled={busy} onClick={here}>Gunakan lokasi saya</button></div>
        </form>
        {hits.length > 0 && (
          <ul className="max-h-40 divide-y divide-line overflow-y-auto rounded-xl border border-line text-sm">
            {hits.map((h, i) => <li key={i}><button type="button" className="w-full px-3 py-2 text-left hover:bg-paper" onClick={() => { go(Number(h.lat), Number(h.lon)); setHits([]); }}>{h.display_name}</button></li>)}
          </ul>
        )}
        {msg && <p className="text-sm text-muted" role="status">{msg}</p>}
        {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}

        <BranchMap pins={[]} focus={focus} pick={{ lat: pt?.lat ?? null, lng: pt?.lng ?? null, onPick: (lat, lng) => setPt({ lat, lng }) }} height={340} label="Peta untuk memilih letak cabang. Klik untuk menaruh penanda." />
        <p className="text-sm text-muted">{pt ? <>Titik terpilih: <span className="font-mono">{pt.lat.toFixed(6)}, {pt.lng.toFixed(6)}</span>. Geser penanda untuk menyesuaikan.</> : "Klik di peta untuk menaruh penanda, atau cari alamat di atas."}</p>

        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" disabled={busy || !pt} onClick={save}>{busy ? "Menyimpan…" : "Simpan lokasi"}</button>
          {has && <button className="btn-ghost" disabled={busy} onClick={clear}>Hapus lokasi</button>}
        </div>
      </div>
    </div>
  );
}