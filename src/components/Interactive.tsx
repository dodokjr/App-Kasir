"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Memberi tahu apakah elemen sedang terlihat, supaya animasi berulang berhenti saat di luar layar */
function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

const Tick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const Cross = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
);

/* ---------- Angka yang berputar halus ke nilai baru ---------- */
export function Rolling({ value, format = rp, className = "" }: { value: number; format?: (n: number) => string; className?: string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced()) { from.current = value; setShown(value); return; }
    const a = from.current;
    if (a === value) return;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 450);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - p, 3)));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={`tabular-nums ${className}`}>{format(shown)}</span>;
}

/* ---------- Penanda tab yang meluncur ke tab aktif ---------- */
export function useTabPill(active: number) {
  const box = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [pill, setPill] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = items.current[active];
      if (el) setPill({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (box.current) ro?.observe(box.current);
    return () => ro?.disconnect();
  }, [active]);

  const style = pill
    ? { transform: `translate(${pill.x}px,${pill.y}px)`, width: pill.w, height: pill.h, opacity: 1 }
    : { opacity: 0 };
  return { box, items, style, ready: !!pill };
}

/* ---------- Muncul saat di-scroll ---------- */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${shown ? "reveal-in" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* ---------- Garis progres scroll: satu warna, tanpa re-render ---------- */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div
      ref={ref}
      className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-accent"
      style={{ transform: "scaleX(0)" }}
      aria-hidden="true"
    />
  );
}

/* ---------- Pantau kasir (bergerak hanya saat terlihat) ---------- */
type Cashier = { name: string; branch: string; online: boolean; sales: number; tick: number };
const START: Cashier[] = [
  { name: "Sari", branch: "Cabang Melati", online: true, sales: 1240000, tick: 0 },
  { name: "Dimas", branch: "Cabang Pasar Baru", online: false, sales: 860000, tick: 0 },
  { name: "Rina", branch: "Cabang Anggrek", online: true, sales: 2015500, tick: 0 },
];

export function LiveMonitor() {
  const [rows, setRows] = useState<Cashier[]>(START);
  const [ref, visible] = useInView<HTMLDivElement>();

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => {
      setRows((prev) => {
        const live = prev.map((r, i) => (r.online ? i : -1)).filter((i) => i >= 0);
        if (!live.length) return prev;
        const idx = live[Math.floor(Math.random() * live.length)];
        const add = (Math.floor(Math.random() * 18) + 3) * 2500;
        return prev.map((r, i) => (i === idx ? { ...r, sales: r.sales + add, tick: r.tick + 1 } : r));
      });
    }, 2600);
    return () => clearInterval(id);
  }, [visible]);

  const total = rows.reduce((s, r) => s + r.sales, 0);
  const toggle = (name: string) => setRows((p) => p.map((r) => (r.name === name ? { ...r, online: !r.online } : r)));

  return (
    <div ref={ref} className="mt-6">
      <div className="mb-3">
        <div className="text-sm text-muted">Penjualan hari ini, semua cabang</div>
        <Rolling value={total} className="block font-mono text-2xl font-extrabold text-accent dark:text-link" />
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface text-[15px]">
        {rows.map((r) => (
          <button
            key={r.name}
            type="button"
            onClick={() => toggle(r.name)}
            aria-pressed={r.online}
            className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-accent/5 active:bg-accent/10"
          >
            <div className="min-w-[120px] flex-1">
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted">{r.branch}</div>
            </div>
            <div className={`flex items-center gap-2 font-medium transition-colors ${r.online ? "" : "text-danger"}`}>
              <span className="relative flex h-2.5 w-2.5">
                {!r.online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70 motion-reduce:animate-none" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${r.online ? "bg-accent" : "bg-danger"}`} />
              </span>
              {r.online ? "Online" : "Offline, kasir masih dibuka"}
            </div>
            <div key={r.tick} className={`w-32 rounded-md text-right font-mono text-sm ${r.tick > 0 ? "anim-flash" : ""}`}>{rp(r.sales)}</div>
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Klik satu baris untuk mencoba memutus dan menyambung internet kasir.</p>
    </div>
  );
}

/* ---------- Metode pembayaran ---------- */
const PAY: { name: string; locked?: boolean }[] = [
  { name: "Cash", locked: true },
  { name: "Transfer bank", locked: true },
  { name: "QRIS" },
  { name: "GoFood" },
  { name: "GrabFood" },
  { name: "ShopeeFood" },
  { name: "GoSend" },
  { name: "Grab Barang" },
  { name: "Paket" },
  { name: "OVO atau Dana" },
];

export function PaymentChips() {
  const [active, setActive] = useState<string[]>(["Cash", "Transfer bank"]);
  const flip = (n: string) => setActive((a) => (a.includes(n) ? a.filter((x) => x !== n) : [...a, n]));
  return (
    <div className="mt-6">
      <ul className="flex flex-wrap gap-2 text-sm font-semibold" aria-label="Metode pembayaran">
        {PAY.map((p) => {
          const isOn = active.includes(p.name);
          return (
            <li key={p.name}>
              <button
                type="button"
                disabled={p.locked}
                aria-pressed={isOn}
                onClick={() => flip(p.name)}
                title={p.locked ? "Selalu aktif" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-3.5 transition-[background-color,color,transform] duration-200 ${
                  isOn ? "bg-white text-accent-dark" : "border border-white/40 text-white hover:bg-white/10"
                } ${p.locked ? "cursor-default" : "cursor-pointer active:scale-95"}`}
              >
                <span className={`grid overflow-hidden transition-[grid-template-columns,opacity] duration-200 ${isOn ? "grid-cols-[1fr] opacity-100" : "grid-cols-[0fr] opacity-0"}`}>
                  <span className="min-w-0 overflow-hidden"><Tick /></span>
                </span>
                {p.name}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-white/85">
        <span key={active.length} className="anim-pop mr-1 inline-block rounded-md bg-white/20 px-2 py-0.5 font-bold">{active.length}</span>
        metode aktif. Klik untuk menambah atau mematikan.
      </p>
    </div>
  );
}

/* ---------- Simulasi PPN ---------- */
export function PpnDemo() {
  const [on, setOn] = useState(true);
  const [rate, setRate] = useState(11);
  const [incl, setIncl] = useState(false);
  const price = 50000;
  let ppn = 0;
  let total = price;
  if (on) {
    if (incl) ppn = Math.round(price - price / (1 + rate / 100));
    else { ppn = Math.round((price * rate) / 100); total = price + ppn; }
  }
  const seg = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-200 active:scale-95 ${
      active ? "border-accent bg-accent text-white" : "border-line hover:border-accent"
    }`;
  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">PPN</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn(!on)}
          className={`relative h-7 w-12 rounded-full transition-colors duration-200 ${on ? "bg-accent" : "bg-line"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-[left] duration-200 ${on ? "left-[22px]" : "left-0.5"}`} />
          <span className="sr-only">Nyalakan PPN</span>
        </button>
      </div>
      <div className={`mt-3 space-y-2 transition-opacity duration-200 ${on ? "" : "pointer-events-none opacity-40"}`}>
        <div className="flex gap-2">{[11, 12].map((r) => <button key={r} type="button" onClick={() => setRate(r)} className={seg(rate === r)}>{r}%</button>)}</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIncl(false)} className={seg(!incl)}>Ditambah</button>
          <button type="button" onClick={() => setIncl(true)} className={seg(incl)}>Sudah termasuk</button>
        </div>
      </div>
      <dl className="mt-4 space-y-1 border-t border-line pt-3 font-mono">
        <div className="flex justify-between"><dt className="text-muted">Harga</dt><dd>{rp(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">PPN {on ? `${rate}%` : "mati"}</dt><dd><Rolling value={ppn} /></dd></div>
        <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd><Rolling value={total} className="text-accent dark:text-link" /></dd></div>
      </dl>
    </div>
  );
}

/* ---------- Simulasi tutup kasir ---------- */
export function TutupKasirDemo() {
  const expected = 1250000;
  const [counted, setCounted] = useState(1250000);
  const diff = counted - expected;
  const tone = diff === 0 ? "text-accent dark:text-link" : diff < 0 ? "text-danger" : "text-amber-600 dark:text-amber-300";
  const label = diff === 0 ? "Pas" : diff < 0 ? "Kurang" : "Lebih";
  const btn = "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-[border-color,transform] duration-150 hover:border-accent active:scale-95";
  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="flex justify-between font-mono"><span className="text-muted">Seharusnya di laci</span><span>{rp(expected)}</span></div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" className={btn} onClick={() => setCounted((c) => Math.max(0, c - 50000))}>− 50.000</button>
        <Rolling value={counted} className="font-mono font-bold" />
        <button type="button" className={btn} onClick={() => setCounted((c) => c + 50000)}>+ 50.000</button>
      </div>
      <div className={`mt-3 flex justify-between border-t border-line pt-3 font-mono font-extrabold ${tone}`}>
        <span>{label}</span><Rolling value={diff} format={(v) => (v === 0 ? "Rp 0" : (v < 0 ? "−" : "+") + rp(Math.abs(v)))} />
      </div>
    </div>
  );
}

/* ---------- Peran (tab) ---------- */
const ROLES = [
  {
    t: "Kepala toko",
    d: "Mendaftarkan toko, menambah cabang dan tim, mengatur jenis usaha, PPN, dan metode pembayaran, serta melihat stok, transaksi, dan keuangan semua cabang.",
    can: ["Daftarkan toko", "Tambah cabang dan tim", "Atur PPN dan pembayaran", "Lihat keuangan semua cabang"],
    cant: [] as string[],
  },
  {
    t: "Kepala cabang",
    d: "Mengelola kasir dan gudang di cabangnya, memantau kasir yang sedang online, dan melihat keuangan cabang.",
    can: ["Kelola kasir dan gudang", "Pantau kasir online", "Lihat keuangan cabang"],
    cant: ["Mengatur cabang lain"],
  },
  {
    t: "Kasir",
    d: "Membuka kasir, melayani pembeli, mencetak struk, lalu menutup kasir dengan laporan penjualan shift.",
    can: ["Buka kasir", "Layani pembeli", "Cetak struk", "Tutup kasir"],
    cant: ["Mengubah harga"],
  },
  {
    t: "Gudang",
    d: "Menambah produk, mengubah harga, dan memperbarui stok cabang.",
    can: ["Tambah produk", "Ubah harga", "Perbarui stok"],
    cant: ["Melihat keuangan"],
  },
];

export function RoleExplorer() {
  const [i, setI] = useState(0);
  const { box, items: refs, style, ready } = useTabPill(i);
  const r = ROLES[i];

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const n = (i + (e.key === "ArrowRight" ? 1 : ROLES.length - 1)) % ROLES.length;
    setI(n);
    refs.current[n]?.focus();
    e.preventDefault();
  };

  return (
    <div>
      <div ref={box} role="tablist" aria-label="Peran" onKeyDown={onKey} className="relative flex flex-wrap gap-2">
        <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-full bg-accent transition-[transform,width,height,opacity] duration-300 ease-out motion-reduce:transition-none" style={style} />
        {ROLES.map((x, idx) => (
          <button
            key={x.t}
            ref={(el) => { refs.current[idx] = el; }}
            role="tab"
            id={`peran-${idx}`}
            aria-selected={i === idx}
            aria-controls="peran-panel"
            tabIndex={i === idx ? 0 : -1}
            type="button"
            onClick={() => setI(idx)}
            className={`relative z-10 rounded-full border px-4 py-2 font-bold transition-[color,border-color,transform] duration-200 active:scale-95 ${
              i === idx ? `border-transparent text-white ${ready ? "" : "bg-accent"}` : "border-line bg-surface hover:border-accent"
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>
      <div key={i} id="peran-panel" role="tabpanel" aria-labelledby={`peran-${i}`} className="anim-swap mt-5 rounded-3xl border border-line bg-surface p-6 sm:p-8">
        <h3 className="text-xl font-bold">{r.t}</h3>
        <p className="mt-2 max-w-[60ch] leading-7 text-muted">{r.d}</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {r.can.map((c, n) => (
            <li key={c} style={{ animationDelay: `${120 + n * 60}ms` }} className="anim-swap inline-flex items-center gap-1.5 rounded-full bg-accent/10 py-1 pl-2.5 pr-3 text-sm font-semibold text-accent dark:text-link"><Tick />{c}</li>
          ))}
          {r.cant.map((c, n) => (
            <li key={c} style={{ animationDelay: `${120 + (r.can.length + n) * 60}ms` }} className="anim-swap inline-flex items-center gap-1.5 rounded-full bg-danger/10 py-1 pl-2.5 pr-3 text-sm font-semibold text-danger"><Cross />{c}</li>
          ))}
        </ul>
        {r.cant.length === 0 && <p className="mt-4 text-sm font-semibold text-muted">Akses penuh ke semua cabang.</p>}
      </div>
    </div>
  );
}

/* ---------- Tiga langkah (jalan otomatis saat terlihat, bisa diklik) ---------- */
const STEPS = [
  ["Daftarkan toko", "Isi nama toko, pilih jenis usaha, lalu buat akun kepala toko. Cabang pertama langsung jadi."],
  ["Tambah cabang dan tim", "Buat cabang lain bila perlu, lalu tambahkan kepala cabang, kasir, dan gudang. Atur PPN dan metode pembayaran di Pengaturan."],
  ["Isi produk dan mulai jualan", "Gudang mengisi produk. Kasir membuka kasir, melayani pembeli, mencetak struk, dan menutup kasir di akhir shift."],
];
const STEP_MS = 4500;

export function Steps() {
  const [a, setA] = useState(0);
  const [auto, setAuto] = useState(true);
  const [ref, visible] = useInView<HTMLOListElement>();

  useEffect(() => { if (reduced()) setAuto(false); }, []);

  const run = auto && visible;
  useEffect(() => {
    if (!run) return;
    const id = setTimeout(() => setA((x) => (x + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [a, run]);

  return (
    <ol ref={ref} className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
      {STEPS.map(([t, d], i) => {
        const on = a === i;
        return (
          <li key={t}>
            <button
              type="button"
              onClick={() => { setA(i); setAuto(false); }}
              aria-current={on ? "step" : undefined}
              className={`relative h-full w-full overflow-hidden rounded-2xl border p-6 text-left transition-[transform,border-color,background-color,opacity] duration-300 ${
                on ? "border-accent bg-paper md:-translate-y-1" : "border-line bg-paper/60 opacity-75 hover:opacity-100"
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-base font-extrabold transition-colors duration-300 ${
                  on ? "border-accent bg-accent text-white" : "border-line text-muted"
                }`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{t}</h3>
              <p className="mt-2 leading-7 text-muted">{d}</p>
              {on && (
                <span className="absolute inset-x-0 bottom-0 h-[3px] bg-line">
                  <span
                    className={`block h-full bg-accent ${run ? "anim-fill" : ""}`}
                    style={run ? { animationDuration: `${STEP_MS}ms` } : { width: auto ? "0%" : "100%" }}
                  />
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}