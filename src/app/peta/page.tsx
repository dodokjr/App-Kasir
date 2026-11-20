"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Shell, { Ico } from "@/components/Shell";
import BranchMap, { type Pin } from "@/components/BranchMap";
import LocationPicker from "@/components/LocationPicker";
import { api, rp } from "@/lib/client";
import type { Me } from "@/lib/types";

type R = Record<string, string>;
type Row = { branchId: string; name: string; street: string; sales: number; target: number; pct: number | null; status: string };
type Targets = { month: string; branches: Row[] };
type Tone = Pin["tone"];
type Filter = "all" | Tone;
type Sort = "pencapaian" | "penjualan" | "nama";

const STATUS_TEXT: Record<string, string> = {
  tercapai: "Target tercapai", sesuai_jalur: "Sesuai jalur", tertinggal: "Tertinggal", tidak_tercapai: "Tidak tercapai", tanpa_target: "Belum ada target",
};
const tone = (s?: string): Tone => (s === "tercapai" || s === "sesuai_jalur" ? "ok" : s === "tertinggal" || s === "tidak_tercapai" ? "warn" : "muted");
const TONE_BG: Record<Tone, string> = { ok: "bg-accent", warn: "bg-danger", muted: "bg-muted" };
const TONE_GLYPH: Record<Tone, string> = { ok: "✓", warn: "!", muted: "–" };
const monthName = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

const CSS = `
@keyframes pk-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.pk-rise{animation:pk-rise .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes pk-pop{0%{transform:scale(.6);opacity:0}65%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
.pk-pop{animation:pk-pop .4s cubic-bezier(.2,.8,.2,1) both}
@keyframes pk-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.pk-skel{background-image:linear-gradient(100deg,rgb(var(--line)/.5) 30%,rgb(var(--line)/1) 50%,rgb(var(--line)/.5) 70%);background-size:200% 100%;animation:pk-shimmer 1.6s linear infinite}
@keyframes pk-glow{0%,100%{box-shadow:0 0 0 0 rgb(var(--accent)/.35)}50%{box-shadow:0 0 0 8px rgb(var(--accent)/0)}}
.pk-glow{animation:pk-glow 2s ease-out infinite}
@keyframes pk-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.pk-float{animation:pk-float 3.2s ease-in-out infinite}
@keyframes pk-sweep{from{background-position:200% 0}to{background-position:-200% 0}}
.pk-bar-shine{background-image:linear-gradient(110deg,transparent 30%,rgb(255 255 255/.4) 50%,transparent 70%);background-size:200% 100%;animation:pk-sweep 2.4s linear infinite}
@media (prefers-reduced-motion:reduce){.pk-rise,.pk-pop,.pk-skel,.pk-glow,.pk-float,.pk-bar-shine{animation:none!important}}
`;

function useCountUp(v: number, ms = 600) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(v); from.current = v; return; }
    const t0 = performance.now(), a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const cur = a + (v - a) * (1 - Math.pow(1 - p, 3));
      setN(cur); from.current = cur;
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [v, ms]);
  return Math.round(n);
}

function Stat({ label, value, sub, active, onClick, tint, delay, money }: { label: string; value: number; sub?: string; active?: boolean; onClick?: () => void; tint?: string; delay: number; money?: boolean }) {
  const n = useCountUp(value);
  const body = (
    <>
      <span className="text-xs font-semibold text-muted">{label}</span>
      <span className="mt-1 block font-mono text-2xl font-extrabold tabular-nums sm:text-[1.7rem]">{money ? rp(n) : n}</span>
      {sub && <span className="mt-0.5 block text-xs text-muted">{sub}</span>}
      {tint && <span className={`absolute right-3 top-3 h-2.5 w-2.5 rounded-full ${tint}`} aria-hidden="true" />}
    </>
  );
  const cls = `pk-rise card relative block p-4 text-left transition duration-300 ${active ? "border-accent bg-accent/10 ring-2 ring-accent/30" : ""} ${onClick ? "hover:-translate-y-1 hover:shadow-lg" : ""}`;
  return onClick
    ? <button type="button" onClick={onClick} aria-pressed={active} className={cls} style={{ animationDelay: `${delay}ms` }}>{body}</button>
    : <div className={cls} style={{ animationDelay: `${delay}ms` }}>{body}</div>;
}

function Progress({ pct, t, label }: { pct: number; t: Tone; label: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(Math.min(100, Math.max(0, pct * 100)))); return () => cancelAnimationFrame(id); }, [pct]);
  return (
    <div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(w)} aria-label={label}>
        <div className={`relative h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none ${TONE_BG[t]}`} style={{ width: `${w}%` }}>
          {w > 0 && w < 100 && <div className="pk-bar-shine absolute inset-0 rounded-full" />}
        </div>
        {[25, 50, 75].map((m) => <span key={m} className="absolute top-0 h-full w-0.5 bg-surface" style={{ left: `${m}%` }} />)}
      </div>
    </div>
  );
}

function MapPage({ me }: { me: Me }) {
  const [branches, setBranches] = useState<R[]>([]);
  const [tg, setTg] = useState<Targets | null>(null);
  const [selected, setSelected] = useState("");
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; token: number } | null>(null);
  const [editing, setEditing] = useState<R | null>(null);
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("pencapaian");
  const mapRef = useRef<HTMLElement>(null);
  const owner = me.session.role === "kepala_toko";

  const load = useCallback(async () => {
    const [b, t] = await Promise.allSettled([api<R[]>("/api/branches"), api<Targets>("/api/targets")]);
    if (b.status === "fulfilled") setBranches(b.value);
    if (t.status === "fulfilled") setTg(t.value);
    setErr(b.status === "rejected" ? String((b.reason as Error).message) : "");
    setReady(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const rowOf = useCallback((id: string) => tg?.branches.find((x) => x.branchId === id), [tg]);
  const toneOf = (id: string): Tone => tone(rowOf(id)?.status);

  const located = branches.filter((b) => b.lat && b.lng);
  const unlocated = branches.filter((b) => !(b.lat && b.lng) && (q === "" || (b.name + b.street).toLowerCase().includes(q.toLowerCase())));

  // Peringkat berdasarkan persentase pencapaian
  const rank = useMemo(() => {
    const withT = (tg?.branches ?? []).filter((r) => r.target > 0).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
    return new Map(withT.map((r, i) => [r.branchId, i + 1]));
  }, [tg]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = located.filter((b) => (filter === "all" || toneOf(b.id) === filter) && (!term || (b.name + " " + b.street).toLowerCase().includes(term)));
    const pct = (b: R) => { const r = rowOf(b.id); return r && r.target > 0 ? r.pct ?? 0 : -1; };
    return [...list].sort((a, b) => sort === "nama" ? a.name.localeCompare(b.name, "id") : sort === "penjualan" ? (rowOf(b.id)?.sales ?? 0) - (rowOf(a.id)?.sales ?? 0) : pct(b) - pct(a));
  }, [located, filter, q, sort, rowOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const pins: Pin[] = useMemo(() => shown.map((b) => {
    const r = tg?.branches.find((x) => x.branchId === b.id);
    const lines = [b.street];
    if (r) {
      lines.push(`Penjualan ${tg ? monthName(tg.month) : "bulan ini"}: ${rp(r.sales)}`);
      lines.push(r.target > 0 ? `Target: ${Math.round((r.pct ?? 0) * 100)}% dari ${rp(r.target)}` : "Belum ada target bulan ini");
    }
    return { id: b.id, lat: Number(b.lat), lng: Number(b.lng), title: b.name, lines, tone: tone(r?.status), href: `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}` };
  }), [shown.map((b) => b.id + b.lat + b.lng).join("|"), tg]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (b: R) => {
    setSelected(b.id);
    setFocus({ lat: Number(b.lat), lng: Number(b.lng), zoom: 16, token: Date.now() });
    if (window.matchMedia("(max-width: 1023px)").matches) mapRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const fitAll = () => {
    if (!located.length) return;
    const lat = located.reduce((s, b) => s + Number(b.lat), 0) / located.length;
    const lng = located.reduce((s, b) => s + Number(b.lng), 0) / located.length;
    setSelected("");
    setFocus({ lat, lng, zoom: located.length > 1 ? 12 : 16, token: Date.now() });
  };

  const count = (t: Tone) => branches.filter((b) => toneOf(b.id) === t).length;
  const totalSales = (tg?.branches ?? []).reduce((s, r) => s + r.sales, 0);
  const locPct = branches.length ? located.length / branches.length : 0;
  const toggle = (t: Tone) => setFilter((f) => (f === t ? "all" : t));

  const FILTERS: [Filter, string, number][] = [["all", "Semua", branches.length], ["ok", "Tercapai / sesuai jalur", count("ok")], ["warn", "Perlu perhatian", count("warn")], ["muted", "Belum ada target", count("muted")]];

  return (
    <div className="space-y-6">
      <style>{CSS}</style>
      {editing && <LocationPicker branch={{ id: editing.id, name: editing.name, street: editing.street, lat: editing.lat ?? "", lng: editing.lng ?? "" }} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      {/* Sambutan */}
      <div className="bg-aurora relative overflow-hidden rounded-3xl border border-line p-5 sm:p-7">
        <div className="bg-dots pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-[60ch]">
            <span className="mb-2 inline-block rounded-full bg-sun px-3 py-1 text-xs font-bold text-sun-ink">{tg ? monthName(tg.month) : "Bulan ini"}</span>
            <p className="text-lg font-semibold leading-snug sm:text-xl">Letak {owner ? "semua cabang" : "cabang Anda"} di peta. Warna penanda mengikuti pencapaian target bulan ini.</p>
          </div>
          <div className="pk-float hidden sm:block" aria-hidden="true"><Ico n="peta" size={56} /></div>
        </div>
      </div>

      {err && <p className="pk-pop rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{err}</p>}

      {/* Ringkasan */}
      {ready ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat delay={0} label="Cabang di peta" value={located.length} sub={`dari ${branches.length} cabang`} />
          <Stat delay={80} label="Tercapai / sesuai jalur" value={count("ok")} tint="bg-accent" active={filter === "ok"} onClick={() => toggle("ok")} sub="ketuk untuk menyaring" />
          <Stat delay={160} label="Perlu perhatian" value={count("warn")} tint="bg-danger" active={filter === "warn"} onClick={() => toggle("warn")} sub="tertinggal atau tidak tercapai" />
          <Stat delay={240} label="Total penjualan" value={totalSales} money sub={tg ? monthName(tg.month) : undefined} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="pk-skel h-[98px] rounded-xl" />)}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <section ref={mapRef} aria-label="Peta cabang" className="pk-rise space-y-3" style={{ animationDelay: "120ms" }}>
          <div className="card overflow-hidden p-2 transition-shadow duration-500 hover:shadow-xl">
            {located.length > 0
              ? <div className="overflow-hidden rounded-xl"><BranchMap pins={pins} selectedId={selected} focus={focus} height={520} label="Peta letak cabang toko. Daftar cabang ada di sebelahnya." /></div>
              : <div className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-line bg-paper p-6 text-center">
                  {ready ? (
                    <div><div className="pk-float inline-block"><Ico n="peta" size={44} /></div><p className="mt-3 font-semibold">Belum ada cabang yang diberi lokasi</p>
                      <p className="mt-1 text-sm text-muted">Tekan “Atur lokasi” pada cabang di samping untuk menaruhnya di peta.</p></div>
                  ) : <div className="pk-skel h-full w-full rounded-xl" aria-label="Memuat peta" />}
                </div>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Arti warna penanda">
              {(["ok", "warn", "muted"] as Tone[]).map((t) => (
                <li key={t}><button type="button" onClick={() => toggle(t)} aria-pressed={filter === t} className={`flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-accent/10 ${filter === t ? "bg-accent/10 font-bold" : ""}`}>
                  <span className={`h-3 w-3 rounded-full ${TONE_BG[t]}`} />{t === "ok" ? "Tercapai atau sesuai jalur" : t === "warn" ? "Tertinggal atau tidak tercapai" : "Belum ada target"}
                </button></li>
              ))}
            </ul>
            {located.length > 1 && <button type="button" className="btn-ghost" onClick={fitAll}>Pusatkan peta</button>}
          </div>
        </section>

        <section aria-label="Daftar cabang" className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Cabang ({branches.length})</h2>
            <label className="sr-only" htmlFor="urut">Urutkan</label>
            <select id="urut" className="input w-auto py-1.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="pencapaian">Pencapaian tertinggi</option><option value="penjualan">Penjualan tertinggi</option><option value="nama">Nama A–Z</option>
            </select>
          </div>

          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            <input className="input pl-9" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau alamat cabang" aria-label="Cari cabang" />
          </div>

          <div className="flex flex-wrap gap-2" role="group" aria-label="Saring cabang">
            {FILTERS.map(([k, l, n]) => (
              <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${filter === k ? "border-accent bg-accent text-white" : "border-line bg-surface hover:border-accent/50"}`}>
                {l} <span className="opacity-70">{n}</span>
              </button>
            ))}
          </div>

          {branches.length > 0 && (
            <div className="rounded-xl bg-paper p-3">
              <div className="flex justify-between text-xs font-semibold text-muted"><span>Lokasi sudah diatur</span><span>{located.length} dari {branches.length}</span></div>
              <div className="mt-1.5"><Progress pct={locPct} t="ok" label="Kelengkapan lokasi cabang" /></div>
            </div>
          )}

          <p className="sr-only" aria-live="polite">{shown.length} cabang ditampilkan</p>

          {!ready && <div className="space-y-3" aria-hidden="true">{[0, 1, 2].map((i) => <div key={i} className="pk-skel h-[132px] rounded-xl" />)}</div>}

          <ul className="space-y-3" key={`${filter}-${sort}`}>
            {shown.map((b, i) => {
              const r = rowOf(b.id), t = toneOf(b.id), rk = rank.get(b.id), on = selected === b.id;
              return (
                <li key={b.id} className={`pk-rise card p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${on ? "pk-glow border-accent bg-accent/5" : ""}`} style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}>
                  <button className="block w-full text-left" onClick={() => show(b)} aria-pressed={on}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-extrabold text-white ${TONE_BG[t]}`} aria-hidden="true">{TONE_GLYPH[t]}</span>
                        <div className="min-w-0"><div className="truncate font-bold">{b.name}</div><div className="truncate text-sm text-muted">{b.street}</div></div>
                      </div>
                      {rk && <span className="flex-none rounded-full bg-sun/30 px-2 py-0.5 text-xs font-extrabold" title="Peringkat pencapaian">{rk === 1 ? "♛ " : "#"}{rk}</span>}
                    </div>
                    {r && (
                      <div className="mt-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold">{STATUS_TEXT[r.status]}</span>
                          <span className="font-mono text-sm font-bold tabular-nums">{rp(r.sales)}</span>
                        </div>
                        {r.target > 0
                          ? <><Progress pct={r.pct ?? 0} t={t} label={`Pencapaian ${b.name}`} /><div className="flex justify-between text-xs text-muted"><span>{Math.round((r.pct ?? 0) * 100)}%</span><span>Target {rp(r.target)}</span></div></>
                          : <div className="text-xs text-muted">Belum ada target bulan ini</div>}
                      </div>
                    )}
                  </button>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button className="btn-ghost" onClick={() => show(b)}>Lihat di peta</button>
                    <a className="btn-ghost" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`}>Rute</a>
                    {(owner || b.id === me.session.branchId) && <button className="btn-ghost" onClick={() => setEditing(b)}>Ubah lokasi</button>}
                  </div>
                </li>
              );
            })}
          </ul>

          {ready && located.length > 0 && shown.length === 0 && (
            <div className="pk-pop rounded-xl border border-dashed border-line p-5 text-center">
              <p className="font-semibold">Tidak ada cabang yang cocok</p>
              <button type="button" className="btn-ghost mt-3" onClick={() => { setQ(""); setFilter("all"); }}>Hapus saringan</button>
            </div>
          )}

          {unlocated.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-muted">Belum diatur lokasinya ({unlocated.length})</h3>
              <ul className="space-y-2">
                {unlocated.map((b, i) => (
                  <li key={b.id} className="pk-rise flex items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3 transition hover:border-accent hover:bg-accent/5" style={{ animationDelay: `${Math.min(i, 6) * 70}ms` }}>
                    <div className="min-w-0"><div className="truncate font-semibold">{b.name}</div><div className="truncate text-sm text-muted">{b.street}</div></div>
                    {(owner || b.id === me.session.branchId) ? <button className="btn-primary" onClick={() => setEditing(b)}>Atur lokasi</button> : <span className="text-xs text-muted">Hubungi kepala toko</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
      <p className="text-xs text-muted">Peta dari OpenStreetMap. Pencarian alamat memakai Nominatim, dan tombol “Gunakan lokasi saya” hanya memakai lokasi perangkat saat Anda menekannya.</p>
    </div>
  );
}

export default function Peta() {
  return <Shell>{(me) => (me.session.role === "kepala_toko" || me.session.role === "kepala_cabang")
    ? <MapPage me={me} />
    : <p className="text-sm text-muted">Halaman peta hanya untuk kepala toko dan kepala cabang.</p>}</Shell>;
}