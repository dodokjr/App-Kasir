"use client";

import { useEffect, useState, useRef, type ReactNode } from "react";

const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

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

/* ---------- Garis progres scroll ---------- */
export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-1 origin-left bg-gradient-to-r from-accent via-sun to-rose-500"
      style={{ transform: `scaleX(${p})` }}
      aria-hidden="true"
    />
  );
}

/* ---------- Pantau kasir (langsung bergerak) ---------- */
type Cashier = { name: string; branch: string; online: boolean; sales: number; tick: number };
const START: Cashier[] = [
  { name: "Sari", branch: "Cabang Melati", online: true, sales: 1240000, tick: 0 },
  { name: "Dimas", branch: "Cabang Pasar Baru", online: false, sales: 860000, tick: 0 },
  { name: "Rina", branch: "Cabang Anggrek", online: true, sales: 2015500, tick: 0 },
];

export function LiveMonitor() {
  const [rows, setRows] = useState<Cashier[]>(START);

  useEffect(() => {
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
  }, []);

  const total = rows.reduce((s, r) => s + r.sales, 0);
  const toggle = (name: string) => setRows((p) => p.map((r) => (r.name === name ? { ...r, online: !r.online } : r)));

  return (
    <div className="mt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <div className="text-sm text-muted">Penjualan hari ini, semua cabang</div>
          <div key={total} className="anim-pop font-mono text-2xl font-extrabold text-accent dark:text-link">{rp(total)}</div>
        </div>
        <div className="rounded-full bg-sun px-3 py-1 text-xs font-semibold text-sun-ink">Klik baris untuk coba putus atau sambung internet</div>
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface text-[15px]">
        {rows.map((r) => (
          <button
            key={r.name}
            type="button"
            onClick={() => toggle(r.name)}
            aria-pressed={r.online}
            className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-accent/5"
          >
            <div className="min-w-[120px] flex-1">
              <div className="font-semibold">{r.name}</div>
              <div className="text-sm text-muted">{r.branch}</div>
            </div>
            <div className={`flex items-center gap-2 font-medium transition-colors ${r.online ? "" : "text-danger"}`}>
              <span className="relative flex h-2.5 w-2.5">
                {!r.online && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />}
                <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${r.online ? "bg-accent" : "bg-danger"}`} />
              </span>
              {r.online ? "Online" : "Offline, kasir masih dibuka"}
            </div>
            <div key={r.tick} className={`w-32 rounded-md text-right font-mono text-sm ${r.tick > 0 ? "anim-flash" : ""}`}>{rp(r.sales)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Metode pembayaran ---------- */
const PAY: { name: string; locked?: boolean; on: string }[] = [
  { name: "Cash", locked: true, on: "bg-sun text-sun-ink" },
  { name: "Transfer bank", locked: true, on: "bg-sun text-sun-ink" },
  { name: "QRIS", on: "bg-sky-300 text-sky-950" },
  { name: "GoFood", on: "bg-rose-300 text-rose-950" },
  { name: "GrabFood", on: "bg-emerald-300 text-emerald-950" },
  { name: "ShopeeFood", on: "bg-orange-300 text-orange-950" },
  { name: "GoSend", on: "bg-lime-300 text-lime-950" },
  { name: "Grab Barang", on: "bg-teal-200 text-teal-950" },
  { name: "Paket", on: "bg-violet-300 text-violet-950" },
  { name: "OVO atau Dana", on: "bg-fuchsia-300 text-fuchsia-950" },
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
                className={`rounded-full px-3.5 py-1.5 transition-all duration-200 ${
                  isOn ? `${p.on} scale-105 shadow-lg` : "border border-white/40 text-white hover:-translate-y-0.5 hover:bg-white/15"
                } ${p.locked ? "cursor-default" : "cursor-pointer active:scale-95"}`}
              >
                {isOn && !p.locked ? "✓ " : ""}{p.name}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-sm text-white/85">
        <span key={active.length} className="anim-pop mr-1 inline-block rounded-md bg-white/20 px-2 py-0.5 font-bold">{active.length}</span>
        metode aktif. Coba klik untuk menambah.
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
    `rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${active ? "bg-violet-500 text-white shadow" : "bg-violet-500/10 hover:bg-violet-500/20"}`;
  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold">PPN</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() => setOn(!on)}
          className={`relative h-7 w-12 rounded-full transition-colors ${on ? "bg-violet-500" : "bg-line"}`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
          <span className="sr-only">Nyalakan PPN</span>
        </button>
      </div>
      <div className={`mt-3 space-y-2 transition-opacity ${on ? "" : "pointer-events-none opacity-40"}`}>
        <div className="flex gap-2">{[11, 12].map((r) => <button key={r} type="button" onClick={() => setRate(r)} className={seg(rate === r)}>{r}%</button>)}</div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setIncl(false)} className={seg(!incl)}>Ditambah</button>
          <button type="button" onClick={() => setIncl(true)} className={seg(incl)}>Sudah termasuk</button>
        </div>
      </div>
      <dl className="mt-4 space-y-1 border-t border-line pt-3 font-mono">
        <div className="flex justify-between"><dt className="text-muted">Harga</dt><dd>{rp(price)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">PPN {on ? `${rate}%` : "mati"}</dt><dd key={ppn} className="anim-pop">{rp(ppn)}</dd></div>
        <div className="flex justify-between text-base font-extrabold"><dt>Total</dt><dd key={total} className="anim-pop text-violet-600 dark:text-violet-300">{rp(total)}</dd></div>
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
  const btn = "rounded-lg bg-amber-500/15 px-3 py-1.5 text-sm font-semibold transition-all hover:bg-amber-500/30 active:scale-95";
  return (
    <div className="mt-5 rounded-2xl border border-line bg-surface p-4 text-sm">
      <div className="flex justify-between font-mono"><span className="text-muted">Seharusnya di laci</span><span>{rp(expected)}</span></div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" className={btn} onClick={() => setCounted((c) => Math.max(0, c - 50000))}>− 50.000</button>
        <span key={counted} className="anim-pop font-mono font-bold">{rp(counted)}</span>
        <button type="button" className={btn} onClick={() => setCounted((c) => c + 50000)}>+ 50.000</button>
      </div>
      <div className={`mt-3 flex justify-between border-t border-line pt-3 font-mono font-extrabold ${tone}`}>
        <span>{label}</span><span key={diff} className="anim-pop">{diff === 0 ? "Rp 0" : (diff < 0 ? "−" : "+") + rp(Math.abs(diff))}</span>
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
    tab: "bg-accent text-white", soft: "border-accent/40 bg-accent/10",
  },
  {
    t: "Kepala cabang",
    d: "Mengelola kasir dan gudang di cabangnya, memantau kasir yang sedang online, dan melihat keuangan cabang.",
    can: ["Kelola kasir dan gudang", "Pantau kasir online", "Lihat keuangan cabang"],
    cant: ["Mengatur cabang lain"],
    tab: "bg-sky-500 text-white", soft: "border-sky-500/40 bg-sky-500/10",
  },
  {
    t: "Kasir",
    d: "Membuka kasir, melayani pembeli, mencetak struk, lalu menutup kasir dengan laporan penjualan shift.",
    can: ["Buka kasir", "Layani pembeli", "Cetak struk", "Tutup kasir"],
    cant: ["Mengubah harga"],
    tab: "bg-amber-500 text-white", soft: "border-amber-500/40 bg-amber-500/10",
  },
  {
    t: "Gudang",
    d: "Menambah produk, mengubah harga, dan memperbarui stok cabang.",
    can: ["Tambah produk", "Ubah harga", "Perbarui stok"],
    cant: ["Melihat keuangan"],
    tab: "bg-violet-500 text-white", soft: "border-violet-500/40 bg-violet-500/10",
  },
];

export function RoleExplorer() {
  const [i, setI] = useState(0);
  const r = ROLES[i];
  return (
    <div>
      <div role="tablist" aria-label="Peran" className="flex flex-wrap gap-2">
        {ROLES.map((x, idx) => (
          <button
            key={x.t}
            role="tab"
            aria-selected={i === idx}
            type="button"
            onClick={() => setI(idx)}
            className={`rounded-full px-4 py-2 font-bold transition-all duration-200 ${
              i === idx ? `${x.tab} scale-105 shadow-lg` : "border border-line bg-surface hover:-translate-y-0.5 hover:border-accent"
            }`}
          >
            {x.t}
          </button>
        ))}
      </div>
      <div key={i} role="tabpanel" className={`anim-pop mt-5 rounded-3xl border p-6 ${r.soft}`}>
        <h3 className="text-xl font-bold">{r.t}</h3>
        <p className="mt-2 leading-7 text-muted">{r.d}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {r.can.map((c, n) => (
            <span key={c} style={{ animationDelay: `${n * 70}ms` }} className="anim-pop rounded-full bg-accent/15 px-3 py-1 text-sm font-semibold text-accent dark:text-link">✓ {c}</span>
          ))}
          {r.cant.map((c, n) => (
            <span key={c} style={{ animationDelay: `${(r.can.length + n) * 70}ms` }} className="anim-pop rounded-full bg-rose-500/15 px-3 py-1 text-sm font-semibold text-rose-700 dark:text-rose-300">✕ {c}</span>
          ))}
          {r.cant.length === 0 && <span className="rounded-full bg-sun px-3 py-1 text-sm font-semibold text-sun-ink">Akses penuh</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tiga langkah (jalan otomatis, bisa diklik) ---------- */
const STEPS = [
  ["Daftarkan toko", "Isi nama toko, pilih jenis usaha, lalu buat akun kepala toko. Cabang pertama langsung jadi.", "bg-rose-500"],
  ["Tambah cabang dan tim", "Buat cabang lain bila perlu, lalu tambahkan kepala cabang, kasir, dan gudang. Atur PPN dan metode pembayaran di Pengaturan.", "bg-sky-500"],
  ["Isi produk dan mulai jualan", "Gudang mengisi produk. Kasir membuka kasir, melayani pembeli, mencetak struk, dan menutup kasir di akhir shift.", "bg-accent"],
];
const STEP_MS = 4500;

export function Steps() {
  const [a, setA] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const id = setTimeout(() => setA((x) => (x + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [a, auto]);
  return (
    <ol className="mt-10 grid gap-5 md:grid-cols-3">
      {STEPS.map(([t, d, c], i) => {
        const on = a === i;
        return (
          <li key={t}>
            <button
              type="button"
              onClick={() => { setA(i); setAuto(false); }}
              aria-current={on ? "step" : undefined}
              className={`relative h-full w-full overflow-hidden rounded-3xl border p-6 text-left transition-all duration-300 ${
                on ? "-translate-y-1 border-accent bg-paper shadow-xl" : "border-line bg-paper/50 opacity-70 hover:opacity-100"
              }`}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-extrabold text-white transition-transform duration-300 ${c} ${on ? "scale-110 rotate-6" : ""}`} aria-hidden="true">{i + 1}</span>
              <h3 className="mt-4 text-xl font-bold tracking-tight">{t}</h3>
              <p className="mt-2 leading-7 text-muted">{d}</p>
              {on && (
                <span className="absolute inset-x-0 bottom-0 h-1 bg-line">
                  <span
                    className={`block h-full ${c} ${auto ? "anim-fill" : ""}`}
                    style={auto ? { animationDuration: `${STEP_MS}ms` } : { width: "100%" }}
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