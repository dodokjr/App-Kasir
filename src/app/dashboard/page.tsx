"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import Shell, { Avatar, Ico, ROLE_LABEL } from "@/components/Shell";
import ReceiptModal from "@/components/ReceiptModal";
import BranchSelect from "@/components/BranchSelect";
import { Alert, useFeedback } from "@/components/Feedback";
import { useBranch } from "@/lib/useBranch";
import { addDays, api, rp, tgl, wibDay } from "@/lib/client";
import type { Me, ReceiptData } from "@/lib/types";
import type { MonitorRow, ShiftOut } from "@/lib/shiftTypes";

type R = Record<string, string>;
type Fin = { summary: { sales: number; txCount: number; avgTicket: number; shiftsOpen: number }; daily: { date: string; sales: number; tx: number }[] };
type Mon = { rows: MonitorRow[] };

/* ---------- potongan kecil yang dipakai ulang ---------- */

function Disclosure({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div>
      <button type="button" className="btn-ghost" aria-expanded={open} onClick={onToggle}>{open ? "Tutup formulir" : `+ ${label}`}</button>
      {open && <div className="mt-4 rounded-2xl border border-line bg-paper p-5 text-left">{children}</div>}
    </div>
  );
}

function Kpi({ label, value, sub, tone, loading, icon }: { label: string; value: string; sub?: ReactNode; tone?: "warn"; loading?: boolean; icon?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted">
        {icon && <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone === "warn" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent dark:text-link"}`}><Ico n={icon} /></span>}
        {label}
      </div>
      {loading ? <div className="mt-3 h-9 w-32 animate-pulse rounded-lg bg-line motion-reduce:animate-none" aria-label="Memuat" /> : <div className={`mt-3 text-3xl font-extrabold tracking-tight ${tone === "warn" ? "text-danger" : ""}`}>{value}</div>}
      {sub && !loading && <div className="mt-1.5 text-sm text-muted">{sub}</div>}
    </div>
  );
}

function Section({ title, count, action, children }: { title: string; count?: number; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
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
  const { ok } = useFeedback();
  const [f, setF] = useState({ name: "", email: "", password: "", role: roles[0], branchId: branches?.[0]?.id ?? "" });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (branches?.length && !f.branchId) setF((p) => ({ ...p, branchId: branches[0].id })); }, [branches, f.branchId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try { await api("/api/users", { method: "POST", body: f }); setF({ ...f, name: "", email: "", password: "" }); ok("Akun ditambahkan"); onDone(); }
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
      {err && <Alert tone="error" className="sm:col-span-2">{err}</Alert>}
      <div className="sm:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? "Menyimpan…" : "Tambah akun"}</button></div>
    </form>
  );
}

/* ---------- Developer dan admin ---------- */

function Platform({ me }: { me: Me }) {
  const { ok, fail, confirm } = useFeedback();
  const [stores, setStores] = useState<R[]>([]);
  const [users, setUsers] = useState<R[]>([]);
  const [unread, setUnread] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
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
  async function toggle(s: R) {
    const off = s.active !== "FALSE";
    if (off && !(await confirm({ title: `Nonaktifkan toko “${s.name}”?`, text: "Semua akun di toko ini tidak bisa berjualan sampai toko diaktifkan lagi.", ok: "Nonaktifkan", danger: true }))) return;
    try { await api("/api/stores", { method: "PATCH", body: { id: s.id, active: !off } }); ok(off ? "Toko dinonaktifkan" : "Toko diaktifkan"); load(); }
    catch (x) { fail((x as Error).message); }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tight">Ringkasan platform</h1>
        <p className="mt-1 text-muted">Semua toko yang terdaftar dan pesan dari halaman Kontak.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Toko aktif" value={String(active)} sub={`dari ${stores.length} toko terdaftar`} loading={!ready} />
        <Kpi label="Toko nonaktif" value={String(stores.length - active)} loading={!ready} />
        <Link href="/pesan" className="card block p-5 transition hover:border-accent">
          <div className="text-sm font-medium text-muted">Pesan Kontak</div>
          <div className="mt-3 text-3xl font-extrabold tracking-tight">{unread === null ? "…" : unread}</div>
          <div className="mt-1.5 text-sm text-link">{unread ? "belum dibaca. Buka kotak pesan" : "Tidak ada pesan baru"}</div>
        </Link>
      </div>
      {err && <Alert tone="error">{err}</Alert>}

      <Section title="Semua toko" count={stores.length}>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full">
            <thead><tr><th className="th pl-5">Toko</th><th className="th">Jenis</th><th className="th">Cabang</th><th className="th">Akun</th><th className="th">Status</th><th className="th pr-5"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {stores.map((s) => (
                <tr key={s.id}>
                  <td className="td pl-5 font-semibold">{s.name}</td>
                  <td className="td">{({ fnb: "F&B", retail: "Retail", sembako: "Sembako", lainnya: "Lainnya" } as R)[s.businessType] ?? "Retail"}</td>
                  <td className="td">{s.branches}</td><td className="td">{s.users}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.active === "FALSE" ? "bg-danger/10 text-danger" : "bg-accent/10 text-accent dark:text-link"}`}>{s.active === "FALSE" ? "Nonaktif" : "Aktif"}</span></td>
                  <td className="td pr-5 text-right"><button className="btn-ghost" onClick={() => toggle(s)}>{s.active === "FALSE" ? "Aktifkan" : "Nonaktifkan"}</button></td>
                </tr>
              ))}
              {ready && !stores.length && <tr><td className="td pl-5 text-muted" colSpan={6}>Belum ada toko terdaftar.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      {dev && (
        <Section title="Akun admin" count={users.length}>
          <ul className="divide-y divide-line">
            {users.map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3"><Avatar name={u.name} /><div><div className="font-semibold">{u.name}</div><div className="text-sm text-muted">{u.email}</div></div></li>
            ))}
            {ready && !users.length && <li className="py-3 text-sm text-muted">Belum ada akun admin.</li>}
          </ul>
          <Disclosure label="Tambah admin" open={adding} onToggle={() => setAdding(!adding)}><StaffForm roles={["admin"]} onDone={() => { load(); setAdding(false); }} /></Disclosure>
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

function WeekChart({ days, today }: { days: { date: string; sales: number }[]; today: string }) {
  const max = Math.max(1, ...days.map((d) => d.sales));
  const total = days.reduce((a, d) => a + d.sales, 0);
  return (
    <div>
      <h2 className="text-lg font-bold">Penjualan 7 hari terakhir</h2>
      <p className="text-sm text-muted">Total <span className="font-semibold text-ink">{rp(total)}</span></p>
      <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3" role="img" aria-label={`Grafik penjualan 7 hari terakhir. ${days.map((d) => `${d.date}: ${rp(d.sales)}`).join(". ")}`}>
        {days.map((d) => (
          <div key={d.date} className="flex h-full flex-1 flex-col justify-end" title={`${d.date}: ${rp(d.sales)}`}>
            <div className={`w-full rounded-lg ${d.date === today ? "bg-accent" : "bg-accent/25"}`} style={{ height: d.sales ? `${Math.max(4, (d.sales / max) * 100)}%` : "3px", opacity: d.sales ? 1 : 0.4 }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 text-xs text-muted sm:gap-3" aria-hidden="true">
        {days.map((d) => (
          <div key={d.date} className={`flex-1 text-center ${d.date === today ? "font-bold text-ink" : ""}`}>{new Date(d.date + "T00:00:00Z").toLocaleDateString("id-ID", { weekday: "short", timeZone: "UTC" })}</div>
        ))}
      </div>
    </div>
  );
}

const SHORTCUTS = (owner: boolean): [string, string, string, string][] => [
  ["/kasir", "kasir", "Buka kasir", "Mulai berjualan"],
  ["/gudang", "gudang", "Gudang", "Produk dan stok"],
  ["/keuangan", "keuangan", "Keuangan", "Penjualan dan pengeluaran"],
  ["/permintaan", "permintaan", "Permintaan barang", owner ? "Dari cabang" : "Ke kepala toko"],
  ["/monitor", "monitor", "Pantau kasir", "Online atau offline"],
  ...(owner ? [["/pengaturan", "pengaturan", "Pengaturan", "Struk, PPN, pembayaran"] as [string, string, string, string]] : []),
];

function Team({ me }: { me: Me }) {
  const { ok, fail } = useFeedback();
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [users, setUsers] = useState<R[]>([]);
  const [txs, setTxs] = useState<R[]>([]);
  const [fin, setFin] = useState<Fin | null>(null);
  const [mon, setMon] = useState<Mon | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [bf, setBf] = useState({ name: "", street: "" });
  const [err, setErr] = useState("");
  const [loadErr, setLoadErr] = useState("");
  const [ready, setReady] = useState(false);
  const [addBranch, setAddBranch] = useState(false);
  const [addStaff, setAddStaff] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [branch, setBranch] = useBranch("");
  // "" = semua cabang. Pilihan yang tidak dikenal (misal cabang lama) dianggap semua cabang
  const active = owner && branches.some((b) => b.id === branch) ? branch : "";

  const today = wibDay();
  const load = useCallback(async () => {
    const from = addDays(today, -6);
    const [b, u, t, f, m] = await Promise.allSettled([
      api<R[]>("/api/branches"), api<R[]>("/api/users"), api<R[]>(`/api/transactions?branchId=${active}`),
      api<Fin>(`/api/finance?from=${from}&to=${today}&branchId=${active}`), api<Mon>("/api/presence"),
    ]);
    if (b.status === "fulfilled") setBranches(b.value);
    if (u.status === "fulfilled") setUsers(u.value);
    if (t.status === "fulfilled") setTxs(t.value);
    if (f.status === "fulfilled") setFin(f.value);
    if (m.status === "fulfilled") setMon(m.value);
    const bad = [b, u, t, f].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    setLoadErr(bad ? String(bad.reason?.message ?? bad.reason) : "");
    setReady(true);
    // Jumlah produk hanya dicek untuk toko yang belum punya transaksi (daftar langkah awal)
    if (t.status === "fulfilled" && !t.value.length) api<R[]>("/api/products").then((p) => setProductCount(p.length)).catch(() => {});
  }, [active, today]);
  useEffect(() => { load(); }, [load]);

  async function openReceipt(id: string) {
    try { setReceipt(await api<ReceiptData>(`/api/transactions?id=${id}`)); } catch (x) { fail((x as Error).message); }
  }

  const bname = (id: string) => { const b = branches.find((x) => x.id === id); return b ? `${b.name} (${b.street})` : "-"; };
  const shownUsers = active ? users.filter((u) => u.branchId === active) : users;

  // Angka hari ini dan perbandingan dengan kemarin
  const day = (d: string) => fin?.daily.find((x) => x.date === d);
  const td = day(today), yd = day(addDays(today, -1));
  const sales = td?.sales ?? 0, txCount = td?.tx ?? 0;
  const delta = yd?.sales ? Math.round(((sales - yd.sales) / yd.sales) * 100) : null;
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(today, i - 6); return { date: d, sales: day(d)?.sales ?? 0 }; });

  const cashiers = (mon?.rows ?? []).filter((r) => !active || r.branchId === active);
  const onlineN = cashiers.filter((r) => r.status === "online").length;
  const alerts = cashiers.filter((r) => r.alert);

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
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{greeting()}, {me.session.name.split(" ")[0]}</h1>
          <p className="mt-1.5 text-muted">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}.{" "}
            {active ? `Menampilkan cabang ${bname(active)}.` : owner ? "Menampilkan semua cabang." : `Cabang ${me.branch?.name ?? ""}.`}
          </p>
        </div>
        <div className="flex items-end gap-2">
          {owner && branches.length > 1 && <div className="w-64 max-w-full"><BranchSelect branches={branches} value={active} onChange={setBranch} allowAll /></div>}
          <button className="btn-ghost" onClick={load}>Muat ulang</button>
        </div>
      </header>

      {loadErr && <Alert tone="error">{loadErr}</Alert>}

      {alerts.length > 0 && (
        <Alert tone="warning" title={`${alerts.length} kasir terbuka tetapi offline`}
          action={<Link href="/monitor" className="btn-primary">Lihat pantau kasir</Link>}>
          {alerts.map((a) => a.name).join(", ")}. Hubungi kasir untuk memastikan koneksinya.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon="keuangan" label="Penjualan hari ini" value={rp(sales)} loading={!ready}
          sub={delta === null ? (yd ? "Kemarin tidak ada penjualan" : "Belum ada pembanding kemarin") : (
            <><span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${delta >= 0 ? "bg-accent/10 text-accent dark:text-link" : "bg-danger/10 text-danger"}`}><span aria-hidden="true">{delta >= 0 ? "▲" : "▼"}</span><span className="sr-only">{delta >= 0 ? "Naik" : "Turun"} </span>{Math.abs(delta)}%</span> dari kemarin</>
          )} />
        <Kpi icon="kasir" label="Transaksi hari ini" value={String(txCount)} loading={!ready} sub={txCount ? `Rata-rata ${rp(Math.round(sales / txCount))}` : "Belum ada transaksi"} />
        <Kpi icon="monitor" label="Kasir online" value={mon ? `${onlineN} dari ${cashiers.length}` : "-"} loading={!ready} sub={mon ? `${cashiers.filter((r) => r.shiftOpen).length} kasir sedang dibuka` : "Data tidak tersedia"} />
        <Kpi icon="monitor" label="Perlu dicek" value={String(alerts.length)} tone={alerts.length ? "warn" : undefined} loading={!ready} sub={alerts.length ? "Kasir terbuka tetapi offline" : "Semua kasir aman"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-5 sm:p-6">{ready ? <WeekChart days={week} today={today} /> : <div className="h-56 animate-pulse rounded-xl bg-line motion-reduce:animate-none" aria-label="Memuat grafik" />}</section>

        <section className="card p-5 sm:p-6" aria-label="Pintasan">
          <h2 className="text-lg font-bold">Pintasan</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {SHORTCUTS(owner).map(([href, ic, t, d]) => (
              <li key={href}>
                <Link href={href} className="flex h-full flex-col gap-3 rounded-xl border border-line p-3.5 transition hover:border-accent hover:bg-accent/5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent dark:text-link"><Ico n={ic} /></span>
                  <span><span className="block text-sm font-semibold leading-tight">{t}</span><span className="mt-0.5 block text-xs text-muted">{d}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {showSteps && (
        <section className="rounded-2xl border border-sun/50 bg-sun/15 p-5 sm:p-6" aria-label="Langkah awal">
          <div className="flex flex-wrap items-baseline gap-3"><h2 className="text-lg font-bold">Mulai dari sini</h2><span className="text-sm font-medium text-muted">{doneN} dari {steps.length} langkah selesai</span></div>
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t} className="flex gap-3 rounded-xl bg-surface p-4">
                <span className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm font-extrabold ${s.done ? "bg-accent text-white" : "bg-sun text-sun-ink"}`} aria-hidden="true">{s.done ? "✓" : i + 1}</span>
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

      <Section title="Cabang" count={branches.length}
        action={owner ? <Disclosure label="Tambah cabang" open={addBranch} onToggle={() => setAddBranch(!addBranch)}>
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={async (e) => {
            e.preventDefault(); setErr("");
            try { await api("/api/branches", { method: "POST", body: bf }); setBf({ name: "", street: "" }); setAddBranch(false); ok("Cabang ditambahkan"); load(); } catch (x) { setErr((x as Error).message); }
          }}>
            <div><label className="label" htmlFor="bf-name">Nama cabang</label><input id="bf-name" required className="input" value={bf.name} onChange={(e) => setBf({ ...bf, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="bf-street">Nama jalan</label><input id="bf-street" required className="input" value={bf.street} onChange={(e) => setBf({ ...bf, street: e.target.value })} /></div>
            <div className="flex items-end"><button className="btn-primary w-full">Simpan cabang</button></div>
            {err && <Alert tone="error" className="sm:col-span-3">{err}</Alert>}
          </form>
        </Disclosure> : undefined}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => {
            const n = users.filter((u) => u.branchId === b.id).length;
            const on = b.id === active;
            return (
              <li key={b.id} className={`rounded-xl border p-4 ${on ? "border-accent bg-accent/5" : "border-line"}`}>
                <div className="font-bold">{b.name}</div>
                <div className="text-sm text-muted">Jl. {b.street}</div>
                <div className="mt-3 inline-flex rounded-full bg-paper px-2.5 py-0.5 text-xs font-semibold text-muted">{n} anggota tim</div>
              </li>
            );
          })}
          {ready && !branches.length && <li className="text-sm text-muted">Belum ada cabang.</li>}
        </ul>
      </Section>

      <div id="tim" className="scroll-mt-24">
        <Section title="Tim" count={shownUsers.length}
          action={<Disclosure label="Tambah anggota tim" open={addStaff} onToggle={() => setAddStaff(!addStaff)}>
            <StaffForm roles={owner ? ["kepala_cabang", "kasir", "gudang"] : ["kasir", "gudang"]} branches={owner ? branches : undefined} onDone={() => { load(); setAddStaff(false); }} />
          </Disclosure>}>
          <div className="-mx-5 overflow-x-auto">
            <table className="w-full">
              <thead><tr><th className="th pl-5">Nama</th><th className="th">Peran</th><th className="th">Cabang</th><th className="th pr-5">Email</th></tr></thead>
              <tbody className="divide-y divide-line">
                {shownUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="td pl-5"><div className="flex items-center gap-3"><Avatar name={u.name} size={32} /><span className="font-semibold">{u.name}</span></div></td>
                    <td className="td"><span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent dark:text-link">{ROLE_LABEL[u.role]}</span></td>
                    <td className="td">{bname(u.branchId)}</td><td className="td pr-5 text-muted">{u.email}</td>
                  </tr>
                ))}
                {ready && !shownUsers.length && <tr><td className="td pl-5 text-muted" colSpan={4}>Belum ada anggota tim. Tambahkan kasir pertama Anda.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <Section title="Transaksi terakhir" count={txs.length}>
        {/* HP: daftar kartu. Layar lebar: tabel */}
        <ul className="divide-y divide-line md:hidden">
          {txs.map((t) => (
            <li key={t.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{rp(t.total)} <span className="text-sm font-normal text-muted">{t.paymentLabel || "Cash"}</span></div>
                <div className="truncate text-sm text-muted">{tgl(t.createdAt)}, {t.cashierName}{t.orderNo ? `, pesanan #${t.orderNo}${t.tableNo ? `, meja ${t.tableNo}` : ""}` : ""}</div>
                <div className="truncate font-mono text-xs text-muted">{t.invoice}</div>
              </div>
              <button className="btn-ghost" onClick={() => openReceipt(t.id)}>Struk</button>
            </li>
          ))}
        </ul>
        <div className="-mx-5 hidden overflow-x-auto md:block">
          <table className="w-full">
            <thead><tr><th className="th pl-5">Invoice</th><th className="th">Waktu</th><th className="th">Cabang</th><th className="th">Kasir</th><th className="th">Pembayaran</th><th className="th text-right">Total</th><th className="th pr-5"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {txs.map((t) => (
                <tr key={t.id}>
                  <td className="td pl-5 font-mono text-xs">{t.invoice}</td><td className="td">{tgl(t.createdAt)}</td><td className="td">{bname(t.branchId)}</td><td className="td">{t.cashierName}</td>
                  <td className="td">{t.paymentLabel || "Cash"}{t.orderNo ? <span className="block text-xs text-muted">Pesanan #{t.orderNo}{t.tableNo ? `, meja ${t.tableNo}` : ""}</span> : null}</td>
                  <td className="td text-right font-mono font-semibold">{rp(t.total)}</td>
                  <td className="td pr-5 text-right"><button className="btn-ghost" onClick={() => openReceipt(t.id)}>Struk</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {ready && !txs.length && (
          <div className="rounded-2xl bg-paper p-8 text-center">
            <p className="font-semibold">Belum ada transaksi</p>
            <p className="mt-1 text-sm text-muted">Transaksi muncul di sini setelah kasir menyelesaikan penjualan pertama.</p>
            <Link href="/kasir" className="btn-primary mt-4">Buka kasir</Link>
          </div>
        )}
      </Section>
    </div>
  );
}

/* ---------- Kasir dan gudang ---------- */

function Welcome({ me, children }: { me: Me; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 py-4">
      <header>
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
  return (
    <Welcome me={me}>
      <section className="card space-y-5 p-6">
        {shift === undefined ? <div className="h-16 animate-pulse rounded-xl bg-line motion-reduce:animate-none" aria-label="Memuat" /> : shift ? (
          <>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent dark:text-link"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />Kasir sedang dibuka</div>
              <div className="mt-3 text-4xl font-extrabold tracking-tight">{rp(shift.totalSales)}</div>
              <div className="mt-1 text-sm text-muted">{shift.txCount} transaksi sejak {tgl(shift.openedAt)}</div>
            </div>
            <Link href="/kasir" className="btn-primary btn-lg w-full">Lanjut berjualan</Link>
          </>
        ) : (
          <>
            <div><div className="text-lg font-bold">Kasir belum dibuka</div><p className="mt-1 text-muted">Isi modal awal dari uang di laci, lalu mulai melayani pembeli.</p></div>
            <Link href="/kasir" className="btn-primary btn-lg w-full">Buka kasir</Link>
          </>
        )}
      </section>
    </Welcome>
  );
}

function GudangHome({ me }: { me: Me }) {
  return (
    <Welcome me={me}>
      <section className="card space-y-4 p-6">
        <div><div className="text-lg font-bold">Kelola produk dan stok</div><p className="mt-1 text-muted">Tambah produk baru, ubah harga, dan perbarui stok cabang Anda.</p></div>
        <Link href="/gudang" className="btn-primary btn-lg w-full">Buka gudang</Link>
        <Link href="/permintaan" className="btn-ghost btn-lg w-full">Minta barang ke kepala toko</Link>
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