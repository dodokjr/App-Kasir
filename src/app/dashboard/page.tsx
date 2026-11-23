"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Shell, { Avatar, Ico, ROLE_LABEL } from "@/components/Shell";
import ReceiptModal from "@/components/ReceiptModal";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { addDays, api, rp, tgl, wibDay } from "@/lib/client";
import type { Me, ReceiptData } from "@/lib/types";
import type { MonitorRow, ShiftOut } from "@/lib/shiftTypes";

type R = Record<string, string>;
type Fin = { summary: { sales: number; txCount: number; avgTicket: number; shiftsOpen: number }; daily: { date: string; sales: number; tx: number }[] };
type Mon = { rows: MonitorRow[] };
type Tg = { month: string; store: { target: number; sales: number; pct: number | null; status: string }; branches: { branchId: string; target: number; sales: number; pct: number | null; status: string }[] };
type Day = { date: string; sales: number; tx: number };

/* ---------- animasi dan gaya tambahan ---------- */

const CSS = `
@keyframes dash-rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.dash-rise{animation:dash-rise .5s cubic-bezier(.2,.7,.2,1) both}
@keyframes dash-grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}
.dash-grow{transform-origin:bottom;animation:dash-grow .6s cubic-bezier(.2,.8,.2,1) both}
@keyframes dash-fillx{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.dash-fillx{transform-origin:left;animation:dash-fillx .9s cubic-bezier(.2,.8,.2,1) both}
@keyframes dash-pop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
.dash-pop{animation:dash-pop .3s ease-out both}
@keyframes dash-toast{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.dash-toast{animation:dash-toast .25s ease-out both}
.dash-lift{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
.dash-lift:hover{transform:translateY(-3px);box-shadow:0 14px 30px -18px rgb(0 0 0 / .35)}
@media (prefers-reduced-motion:reduce){
  .dash-rise,.dash-grow,.dash-fillx,.dash-pop,.dash-toast{animation:none!important}
  .dash-lift:hover{transform:none}
}
`;

/* Angka naik pelan-pelan ke nilai barunya */
function useCountUp(target: number, ms = 800) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      from.current = target;
      setV(target);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const cur = a + (target - a) * (1 - Math.pow(1 - p, 3));
      from.current = cur;
      setV(cur);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

const ago = (ms: number) => {
  const s = Math.floor(ms / 1000);
  if (s < 10) return "baru saja";
  if (s < 60) return `${s} detik lalu`;
  return `${Math.floor(s / 60)} menit lalu`;
};

/* ---------- potongan kecil yang dipakai ulang ---------- */

function Notice({ msg, onClose }: { msg: string; onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!msg) return;
    const t = window.setTimeout(() => close.current(), 3500);
    return () => window.clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div key={msg} role="status" className="dash-toast fixed inset-x-4 bottom-5 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-paper shadow-2xl">
      <span className="min-w-0 flex-1">{msg}</span>
      <button type="button" onClick={onClose} aria-label="Tutup" className="opacity-70 transition hover:opacity-100">✕</button>
    </div>
  );
}

function Chip({ active, onClick, tone, children }: { active: boolean; onClick: () => void; tone?: "warn"; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm font-semibold transition active:scale-95 ${
        active ? (tone === "warn" ? "border-danger bg-danger text-white" : "border-accent bg-accent text-white") : "border-line hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

function CopyText({ text, className = "" }: { text: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title="Klik untuk menyalin"
      className={`${className} rounded text-left transition hover:text-link`}
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setOk(true); window.setTimeout(() => setOk(false), 1500); } catch {}
      }}
    >
      {ok ? "Tersalin ✓" : text}
    </button>
  );
}

function Disclosure({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div>
      <button type="button" className="btn-ghost" aria-expanded={open} onClick={onToggle}>{open ? "Tutup formulir" : `+ ${label}`}</button>
      {open && <div className="dash-rise mt-4 rounded-xl border border-line bg-paper p-4">{children}</div>}
    </div>
  );
}

function Kpi({ label, value, num, fmt, sub, tone, loading, href, delay = 0 }: {
  label: string; value?: string; num?: number; fmt?: (n: number) => string; sub?: ReactNode; tone?: "warn"; loading?: boolean; href?: string; delay?: number;
}) {
  const n = useCountUp(num ?? 0);
  const text = num !== undefined ? (fmt ? fmt(Math.round(n)) : String(Math.round(n))) : (value ?? "");
  const body = (
    <>
      <div className="flex items-center justify-between text-sm font-medium text-muted">
        <span>{label}</span>
        {href && <span className="translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true">→</span>}
      </div>
      {loading ? <div className="mt-2 h-9 w-32 animate-pulse rounded-lg bg-line motion-reduce:animate-none" aria-label="Memuat" /> : <div className={`mt-1 text-3xl font-extrabold tracking-tight ${tone === "warn" ? "text-danger" : ""}`}>{text}</div>}
      {sub && !loading && <div className="mt-1 text-sm text-muted">{sub}</div>}
    </>
  );
  const style = { animationDelay: `${delay}ms` };
  return href ? (
    <Link href={href} style={style} className="card dash-rise dash-lift group block p-5 hover:border-accent">{body}</Link>
  ) : (
    <div style={style} className="card dash-rise p-5">{body}</div>
  );
}

function Section({ title, count, action, delay = 0, children }: { title: string; count?: number; action?: ReactNode; delay?: number; children: ReactNode }) {
  return (
    <section className="card dash-rise space-y-4 p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        {count !== undefined && <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent dark:text-link">{count}</span>}
        <div className="ml-auto">{action}</div>
      </div>
      {children}
    </section>
  );
}

function StaffForm({ roles, branches, onDone }: { roles: string[]; branches?: R[]; onDone: () => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: roles[0], branchId: branches?.[0]?.id ?? "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (branches?.length && !f.branchId) setF((p) => ({ ...p, branchId: branches[0].id })); }, [branches, f.branchId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await api("/api/users", { method: "POST", body: f }); setF({ ...f, name: "", email: "", password: "" }); onDone(); }
    catch (x) { setErr((x as Error).message); }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="sf-name">Nama</label><input id="sf-name" required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label" htmlFor="sf-email">Email untuk masuk</label><input id="sf-email" required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div>
        <label className="label" htmlFor="sf-pw">Password (minimal 6 karakter)</label>
        <input id="sf-pw" required minLength={6} type={show ? "text" : "password"} className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        <label className="mt-1.5 flex items-center gap-2 text-xs text-muted"><input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />Tampilkan password</label>
      </div>
      <div><label className="label" htmlFor="sf-role">Peran</label>
        <select id="sf-role" className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select></div>
      {branches && (
        <div className="sm:col-span-2"><label className="label" htmlFor="sf-branch">Cabang</label>
          <select id="sf-branch" className="input" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}, {b.street}</option>)}
          </select></div>
      )}
      <p className="text-sm text-muted sm:col-span-2">Setelah dibuat, berikan email dan password ini kepada orangnya langsung.</p>
      {err && <p className="text-sm font-medium text-danger sm:col-span-2" role="alert">{err}</p>}
      <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Tambah akun"}</button></div>
    </form>
  );
}

/* ---------- Developer dan admin ---------- */

function Platform({ me }: { me: Me }) {
  const [stores, setStores] = useState<R[]>([]);
  const [users, setUsers] = useState<R[]>([]);
  const [unread, setUnread] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"" | "aktif" | "nonaktif">("");
  const dev = me.session.role === "developer";

  const load = useCallback(async () => {
    const [s, u, m] = await Promise.allSettled([api<R[]>("/api/stores"), api<R[]>("/api/users"), api<{ unread: number }>("/api/messages")]);
    if (s.status === "fulfilled") setStores(s.value);
    if (u.status === "fulfilled") setUsers(u.value.filter((x) => x.role === "admin"));
    if (m.status === "fulfilled") setUnread(m.value.unread);
    const bad = [s, u].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    setErr(bad ? String(bad.reason?.message ?? bad.reason) : "");
    setReady(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const active = stores.filter((s) => s.active !== "FALSE").length;
  const shown = stores.filter((s) => {
    const on = s.active !== "FALSE";
    if (st === "aktif" && !on) return false;
    if (st === "nonaktif" && on) return false;
    const needle = q.trim().toLowerCase();
    return !needle || s.name.toLowerCase().includes(needle);
  });

  async function toggle(s: R) {
    const off = s.active !== "FALSE";
    if (off && !confirm(`Nonaktifkan toko "${s.name}"? Semua akun di toko ini tidak bisa berjualan sampai diaktifkan lagi.`)) return;
    try {
      await api("/api/stores", { method: "PATCH", body: { id: s.id, active: !off } });
      setNote(off ? `Toko "${s.name}" dinonaktifkan.` : `Toko "${s.name}" diaktifkan.`);
      load();
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <div className="space-y-6">
      <style>{CSS}</style>
      <Notice msg={note} onClose={() => setNote("")} />

      <header className="dash-rise">
        <h1 className="text-3xl font-extrabold tracking-tight">Ringkasan platform</h1>
        <p className="mt-1 text-muted">Semua toko yang terdaftar dan pesan dari halaman Kontak.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Toko aktif" num={active} sub={`dari ${stores.length} toko terdaftar`} loading={!ready} delay={60} />
        <Kpi label="Toko nonaktif" num={stores.length - active} loading={!ready} delay={120} />
        <Link href="/pesan" style={{ animationDelay: "180ms" }} className="card dash-rise dash-lift group block p-5 hover:border-accent">
          <div className="text-sm font-medium text-muted">Pesan Kontak</div>
          <div className="mt-1 text-3xl font-extrabold tracking-tight">{unread === null ? "…" : unread}</div>
          <div className="mt-1 text-sm text-link">{unread ? "belum dibaca. Buka kotak pesan" : "Tidak ada pesan baru"}</div>
        </Link>
      </div>
      {err && <p className="text-sm font-medium text-danger" role="alert">{err}</p>}

      <Section title="Semua toko" count={stores.length} delay={240}>
        {stores.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <input type="search" aria-label="Cari toko" placeholder="Cari nama toko" className="input max-w-xs flex-1" value={q} onChange={(e) => setQ(e.target.value)} />
            <Chip active={st === ""} onClick={() => setSt("")}>Semua</Chip>
            <Chip active={st === "aktif"} onClick={() => setSt(st === "aktif" ? "" : "aktif")}>Aktif</Chip>
            <Chip active={st === "nonaktif"} onClick={() => setSt(st === "nonaktif" ? "" : "nonaktif")}>Nonaktif</Chip>
          </div>
        )}
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th pl-5">Toko</th><th className="th">Jenis</th><th className="th">Cabang</th><th className="th">Akun</th><th className="th">Status</th><th className="th pr-5"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {shown.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-paper">
                  <td className="td pl-5 font-semibold">{s.name}</td>
                  <td className="td">{({ fnb: "F&B", retail: "Retail", sembako: "Sembako", lainnya: "Lainnya" } as R)[s.businessType] ?? "Retail"}</td>
                  <td className="td">{s.branches}</td><td className="td">{s.users}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.active === "FALSE" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent dark:text-link"}`}>{s.active === "FALSE" ? "Nonaktif" : "Aktif"}</span></td>
                  <td className="td pr-5 text-right"><button className="btn-ghost" onClick={() => toggle(s)}>{s.active === "FALSE" ? "Aktifkan" : "Nonaktifkan"}</button></td>
                </tr>
              ))}
              {ready && !stores.length && <tr><td className="td pl-5 text-muted" colSpan={6}>Belum ada toko terdaftar.</td></tr>}
              {ready && stores.length > 0 && !shown.length && <tr><td className="td pl-5 text-muted" colSpan={6}>Tidak ada toko yang cocok dengan pencarian.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {dev && (
        <Section title="Akun admin" count={users.length} delay={300}>
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3"><Avatar name={u.name} /><div><div className="font-semibold">{u.name}</div><div className="text-sm text-muted">{u.email}</div></div></li>
            ))}
            {ready && !users.length && <li className="py-3 text-sm text-muted">Belum ada akun admin.</li>}
          </ul>
          <Disclosure label="Tambah admin" open={adding} onToggle={() => setAdding(!adding)}><StaffForm roles={["admin"]} onDone={() => { load(); setAdding(false); setNote("Akun admin ditambahkan."); }} /></Disclosure>
        </Section>
      )}
    </div>
  );
}

/* ---------- Kepala toko dan kepala cabang ---------- */

const greeting = () => {
  const h = Number(new Date().toLocaleString("id-ID", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }));
  return h < 11 ? "Selamat pagi" : h < 15 ? "Selamat siang" : h < 18 ? "Selamat sore" : "Selamat malam";
};

/* Grafik 7 hari: sentuh atau klik batang untuk melihat rinciannya */
function WeekChart({ days, today }: { days: Day[]; today: string }) {
  const [metric, setMetric] = useState<"sales" | "tx">("sales");
  const [sel, setSel] = useState<number | null>(null);
  const idx = sel ?? days.length - 1;
  const val = (d: Day) => (metric === "sales" ? d.sales : d.tx);
  const max = Math.max(1, ...days.map(val));
  const total = days.reduce((a, d) => a + d.sales, 0);
  const txTotal = days.reduce((a, d) => a + d.tx, 0);
  const cur = days[idx];
  const prev = idx > 0 ? days[idx - 1] : undefined;
  const diff = prev && prev.sales ? Math.round(((cur.sales - prev.sales) / prev.sales) * 100) : null;
  const dayName = (d: string, o: Intl.DateTimeFormatOptions) => new Date(d + "T00:00:00Z").toLocaleDateString("id-ID", { ...o, timeZone: "UTC" });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Penjualan 7 hari terakhir</h2>
          <p className="text-sm text-muted">Total {rp(total)}, {txTotal} transaksi</p>
        </div>
        <div className="flex gap-1.5" role="group" aria-label="Tampilkan grafik berdasarkan">
          <Chip active={metric === "sales"} onClick={() => setMetric("sales")}>Rupiah</Chip>
          <Chip active={metric === "tx"} onClick={() => setMetric("tx")}>Transaksi</Chip>
        </div>
      </div>

      <div key={`${idx}-${metric}`} className="dash-pop mt-4 rounded-xl bg-paper px-4 py-3" aria-live="polite">
        <div className="text-sm font-semibold">{dayName(cur.date, { weekday: "long", day: "numeric", month: "long" })}{cur.date === today ? " (hari ini)" : ""}</div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 text-sm text-muted">
          <span className="text-lg font-extrabold text-ink">{rp(cur.sales)}</span>
          <span>{cur.tx} transaksi</span>
          {diff !== null && <span className={diff >= 0 ? "font-semibold text-accent dark:text-link" : "font-semibold text-danger"}>{diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}% dari hari sebelumnya</span>}
        </div>
      </div>

      <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3" role="group" aria-label="Grafik penjualan 7 hari terakhir">
        {days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            aria-pressed={i === idx}
            aria-label={`${d.date}: ${rp(d.sales)}, ${d.tx} transaksi`}
            onClick={() => setSel(i)}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            className="group flex h-full flex-1 flex-col justify-end rounded-t-lg"
          >
            <div
              className={`dash-grow w-full rounded-t-lg transition-[height,background-color] duration-500 ${i === idx ? "bg-accent" : d.date === today ? "bg-accent/60" : "bg-accent/30 group-hover:bg-accent/60"}`}
              style={{ height: val(d) ? `${Math.max(4, (val(d) / max) * 100)}%` : "3px", opacity: val(d) ? 1 : 0.4, animationDelay: `${i * 60}ms` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-xs text-muted sm:gap-3" aria-hidden="true">
        {days.map((d, i) => (
          <div key={d.date} className={`flex-1 text-center transition ${i === idx ? "font-bold text-ink" : ""}`}>{dayName(d.date, { weekday: "short" })}</div>
        ))}
      </div>
    </div>
  );
}

function Team({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [users, setUsers] = useState<R[]>([]);
  const [txs, setTxs] = useState<R[]>([]);
  const [fin, setFin] = useState<Fin | null>(null);
  const [mon, setMon] = useState<Mon | null>(null);
  const [tg, setTg] = useState<Tg | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [bf, setBf] = useState({ name: "", street: "" });
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [note, setNote] = useState("");
  const [ready, setReady] = useState(false);
  const [addBranch, setAddBranch] = useState(false);
  const [addStaff, setAddStaff] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [rcptBusy, setRcptBusy] = useState("");
  const [branch, setBranch] = useBranch("");
  // "" = semua cabang. Pilihan yang tidak dikenal (misal cabang lama) dianggap semua cabang
  const active = owner && branches.some((b) => b.id === branch) ? branch : "";

  // Pembaruan otomatis
  const [live, setLive] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Filter transaksi dan tim
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("");
  const [onlyReview, setOnlyReview] = useState(false);
  const [visible, setVisible] = useState(10);
  const [tq, setTq] = useState("");
  const [roleF, setRoleF] = useState("");

  const today = wibDay();
  const load = useCallback(async () => {
    const from = addDays(today, -6);
    const [b, u, t, f, m, g] = await Promise.allSettled([
      api<R[]>("/api/branches"), api<R[]>("/api/users"), api<R[]>(`/api/transactions?branchId=${active}`),
      api<Fin>(`/api/finance?from=${from}&to=${today}&branchId=${active}`), api<Mon>("/api/presence"), api<Tg>("/api/targets"),
    ]);
    if (b.status === "fulfilled") setBranches(b.value);
    if (u.status === "fulfilled") setUsers(u.value);
    if (t.status === "fulfilled") setTxs(t.value);
    if (f.status === "fulfilled") setFin(f.value);
    if (m.status === "fulfilled") setMon(m.value);
    if (g.status === "fulfilled") setTg(g.value);
    const bad = [b, u, t, f].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    setLoadErr(bad ? String(bad.reason?.message ?? bad.reason) : "");
    setReady(true);
    setUpdated(Date.now());
    // Jumlah produk hanya dicek untuk toko yang belum punya transaksi (daftar langkah awal)
    if (t.status === "fulfilled" && !t.value.length) api<R[]>("/api/products").then((p) => setProductCount(p.length)).catch(() => {});
  }, [active, today]);
  useEffect(() => { load(); }, [load]);

  // Muat ulang tiap 30 detik selama tab terlihat
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => { if (document.visibilityState === "visible") load(); }, 30000);
    return () => window.clearInterval(id);
  }, [live, load]);
  // Hitung mundur "diperbarui ... lalu"
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, []);

  async function reload() {
    if (refreshing) return;
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function openReceipt(id: string) {
    if (rcptBusy) return;
    setRcptBusy(id);
    try { setReceipt(await api<ReceiptData>(`/api/transactions?id=${id}`)); }
    catch (x) { setNote((x as Error).message || "Struk gagal dibuka."); }
    setRcptBusy("");
  }

  const bname = (id: string) => { const b = branches.find((x) => x.id === id); return b ? `${b.name} (${b.street})` : "-"; };
  const branchUsers = active ? users.filter((u) => u.branchId === active) : users;

  // Angka hari ini dan perbandingan dengan kemarin
  const day = (d: string) => fin?.daily.find((x) => x.date === d);
  const td = day(today), yd = day(addDays(today, -1));
  const sales = td?.sales ?? 0, txCount = td?.tx ?? 0;
  const delta = yd?.sales ? Math.round(((sales - yd.sales) / yd.sales) * 100) : null;
  const week: Day[] = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { date: d, sales: day(d)?.sales ?? 0, tx: day(d)?.tx ?? 0 }; });

  const cashiers = (mon?.rows ?? []).filter((r) => !active || r.branchId === active);
  const onlineN = cashiers.filter((r) => r.status === "online").length;
  const alerts = cashiers.filter((r) => r.alert);

  // Tim: filter peran dan pencarian
  const roleList = Array.from(new Set(branchUsers.map((u) => u.role)));
  const teamRows = branchUsers.filter((u) => {
    if (roleF && u.role !== roleF) return false;
    const n = tq.trim().toLowerCase();
    return !n || `${u.name} ${u.email}`.toLowerCase().includes(n);
  });

  // Transaksi: filter pembayaran, perlu ditinjau, dan pencarian
  const payOf = (t: R) => t.paymentLabel || "Cash";
  const payLabels = Array.from(new Set(txs.map(payOf)));
  const reviewN = txs.filter((t) => t.review).length;
  const filtered = txs.filter((t) => {
    if (onlyReview && !t.review) return false;
    if (pay && payOf(t) !== pay) return false;
    const n = q.trim().toLowerCase();
    return !n || `${t.invoice} ${t.cashierName} ${t.orderNo ?? ""}`.toLowerCase().includes(n);
  });
  const shownTx = filtered.slice(0, visible);
  const filtering = !!(q.trim() || pay || onlyReview);
  const resetFilters = () => { setQ(""); setPay(""); setOnlyReview(false); setVisible(10); };

  // Langkah awal untuk toko baru
  const hasKasir = users.some((u) => u.role === "kasir");
  const steps = [
    { done: hasKasir, t: "Tambahkan akun kasir", d: "Buat akun untuk orang yang akan melayani pembeli.", href: "#tim", cta: "Ke bagian Tim" },
    { done: (productCount ?? 0) > 0, t: "Isi produk di Gudang", d: "Masukkan nama, harga, satuan, dan stok barang.", href: "/gudang", cta: "Buka Gudang" },
    { done: false, t: "Buka kasir dan coba satu penjualan", d: "Setelah ada produk, buka kasir dan catat penjualan pertama.", href: "/kasir", cta: "Buka Kasir" },
  ];
  const showSteps = ready && txs.length === 0 && productCount !== null;
  const doneN = steps.filter((s) => s.done).length;

  return (
    <div className="space-y-6">
      <style>{CSS}</style>
      <Notice msg={note} onClose={() => setNote("")} />
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      <header className="dash-rise flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{greeting()}, {me.session.name.split(" ")[0]}</h1>
          <p className="mt-1 text-muted">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}.{" "}
            {active ? `Menampilkan cabang ${bname(active)}.` : owner ? "Menampilkan semua cabang." : `Cabang ${me.branch?.name ?? ""}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {owner && branches.length > 1 && <div className="w-64 max-w-full"><BranchSelect branches={branches} value={active} onChange={setBranch} allowAll /></div>}
          <button
            type="button"
            className="btn-ghost inline-flex items-center gap-2"
            aria-pressed={live}
            onClick={() => setLive(!live)}
            title={live ? "Data diperbarui otomatis tiap 30 detik. Klik untuk menghentikan." : "Klik untuk memperbarui data otomatis tiap 30 detik."}
          >
            <span className="relative flex h-2.5 w-2.5">
              {live && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" />}
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${live ? "bg-accent" : "bg-muted"}`} />
            </span>
            Otomatis
          </button>
          <button className="btn-ghost inline-flex items-center gap-2" onClick={reload} disabled={refreshing}>
            <svg className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 3v6h-6" /></svg>
            {refreshing ? "Memuat…" : "Muat ulang"}
          </button>
        </div>
        {updated && <p className="w-full text-xs text-muted" aria-live="off">Diperbarui {ago(now - updated)}</p>}
      </header>

      {loadErr && <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{loadErr}</p>}

      {alerts.length > 0 && (
        <div className="dash-rise flex flex-wrap items-center gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-5 py-4" role="alert">
          <span className="relative flex h-3 w-3 flex-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-danger" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-bold text-danger">{alerts.length} kasir terbuka tetapi offline</div>
            <div className="text-sm">{alerts.map((a) => a.name).join(", ")}. Hubungi kasir untuk memastikan koneksinya.</div>
          </div>
          <Link href="/monitor" className="btn-primary">Lihat pantau kasir</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Penjualan hari ini" num={sales} fmt={rp} href="/keuangan" loading={!ready} delay={40}
          sub={delta === null ? (yd ? "Kemarin tidak ada penjualan" : "Belum ada pembanding kemarin") : <span className={delta >= 0 ? "font-semibold text-accent dark:text-link" : "font-semibold text-danger"}>{delta >= 0 ? "Naik" : "Turun"} {Math.abs(delta)}% dari kemarin</span>} />
        <Kpi label="Transaksi hari ini" num={txCount} href="#transaksi" loading={!ready} delay={100} sub={txCount ? `Rata-rata ${rp(Math.round(sales / txCount))}` : "Belum ada transaksi"} />
        <Kpi label="Kasir online" value={mon ? `${onlineN} dari ${cashiers.length}` : "-"} href="/monitor" loading={!ready} delay={160} sub={mon ? `${cashiers.filter((r) => r.shiftOpen).length} kasir sedang dibuka` : "Data tidak tersedia"} />
        <Kpi label="Perlu dicek" num={alerts.length} tone={alerts.length ? "warn" : undefined} href="/monitor" loading={!ready} delay={220} sub={alerts.length ? "Kasir terbuka tetapi offline" : "Semua kasir aman"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card dash-rise p-5" style={{ animationDelay: "120ms" }}>{ready ? <WeekChart days={week} today={today} /> : <div className="h-52 animate-pulse rounded-xl bg-line motion-reduce:animate-none" aria-label="Memuat grafik" />}</section>

        <section className="card dash-rise p-5" style={{ animationDelay: "180ms" }} aria-label="Pintasan">
          <h2 className="text-lg font-bold">Pintasan</h2>
          <ul className="mt-3 space-y-1">
            {[
              ["/kasir", "kasir", "Buka kasir", "Mulai berjualan"],
              ["/sewa", "sewa", "Booking & sewa", "Jadwal dan harga per hari"],
              ["/gudang", "gudang", "Gudang", "Produk dan stok"],
              ["/keuangan", "keuangan", "Keuangan", "Penjualan dan pengeluaran"],
              ["/target", "target", "Target dan pencapaian", "Target penjualan bulanan"],
              ["/peta", "peta", "Peta toko", "Letak semua cabang"],
              ["/permintaan", "permintaan", "Permintaan barang", owner ? "Permintaan dari cabang" : "Minta barang ke kepala toko"],
              ["/monitor", "monitor", "Pantau kasir", "Online atau offline"],
              ...(owner ? [["/pengaturan", "pengaturan", "Pengaturan", "Struk, PPN, pembayaran"]] : []),
            ].map(([href, ic, t, d]) => (
              <li key={href}>
                <Link href={href} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-paper">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-accent/10 text-accent transition group-hover:scale-110 group-hover:bg-accent group-hover:text-white dark:text-link"><Ico n={ic} /></span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold leading-tight">{t}</span><span className="text-sm text-muted">{d}</span></span>
                  <span className="-translate-x-1 text-muted opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {tg && (() => {
        const row = active ? tg.branches.find((x) => x.branchId === active) : tg.store;
        if (!row) return null;
        const pct = Math.min(100, Math.round((row.pct ?? 0) * 100));
        const label = new Date(tg.month + "-01T00:00:00Z").toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
        return (
          <Link href="/target" className="card dash-rise dash-lift group block p-5 hover:border-accent" style={{ animationDelay: "220ms" }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-bold">Target {label}</h2>
              <span className="text-sm font-semibold text-link">Lihat pencapaian <span className="inline-block transition group-hover:translate-x-1" aria-hidden="true">→</span></span>
            </div>
            {row.target > 0 ? (
              <>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-label="Pencapaian target bulan ini" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
                  <div key={pct} className={`dash-fillx h-full rounded-full ${row.status === "tertinggal" ? "bg-sun" : "bg-accent"}`} style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-2 text-sm"><strong>{Math.round((row.pct ?? 0) * 100)}%</strong> <span className="text-muted">({rp(row.sales)} dari {rp(row.target)})</span></p>
              </>
            ) : <p className="mt-2 text-sm text-muted">{owner ? "Belum ada target bulan ini. Tekan untuk mengatur target tiap cabang." : "Kepala toko belum mengatur target bulan ini."}</p>}
          </Link>
        );
      })()}

      {showSteps && (
        <section className="dash-rise rounded-2xl bg-sun/20 p-5 sm:p-6" aria-label="Langkah awal">
          <div className="flex flex-wrap items-baseline gap-3"><h2 className="text-lg font-bold">Mulai dari sini</h2><span className="text-sm font-medium text-muted">{doneN} dari {steps.length} langkah selesai</span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sun/40" aria-hidden="true">
            <div className="h-full origin-left rounded-full bg-accent transition-transform duration-700" style={{ transform: `scaleX(${doneN / steps.length})` }} />
          </div>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t} className="dash-lift flex gap-3 rounded-xl bg-surface p-4">
                <span key={String(s.done)} className={`${s.done ? "dash-pop " : ""}flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-extrabold ${s.done ? "bg-accent text-white" : "bg-sun text-sun-ink"}`} aria-hidden="true">{s.done ? "✓" : i + 1}</span>
                <div className="min-w-0">
                  <div className="font-bold">{s.t}{s.done && <span className="sr-only"> (selesai)</span>}</div>
                  <p className="mt-0.5 text-sm text-muted">{s.d}</p>
                  {!s.done && <Link href={s.href} className="mt-2 inline-block text-sm font-semibold text-link underline underline-offset-4">{s.cta}</Link>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <Section title="Cabang" count={branches.length} delay={80}
        action={owner ? <Disclosure label="Tambah cabang" open={addBranch} onToggle={() => setAddBranch(!addBranch)}>
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => {
            e.preventDefault(); setErr("");
            try { await api("/api/branches", { method: "POST", body: bf }); setBf({ name: "", street: "" }); setAddBranch(false); setNote("Cabang ditambahkan."); load(); } catch (x) { setErr((x as Error).message); }
          }}>
            <div><label className="label" htmlFor="bf-name">Nama cabang</label><input id="bf-name" required className="input" value={bf.name} onChange={(e) => setBf({ ...bf, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="bf-street">Nama jalan</label><input id="bf-street" required className="input" value={bf.street} onChange={(e) => setBf({ ...bf, street: e.target.value })} /></div>
            <div className="flex items-end"><button className="btn-primary w-full">Simpan cabang</button></div>
            {err && <p className="text-sm font-medium text-danger sm:col-span-3" role="alert">{err}</p>}
          </form>
        </Disclosure> : undefined}>
        {owner && branches.length > 1 && <p className="-mt-2 text-sm text-muted">Klik sebuah cabang untuk menampilkan datanya saja. Klik lagi untuk kembali ke semua cabang.</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const n = users.filter((u) => u.branchId === b.id).length;
            const on = b.id === active;
            const bt = tg?.branches.find((x) => x.branchId === b.id);
            const bpct = bt && bt.target > 0 ? Math.min(100, Math.round((bt.pct ?? 0) * 100)) : null;
            const inner = (
              <>
                <div className="font-bold">{b.name}</div>
                <div className="text-sm text-muted">Jl. {b.street}</div>
                <div className="mt-2 text-sm">{n} anggota tim</div>
                {bpct !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true"><div className={`dash-fillx h-full rounded-full ${bt?.status === "tertinggal" ? "bg-sun" : "bg-accent"}`} style={{ width: `${bpct}%` }} /></div>
                    <div className="mt-1 text-xs text-muted">{bpct}% dari target bulan ini</div>
                  </div>
                )}
              </>
            );
            const cls = `block w-full rounded-xl border p-4 text-left ${on ? "border-accent bg-accent/5" : "border-line"}`;
            return (
              <li key={b.id}>
                {owner ? (
                  <button type="button" aria-pressed={on} onClick={() => setBranch(on ? "" : b.id)} className={`${cls} dash-lift hover:border-accent`}>{inner}</button>
                ) : <div className={cls}>{inner}</div>}
              </li>
            );
          })}
          {ready && !branches.length && <li className="text-sm text-muted">Belum ada cabang.</li>}
        </ul>
      </Section>

      <div id="tim" className="scroll-mt-24">
        <Section title="Tim" count={branchUsers.length} delay={120}
          action={<Disclosure label="Tambah anggota tim" open={addStaff} onToggle={() => setAddStaff(!addStaff)}>
            <StaffForm roles={owner ? ["kepala_cabang", "kasir", "gudang"] : ["kasir", "gudang"]} branches={owner ? branches : undefined} onDone={() => { load(); setAddStaff(false); setNote("Akun anggota tim ditambahkan."); }} />
          </Disclosure>}>
          {branchUsers.length > 4 && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="search" aria-label="Cari anggota tim" placeholder="Cari nama atau email" className="input max-w-xs flex-1" value={tq} onChange={(e) => setTq(e.target.value)} />
              <Chip active={!roleF} onClick={() => setRoleF("")}>Semua</Chip>
              {roleList.map((r) => <Chip key={r} active={roleF === r} onClick={() => setRoleF(roleF === r ? "" : r)}>{ROLE_LABEL[r]}</Chip>)}
            </div>
          )}
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th pl-5">Nama</th><th className="th">Peran</th><th className="th">Cabang</th><th className="th pr-5">Email</th></tr></thead>
              <tbody className="divide-y divide-line">
                {teamRows.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-paper">
                    <td className="td pl-5"><div className="flex items-center gap-3"><Avatar name={u.name} size={32} /><span className="font-semibold">{u.name}</span></div></td>
                    <td className="td"><span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent dark:text-link">{ROLE_LABEL[u.role]}</span></td>
                    <td className="td">{bname(u.branchId)}</td><td className="td pr-5 text-muted"><CopyText text={u.email} /></td>
                  </tr>
                ))}
                {ready && !branchUsers.length && <tr><td className="td pl-5 text-muted" colSpan={4}>Belum ada anggota tim. Tambahkan kasir pertama Anda.</td></tr>}
                {ready && branchUsers.length > 0 && !teamRows.length && <tr><td className="td pl-5 text-muted" colSpan={4}>Tidak ada anggota tim yang cocok.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div id="transaksi" className="scroll-mt-24">
        <Section title="Transaksi terakhir" count={txs.length} delay={160}>
          {txs.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <input type="search" aria-label="Cari transaksi" placeholder="Cari invoice, kasir, atau pesanan" className="input max-w-xs flex-1" value={q} onChange={(e) => { setQ(e.target.value); setVisible(10); }} />
              <Chip active={!pay && !onlyReview} onClick={resetFilters}>Semua</Chip>
              {payLabels.length > 1 && payLabels.map((l) => <Chip key={l} active={pay === l} onClick={() => { setPay(pay === l ? "" : l); setVisible(10); }}>{l}</Chip>)}
              {reviewN > 0 && <Chip tone="warn" active={onlyReview} onClick={() => { setOnlyReview(!onlyReview); setVisible(10); }}>Perlu ditinjau ({reviewN})</Chip>}
            </div>
          )}

          {/* HP: daftar kartu. Layar lebar: tabel */}
          <ul className="divide-y divide-line md:hidden">
            {shownTx.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{rp(t.total)} <span className="text-sm font-normal text-muted">{payOf(t)}</span></div>
                  <div className="truncate text-sm text-muted">{tgl(t.createdAt)}, {t.cashierName}{t.orderNo ? `, pesanan #${t.orderNo}${t.tableNo ? `, meja ${t.tableNo}` : ""}` : ""}</div>
                  {Number(t.discountAmount) > 0 && <div className="text-xs text-muted">Diskon {t.discountName} -{rp(t.discountAmount)}</div>}
                  {t.offline === "TRUE" && <div className="text-xs font-semibold">Dicatat offline{t.review ? <span className="text-danger"> · Perlu ditinjau: {t.review}</span> : null}</div>}
                  <CopyText text={t.invoice} className="block max-w-full truncate font-mono text-xs text-muted" />
                </div>
                <button className="btn-ghost" disabled={!!rcptBusy} onClick={() => openReceipt(t.id)}>{rcptBusy === t.id ? "Membuka…" : "Struk"}</button>
              </li>
            ))}
          </ul>
          <div className="-mx-5 hidden overflow-x-auto md:block">
            <table className="w-full">
              <thead><tr><th className="th pl-5">Invoice</th><th className="th">Waktu</th><th className="th">Cabang</th><th className="th">Kasir</th><th className="th">Pembayaran</th><th className="th text-right">Total</th><th className="th pr-5"></th></tr></thead>
              <tbody className="divide-y divide-line">
                {shownTx.map((t) => (
                  <tr key={t.id} className="transition-colors hover:bg-paper">
                    <td className="td pl-5 font-mono text-xs"><CopyText text={t.invoice} /></td><td className="td">{tgl(t.createdAt)}</td><td className="td">{bname(t.branchId)}</td><td className="td">{t.cashierName}</td>
                    <td className="td">{payOf(t)}{t.orderNo ? <span className="block text-xs text-muted">Pesanan #{t.orderNo}{t.tableNo ? `, meja ${t.tableNo}` : ""}</span> : null}{Number(t.discountAmount) > 0 && <span className="block text-xs text-muted">Diskon {t.discountName} -{rp(t.discountAmount)}</span>}{t.offline === "TRUE" && <span className="block text-xs font-semibold">Dicatat offline</span>}{t.review && <span className="block max-w-[260px] text-xs font-semibold text-danger">Perlu ditinjau: {t.review}</span>}</td>
                    <td className="td text-right font-mono font-semibold">{rp(t.total)}</td>
                    <td className="td pr-5 text-right"><button className="btn-ghost" disabled={!!rcptBusy} onClick={() => openReceipt(t.id)}>{rcptBusy === t.id ? "Membuka…" : "Struk"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filtered.length > visible && (
            <button type="button" className="btn-ghost w-full" onClick={() => setVisible((v) => v + 10)}>Tampilkan 10 lagi ({filtered.length - visible} tersisa)</button>
          )}
          {filtering && txs.length > 0 && (
            <p className="text-sm text-muted">Menampilkan {Math.min(visible, filtered.length)} dari {filtered.length} transaksi yang cocok. <button type="button" className="font-semibold text-link underline underline-offset-4" onClick={resetFilters}>Hapus filter</button></p>
          )}
          {ready && txs.length > 0 && !filtered.length && (
            <div className="rounded-xl bg-paper p-6 text-center">
              <p className="font-semibold">Tidak ada transaksi yang cocok</p>
              <button type="button" className="btn-ghost mt-3" onClick={resetFilters}>Hapus filter</button>
            </div>
          )}
          {ready && !txs.length && (
            <div className="rounded-xl bg-paper p-6 text-center">
              <p className="font-semibold">Belum ada transaksi</p>
              <p className="mt-1 text-sm text-muted">Transaksi muncul di sini setelah kasir menyelesaikan penjualan pertama.</p>
              <Link href="/kasir" className="btn-primary mt-4">Buka kasir</Link>
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

/* ---------- Kasir dan gudang ---------- */

function Welcome({ me, children }: { me: Me; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <style>{CSS}</style>
      <header className="dash-rise">
        <h1 className="text-3xl font-extrabold tracking-tight">{greeting()}, {me.session.name.split(" ")[0]}</h1>
        <p className="mt-1 text-muted">{ROLE_LABEL[me.session.role]}{me.branch ? `, cabang ${me.branch.name}` : ""}.</p>
      </header>
      {children}
    </div>
  );
}

function KasirHome({ me }: { me: Me }) {
  const [shift, setShift] = useState<ShiftOut | null | undefined>(undefined);
  useEffect(() => { api<{ shift: ShiftOut | null }>("/api/shifts?current=1").then((r) => setShift(r.shift)).catch(() => setShift(null)); }, []);
  const total = useCountUp(shift ? shift.totalSales : 0);
  return (
    <Welcome me={me}>
      <section className="card dash-rise space-y-4 p-6" style={{ animationDelay: "80ms" }}>
        {shift === undefined ? <div className="h-16 animate-pulse rounded-xl bg-line motion-reduce:animate-none" aria-label="Memuat" /> : shift ? (
          <>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted">
                <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" /></span>
                Kasir Anda sedang dibuka
              </div>
              <div className="mt-1 text-3xl font-extrabold tracking-tight">{rp(Math.round(total))}</div>
              <div className="text-sm text-muted">{shift.txCount} transaksi sejak {tgl(shift.openedAt)}</div>
            </div>
            <Link href="/kasir" className="btn-primary btn-lg dash-lift w-full">Lanjut berjualan</Link>
          </>
        ) : (
          <>
            <div><div className="text-lg font-bold">Kasir belum dibuka</div><p className="mt-1 text-muted">Isi modal awal dari uang di laci, lalu mulai melayani pembeli.</p></div>
            <Link href="/kasir" className="btn-primary btn-lg dash-lift w-full">Buka kasir</Link>
          </>
        )}
      </section>
    </Welcome>
  );
}

function GudangHome({ me }: { me: Me }) {
  return (
    <Welcome me={me}>
      <section className="card dash-rise space-y-4 p-6" style={{ animationDelay: "80ms" }}>
        <div><div className="text-lg font-bold">Kelola produk dan stok</div><p className="mt-1 text-muted">Tambah produk baru, ubah harga, dan perbarui stok cabang Anda.</p></div>
        <Link href="/gudang" className="btn-primary btn-lg dash-lift w-full">Buka gudang</Link>
        <Link href="/permintaan" className="btn-ghost btn-lg dash-lift w-full">Minta barang ke kepala toko</Link>
      </section>
    </Welcome>
  );
}

function Home({ me }: { me: Me }) {
  const role = me.session.role;
  if (role === "developer" || role === "admin") return <Platform me={me} />;
  if (role === "kasir") return <KasirHome me={me} />;
  if (role === "gudang") return <GudangHome me={me} />;
  return <Team me={me} />;
}

export default function Dashboard() {
  return <Shell>{(me) => <Home me={me} />}</Shell>;
}