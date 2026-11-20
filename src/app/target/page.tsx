"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Shell from "@/components/Shell";
import { api, rp } from "@/lib/client";
import type { Me } from "@/lib/types";

type Prog = { target: number; sales: number; pct: number | null; remaining: number; projection: number; status: string; neededPerDay: number; milestones: number[] };
type Branch = Prog & { branchId: string; name: string; street: string; tx: number; bestDay: { date: string; sales: number } };
type Data = {
  month: string; today: string; isCurrent: boolean; isPast: boolean; daysInMonth: number; dayOfMonth: number; daysLeft: number; canEdit: boolean;
  store: Prog & { tx: number; targetSource: string }; bestDay: { date: string; sales: number }; branches: Branch[];
  history: { month: string; sales: number; target: number; pct: number | null }[];
  badges: { id: string; title: string; detail: string }[]; storeTarget: number;
};

const STATUS: Record<string, { text: string; cls: string; bar: string; ring: string }> = {
  tercapai: { text: "Target tercapai", cls: "bg-accent text-white", bar: "bg-accent", ring: "text-accent" },
  sesuai_jalur: { text: "Sesuai jalur", cls: "bg-accent/15 text-accent dark:text-link", bar: "bg-accent", ring: "text-accent" },
  tertinggal: { text: "Tertinggal dari jalur", cls: "bg-sun/40 text-sun-ink dark:text-ink", bar: "bg-sun", ring: "text-sun" },
  tidak_tercapai: { text: "Tidak tercapai", cls: "bg-danger/10 text-danger", bar: "bg-danger", ring: "text-danger" },
  tanpa_target: { text: "Belum ada target", cls: "bg-line text-muted", bar: "bg-muted", ring: "text-muted" },
};
const monthLabel = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
const shortMonth = (m: string) => new Date(m + "-01T00:00:00Z").toLocaleDateString("id-ID", { month: "short", timeZone: "UTC" });
const addMonths = (m: string, n: number) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1)).toISOString().slice(0, 7);
const pctText = (p: number | null) => (p === null ? "-" : `${Math.round(p * 100)}%`);
const dateText = (d: string) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "long", timeZone: "UTC" }) : "-");
const roundUp = (n: number, to = 100000) => Math.ceil(n / to) * to;
const roundTo = (n: number, to = 100000) => Math.round(n / to) * to;

const CSS = `
@keyframes tg-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.tg-rise{animation:tg-rise .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes tg-pop{0%{transform:scale(.6);opacity:0}65%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
.tg-pop{animation:tg-pop .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes tg-in-r{from{opacity:0;transform:translateX(36px)}to{opacity:1;transform:none}}
@keyframes tg-in-l{from{opacity:0;transform:translateX(-36px)}to{opacity:1;transform:none}}
.tg-in-r{animation:tg-in-r .45s cubic-bezier(.2,.7,.2,1) both}
.tg-in-l{animation:tg-in-l .45s cubic-bezier(.2,.7,.2,1) both}
@keyframes tg-confetti{0%{opacity:1;transform:translate(0,0) rotate(0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(var(--r)) scale(.6)}}
.tg-confetti{animation:tg-confetti 1.6s cubic-bezier(.15,.7,.3,1) both}
@keyframes tg-draw{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.tg-draw{transform-origin:left;animation:tg-draw .8s ease-out .5s both}
@keyframes tg-shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
.tg-skel{background-image:linear-gradient(100deg,rgb(var(--line)/.5) 30%,rgb(var(--line)/1) 50%,rgb(var(--line)/.5) 70%);background-size:200% 100%;animation:tg-shimmer 1.6s linear infinite}
.tg-shine{background-image:linear-gradient(110deg,transparent 30%,rgb(255 255 255/.4) 50%,transparent 70%);background-size:200% 100%;animation:tg-shimmer 2.4s linear infinite}
@keyframes tg-check{from{stroke-dashoffset:24}to{stroke-dashoffset:0}}
.tg-check{stroke-dasharray:24;animation:tg-check .4s ease-out both}
@media (prefers-reduced-motion:reduce){.tg-rise,.tg-pop,.tg-in-r,.tg-in-l,.tg-confetti,.tg-draw,.tg-skel,.tg-shine,.tg-check{animation:none!important}}
`;

function useCountUp(v: number, ms = 700) {
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
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown] as const;
}
const Num = ({ v, money }: { v: number; money?: boolean }) => { const n = useCountUp(v); return <>{money ? rp(n) : n}</>; };

/* Batang kemajuan: terisi pelan, tanda 25/50/75% menyala saat terlewati */
function Bar({ p, label }: { p: Prog; label: string }) {
  const target = Math.min(100, Math.round((p.pct ?? 0) * 100));
  const [w, setW] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setW(target)); return () => cancelAnimationFrame(id); }, [target]);
  return (
    <div className="relative pt-1">
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={target} className="h-4 overflow-hidden rounded-full bg-line">
        <div className={`relative h-full rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none ${STATUS[p.status].bar}`} style={{ width: `${w}%` }}>
          {w > 0 && w < 100 && <div className="tg-shine absolute inset-0 rounded-full" />}
        </div>
      </div>
      {[25, 50, 75].map((m) => <span key={m} aria-hidden="true" className="absolute top-1 h-4 w-px bg-surface" style={{ left: `${m}%` }} />)}
    </div>
  );
}

function Milestones({ pct }: { pct: number }) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Tonggak pencapaian">
      {[25, 50, 75, 100].map((m, i) => {
        const on = pct * 100 >= m;
        return (
          <span key={`${m}-${on}`} style={{ animationDelay: `${i * 90}ms` }} className={`${on ? "tg-pop border-accent bg-accent/10 text-ink" : "border-line text-muted opacity-70"} inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold`}>
            <span aria-hidden="true">{on ? "★" : "○"}</span>{m}%<span className="sr-only">{on ? " tercapai" : " belum"}</span>
          </span>
        );
      })}
    </div>
  );
}

/* Cincin pencapaian dengan konfeti saat target tercapai */
function Ring({ s }: { s: Prog }) {
  const R = 64, C = 2 * Math.PI * R;
  const pct = Math.min(1, s.pct ?? 0);
  const [v, setV] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setV(pct)); return () => cancelAnimationFrame(id); }, [pct]);
  const n = useCountUp(Math.round((s.pct ?? 0) * 100));
  const party = s.status === "tercapai" && s.target > 0;
  return (
    <div className="relative mx-auto h-40 w-40 flex-none sm:mx-0">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="80" cy="80" r={R} fill="none" stroke="rgb(var(--line))" strokeWidth="14" />
        <circle cx="80" cy="80" r={R} fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" className={`${STATUS[s.status].ring} transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none`} strokeDasharray={C} strokeDashoffset={C * (1 - v)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-extrabold tabular-nums">{s.pct === null ? "-" : `${n}%`}</span>
        <span className="text-xs font-semibold text-muted">dari target</span>
      </div>
      {party && (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {Array.from({ length: 22 }).map((_, i) => {
            const a = (i / 22) * Math.PI * 2, dist = 80 + (i % 3) * 22;
            return <span key={i} className="tg-confetti absolute left-1/2 top-1/2 h-2 w-1.5 rounded-sm"
              style={{ background: ["rgb(var(--accent))", "rgb(var(--sun))", "rgb(var(--accent-2))"][i % 3], animationDelay: `${(i % 5) * 60}ms`,
                ["--dx" as string]: `${Math.cos(a) * dist}px`, ["--dy" as string]: `${Math.sin(a) * dist}px`, ["--r" as string]: `${(i * 67) % 360}deg` }} />;
          })}
        </div>
      )}
    </div>
  );
}

/* Simulasi: bagaimana jika sisa bulan berjualan sekian per hari? */
function Simulasi({ s, d }: { s: Prog; d: Data }) {
  const avg = s.sales / Math.max(1, d.dayOfMonth);
  const need = Math.max(0, s.neededPerDay);
  const max = Math.max(50000, roundUp(Math.max(avg, need) * 2, 50000));
  const [perDay, setPerDay] = useState(roundTo(avg, 50000));
  const forecast = s.sales + perDay * d.daysLeft;
  const ok = forecast >= s.target;
  const f = useCountUp(forecast, 500);
  const pct = s.target > 0 ? Math.min(1, forecast / s.target) : 0;
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-paper p-4 sm:p-5">
      <div>
        <div className="font-bold">Coba simulasi sisa bulan</div>
        <div className="text-sm text-muted">Geser untuk melihat akhir bulan jika sisa {d.daysLeft} hari berjualan dengan rata-rata tertentu. Ini perkiraan kasar, bukan data nyata.</div>
      </div>
      <div>
        <label htmlFor="sim" className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span className="font-semibold">Penjualan per hari</span><span className="font-mono text-lg font-extrabold">{rp(perDay)}</span></label>
        <input id="sim" type="range" min={0} max={max} step={50000} value={Math.min(perDay, max)} onChange={(e) => setPerDay(+e.target.value)} className="mt-1 w-full" />
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => setPerDay(roundTo(avg, 50000))}>Laju sekarang</button>
          {need > 0 && <button type="button" className="btn-ghost" onClick={() => setPerDay(Math.min(max, roundUp(need, 50000)))}>Laju yang dibutuhkan</button>}
        </div>
      </div>
      <div className="rounded-xl bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div><div className="text-xs font-medium text-muted">Perkiraan akhir bulan</div><div className="font-mono text-2xl font-extrabold tabular-nums">{rp(f)}</div></div>
          <span key={String(ok)} className={`tg-pop rounded-full px-3 py-1 text-sm font-bold ${ok ? "bg-accent text-white" : "bg-danger/10 text-danger"}`}>{ok ? "✓ Target tercapai" : `Kurang ${rp(s.target - forecast)}`}</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-line"><div className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${ok ? "bg-accent" : "bg-danger"}`} style={{ width: `${pct * 100}%` }} /></div>
      </div>
    </div>
  );
}

function BranchRow({ b, d, i, edit, rank, onSave }: { b: Branch; d: Data; i: number; edit: boolean; rank?: number; onSave: (branchId: string, amount: number) => Promise<boolean> }) {
  const [v, setV] = useState(b.target ? String(b.target) : "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setV(b.target ? String(b.target) : ""); }, [b.target, d.month]);
  const st = STATUS[b.status];
  const num = Number(v || 0);
  const proj = Math.ceil(b.projection / 100000) * 100000;
  const chips: [string, number][] = [];
  if (b.projection > 0) chips.push(["Sesuai perkiraan", proj]);
  if (b.target > 0) { chips.push(["+10%", roundTo(b.target * 1.1)]); chips.push(["−10%", roundTo(b.target * 0.9)]); }
  return (
    <li className="tg-rise card space-y-3 p-4 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg" style={{ animationDelay: `${Math.min(i, 8) * 80}ms` }}>
      <div className="flex flex-wrap items-center gap-2">
        {rank && <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-extrabold ${rank === 1 ? "bg-sun text-sun-ink" : "bg-paper"}`} title="Peringkat">{rank === 1 ? "♛" : rank}</span>}
        <div className="min-w-0 flex-1"><div className="font-bold">{b.name}</div><div className="truncate text-sm text-muted">{b.street}</div></div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${st.cls}`}>{st.text}</span>
      </div>
      <Bar p={b} label={`Pencapaian ${b.name}`} />
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span><span className="text-lg font-extrabold">{pctText(b.pct)}</span> <span className="text-muted">({rp(b.sales)}{b.target > 0 ? ` dari ${rp(b.target)}` : ""})</span></span>
        <span className="text-muted">{b.tx} transaksi{b.bestDay.sales > 0 ? `, hari terbaik ${dateText(b.bestDay.date)}` : ""}</span>
      </div>
      {d.isCurrent && b.target > 0 && b.status !== "tercapai" && <p className="text-sm text-muted">Butuh rata-rata {rp(b.neededPerDay)} per hari selama {d.daysLeft} hari lagi.</p>}
      {edit && (
        <form className="space-y-2 border-t border-line pt-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); const ok = await onSave(b.branchId, num); setBusy(false); if (ok) { setSaved(true); setTimeout(() => setSaved(false), 1800); } }}>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1"><label className="label" htmlFor={`t-${b.branchId}`}>Target {monthLabel(d.month)}</label>
              <input id={`t-${b.branchId}`} inputMode="numeric" className="input font-mono" placeholder="Contoh: 15000000" value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ""))} /></div>
            <button className="btn-primary min-w-[110px]" disabled={busy}>
              {busy ? "Menyimpan…" : saved ? <span className="inline-flex items-center gap-1.5"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path className="tg-check" d="M20 6 9 17l-5-5" /></svg>Tersimpan</span> : "Simpan"}
            </button>
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Isi cepat">
              {chips.map(([l, n]) => <button key={l} type="button" className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold transition hover:-translate-y-0.5 hover:border-accent" onClick={() => setV(String(n))}>{l}: {rp(n)}</button>)}
            </div>
          )}
          {num > 0 && num !== b.target && <p className="tg-rise text-sm text-muted" aria-live="polite">Pratinjau: dengan target {rp(num)}, pencapaian saat ini menjadi <strong className="text-ink">{Math.round((b.sales / num) * 100)}%</strong>.</p>}
        </form>
      )}
    </li>
  );
}

function Riwayat({ d, onPick }: { d: Data; onPick: (m: string) => void }) {
  const [ref, shown] = useInView<HTMLElement>();
  const [hi, setHi] = useState(() => Math.max(0, d.history.findIndex((h) => h.month === d.month)));
  useEffect(() => { setHi(Math.max(0, d.history.findIndex((h) => h.month === d.month))); }, [d.month, d.history]);
  const maxH = Math.max(1, ...d.history.map((h) => Math.max(h.sales, h.target)));
  const cur = d.history[hi];
  return (
    <section ref={ref} className="card space-y-4 p-5" aria-label="Riwayat enam bulan">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Enam bulan terakhir</h2>
        <span className="text-xs text-muted">Ketuk batang untuk membuka bulannya</span>
      </div>
      <div className="flex h-44 items-end gap-2 sm:gap-4" role="group" aria-label="Penjualan dan target enam bulan">
        {d.history.map((h, i) => {
          const hh = h.sales ? Math.max(3, (h.sales / maxH) * 100) : 0;
          const hit = h.pct !== null && h.pct >= 1;
          return (
            <button key={h.month} type="button" onClick={() => onPick(h.month)} onMouseEnter={() => setHi(i)} onFocus={() => setHi(i)}
              aria-label={`${monthLabel(h.month)}: penjualan ${rp(h.sales)}, target ${h.target ? rp(h.target) : "belum ada"}`}
              className={`group relative flex h-full flex-1 items-end rounded-t-lg outline-offset-2 ${i === hi ? "bg-accent/10" : ""}`}>
              <div className={`w-full rounded-t-lg transition-[height,filter] duration-700 ease-out group-hover:brightness-110 motion-reduce:transition-none ${hit ? "bg-accent" : "bg-accent/40"} ${h.month === d.month ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`}
                style={{ height: shown ? (hh ? `${hh}%` : "3px") : "0%", transitionDelay: `${i * 90}ms`, opacity: h.sales ? 1 : 0.4 }} />
              {h.target > 0 && <div className="pointer-events-none absolute inset-x-0 border-t-2 border-dashed border-danger" style={{ bottom: `${(h.target / maxH) * 100}%` }}><span className={shown ? "tg-draw absolute inset-0 block" : "hidden"} /></div>}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 text-center text-xs sm:gap-4" aria-hidden="true">
        {d.history.map((h, i) => <div key={h.month} className={`flex-1 transition ${i === hi ? "font-bold" : "text-muted"}`}><div className="capitalize">{shortMonth(h.month)}</div><div>{pctText(h.pct)}</div></div>)}
      </div>
      {cur && (
        <div key={cur.month} className="tg-rise grid grid-cols-3 gap-3 rounded-xl bg-paper p-3 text-sm" aria-live="polite">
          <div><div className="text-xs text-muted">Bulan</div><div className="font-bold capitalize">{monthLabel(cur.month)}</div></div>
          <div><div className="text-xs text-muted">Penjualan</div><div className="font-mono font-bold">{rp(cur.sales)}</div></div>
          <div><div className="text-xs text-muted">Target</div><div className="font-mono font-bold">{cur.target ? `${rp(cur.target)} (${pctText(cur.pct)})` : "Belum ada"}</div></div>
        </div>
      )}
      <p className="text-xs text-muted">Batang = penjualan. Garis putus-putus merah = target. Batang hijau pekat = target tercapai.</p>
    </section>
  );
}

function Page({ me }: { me: Me }) {
  const [month, setMonth] = useState("");
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [allT, setAllT] = useState("");
  const [busyAll, setBusyAll] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);

  const load = useCallback(async () => {
    try { const r = await api<Data>(`/api/targets${month ? `?month=${month}` : ""}`); setD(r); setErr(""); if (!month) setMonth(r.month); }
    catch (x) { setErr((x as Error).message); }
  }, [month]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (d) setAllT(d.storeTarget ? String(d.storeTarget) : ""); }, [d?.month, d?.storeTarget]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(""), 4500); return () => clearTimeout(t); }, [note]);

  const go = (m: string) => { if (d) setDir(m > d.month ? 1 : -1); setMonth(m); };

  async function save(branchId: string, amount: number): Promise<boolean> {
    setErr(""); setNote("");
    try { await api("/api/targets", { method: "POST", body: { month: d!.month, branchId, amount } }); setNote("Target tersimpan."); await load(); return true; }
    catch (x) { setErr((x as Error).message); return false; }
  }
  async function copy() {
    setErr(""); setNote("");
    try { const r = await api<{ copied: number }>("/api/targets", { method: "POST", body: { month: d!.month, copyFrom: addMonths(d!.month, -1) } }); setNote(r.copied ? `${r.copied} target disalin dari ${monthLabel(addMonths(d!.month, -1))}.` : "Semua target bulan ini sudah terisi."); await load(); }
    catch (x) { setErr((x as Error).message); }
  }

  const owner = me.session.role === "kepala_toko";
  const s = d?.store;
  const ranked = d ? [...d.branches].filter((b) => b.target > 0).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0)).map((b) => b.branchId) : [];

  return (
    <div className="space-y-6">
      <style>{CSS}</style>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2" role="group" aria-label="Pilih bulan">
          <button className="btn-ghost" disabled={!d} onClick={() => go(addMonths(d!.month, -1))} aria-label="Bulan sebelumnya">← Sebelumnya</button>
          <span key={d?.month} className="tg-pop min-w-[150px] text-center text-lg font-extrabold capitalize">{d ? monthLabel(d.month) : "…"}</span>
          <button className="btn-ghost" disabled={!d} onClick={() => go(addMonths(d!.month, 1))} aria-label="Bulan berikutnya">Berikutnya →</button>
        </div>
        {d && !d.isCurrent && <button className="btn-ghost" onClick={() => { setDir(1); setMonth(""); }}>Bulan ini</button>}
        {d?.canEdit && <button className="btn-ghost ml-auto" onClick={copy}>Salin target bulan lalu</button>}
      </div>

      {err && <p className="tg-pop rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{err}</p>}
      {note && <p className="tg-pop flex items-center gap-2 rounded-xl bg-accent/10 px-4 py-3 text-sm font-medium" role="status"><span aria-hidden="true">✓</span>{note}</p>}
      {!d && !err && (
        <div className="space-y-4" aria-label="Memuat">
          <div className="tg-skel h-[260px] rounded-2xl" /><div className="grid gap-3 lg:grid-cols-2"><div className="tg-skel h-36 rounded-xl" /><div className="tg-skel h-36 rounded-xl" /></div>
        </div>
      )}

      {d && s && (
        <div key={d.month} className={`space-y-6 ${dir === 1 ? "tg-in-r" : "tg-in-l"}`}>
          <section className="card relative space-y-5 overflow-hidden p-5 sm:p-6" aria-label="Pencapaian toko">
            <div className="bg-aurora pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />
            <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <Ring s={s} />
              <div className="w-full flex-1 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-medium text-muted">{me.session.role === "kepala_toko" ? "Seluruh toko" : "Cabang Anda"}</div>
                  <span className={`tg-pop rounded-full px-3 py-1 text-sm font-semibold ${STATUS[s.status].cls}`}>{STATUS[s.status].text}</span>
                </div>
                <Bar p={s} label="Pencapaian target bulan ini" />
                <div className="flex justify-between text-xs text-muted" aria-hidden="true"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>
                {s.target > 0 && <Milestones pct={s.pct ?? 0} />}
              </div>
            </div>

            <dl className="relative grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Penjualan", <Num key="a" v={s.sales} money />],
                [`Target${s.target > 0 && owner ? ` (${s.targetSource})` : ""}`, s.target > 0 ? <Num key="b" v={s.target} money /> : "Belum diatur"],
                ["Sisa ke target", s.target > 0 ? <Num key="c" v={s.remaining} money /> : "-"],
                ["Transaksi", <Num key="d" v={s.tx} />],
              ].map(([l, val], i) => (
                <div key={i} className="tg-rise rounded-xl bg-surface/80 p-3 transition duration-300 hover:-translate-y-0.5 hover:shadow-md" style={{ animationDelay: `${i * 90}ms` }}>
                  <dt className="text-sm text-muted">{l}</dt><dd className="font-mono text-lg font-bold tabular-nums">{val}</dd>
                </div>
              ))}
            </dl>

            {d.isCurrent && s.target > 0 && (
              <div className="relative space-y-1 rounded-xl bg-paper p-4 text-sm leading-7">
                {s.status !== "tercapai" && <p>Sisa <strong>{d.daysLeft} hari</strong> (termasuk hari ini). Butuh rata-rata <strong>{rp(s.neededPerDay)}</strong> per hari untuk mencapai target.</p>}
                <p>Dengan laju sekarang, perkiraan akhir bulan <strong>{rp(s.projection)}</strong>, {s.projection >= s.target ? "sudah di atas target." : `kurang ${rp(s.target - s.projection)} dari target.`}</p>
              </div>
            )}
            {d.isPast && s.target > 0 && <p className="relative text-sm text-muted">Bulan ini sudah berakhir: {s.status === "tercapai" ? "target tercapai." : `kurang ${rp(s.remaining)} dari target.`}</p>}
            {s.target <= 0 && <p className="relative rounded-xl bg-sun/20 p-4 text-sm">{d.canEdit ? "Belum ada target untuk bulan ini. Isi target tiap cabang di bawah, atau tekan “Salin target bulan lalu”." : "Kepala toko belum mengatur target untuk bulan ini."}</p>}
          </section>

          {d.isCurrent && s.target > 0 && s.status !== "tercapai" && d.daysLeft > 0 && <Simulasi key={d.month} s={s} d={d} />}

          {d.badges.length > 0 && (
            <section aria-label="Pencapaian">
              <h2 className="mb-3 text-lg font-bold">Pencapaian</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {d.badges.map((b, i) => (
                  <li key={b.id} className="tg-pop group flex gap-3 overflow-hidden rounded-2xl bg-sun/20 p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ animationDelay: `${i * 100}ms` }}>
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-sun font-extrabold text-sun-ink transition-transform duration-500 group-hover:rotate-[360deg]" aria-hidden="true">★</span>
                    <div><div className="font-bold">{b.title}</div><div className="text-sm text-muted">{b.detail}</div></div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-label="Target per cabang" className="space-y-3">
            <h2 className="text-lg font-bold">{d.branches.length > 1 ? "Peringkat cabang" : "Cabang"}</h2>
            <ul className="grid gap-3 lg:grid-cols-2">
              {d.branches.map((b, i) => <BranchRow key={b.branchId} b={b} d={d} i={i} edit={d.canEdit} rank={d.branches.length > 1 ? ranked.indexOf(b.branchId) + 1 || undefined : undefined} onSave={save} />)}
            </ul>
            {d.canEdit && d.branches.length > 1 && (
              <form className="card flex flex-wrap items-end gap-3 p-4" onSubmit={async (e) => { e.preventDefault(); setBusyAll(true); await save("", Number(allT || 0)); setBusyAll(false); }}>
                <div className="min-w-[220px] flex-1">
                  <label className="label" htmlFor="t-store">Target seluruh toko (opsional)</label>
                  <input id="t-store" inputMode="numeric" className="input font-mono" placeholder="Kosongkan untuk memakai jumlah target cabang" value={allT} onChange={(e) => setAllT(e.target.value.replace(/\D/g, ""))} />
                </div>
                <button className="btn-ghost" disabled={busyAll}>{busyAll ? "Menyimpan…" : "Simpan target toko"}</button>
              </form>
            )}
          </section>

          <Riwayat d={d} onPick={go} />
        </div>
      )}
      <p className="text-xs text-muted">Penjualan dihitung dari total transaksi (termasuk PPN bila aktif), sama dengan angka Penjualan di halaman Keuangan.</p>
    </div>
  );
}

export default function Target() {
  return <Shell>{(me) => (me.session.role === "kepala_toko" || me.session.role === "kepala_cabang")
    ? <Page me={me} />
    : <p className="text-sm text-muted">Halaman target hanya untuk kepala toko dan kepala cabang.</p>}</Shell>;
}