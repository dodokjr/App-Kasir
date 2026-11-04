"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell, { ROLE_LABEL } from "@/components/Shell";
import ReceiptModal from "@/components/ReceiptModal";
import BranchSelect from "@/components/BranchSelect";
import { useBranch } from "@/lib/useBranch";
import { api, rp, tgl } from "@/lib/client";
import type { Me, ReceiptData } from "@/lib/types";

type R = Record<string, string>;

function StaffForm({ roles, branches, onDone }: { roles: string[]; branches?: R[]; onDone: () => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: roles[0], branchId: branches?.[0]?.id ?? "" });
  const [err, setErr] = useState("");
  useEffect(() => { if (branches?.length && !f.branchId) setF((p) => ({ ...p, branchId: branches[0].id })); }, [branches, f.branchId]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    try { await api("/api/users", { method: "POST", body: f }); setF({ ...f, name: "", email: "", password: "" }); onDone(); }
    catch (x) { setErr((x as Error).message); }
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div><label className="label">Nama</label><input required className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div><label className="label">Email</label><input required type="email" className="input" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div><label className="label">Password</label><input required minLength={6} type="password" className="input" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
      <div><label className="label">Peran</label>
        <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
          {roles.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select></div>
      {branches && (
        <div className="sm:col-span-2"><label className="label">Cabang</label>
          <select className="input" value={f.branchId} onChange={(e) => setF({ ...f, branchId: e.target.value })}>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name} — {b.street}</option>)}
          </select></div>
      )}
      {err && <p className="text-sm text-danger sm:col-span-2" role="alert">{err}</p>}
      <div className="sm:col-span-2"><button className="btn-primary">Tambah akun</button></div>
    </form>
  );
}

function Platform({ me }: { me: Me }) {
  const [stores, setStores] = useState<R[]>([]);
  const [users, setUsers] = useState<R[]>([]);
  const dev = me.session.role === "developer";
  const load = useCallback(async () => {
    setStores(await api("/api/stores"));
    setUsers((await api<R[]>("/api/users")).filter((u) => u.role === "admin"));
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="space-y-6">
      <section className="card overflow-x-auto p-0">
        <h2 className="p-4 pb-2 font-semibold">Semua toko ({stores.length})</h2>
        <table className="w-full"><thead><tr><th className="th">Toko</th><th className="th">Cabang</th><th className="th">Akun</th><th className="th">Status</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-line">
            {stores.map((s) => (
              <tr key={s.id}><td className="td font-medium">{s.name}</td><td className="td">{s.branches}</td><td className="td">{s.users}</td>
                <td className="td">{s.active === "FALSE" ? "Nonaktif" : "Aktif"}</td>
                <td className="td text-right"><button className="btn-ghost" onClick={async () => { await api("/api/stores", { method: "PATCH", body: { id: s.id, active: s.active === "FALSE" } }); load(); }}>
                  {s.active === "FALSE" ? "Aktifkan" : "Nonaktifkan"}</button></td></tr>
            ))}
            {!stores.length && <tr><td className="td text-muted" colSpan={5}>Belum ada toko terdaftar.</td></tr>}
          </tbody></table>
      </section>
      {dev && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Akun admin ({users.length})</h2>
          <ul className="text-sm text-muted">{users.map((u) => <li key={u.id}>{u.name} — {u.email}</li>)}</ul>
          <StaffForm roles={["admin"]} onDone={load} />
        </section>
      )}
    </div>
  );
}

function Team({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [users, setUsers] = useState<R[]>([]);
  const [txs, setTxs] = useState<R[]>([]);
  const [bf, setBf] = useState({ name: "", street: "" });
  const [err, setErr] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [branch, setBranch] = useBranch("");
  // "" = semua cabang. Pilihan yang tidak dikenal (misal cabang lama) dianggap semua cabang
  const active = owner && branches.some((b) => b.id === branch) ? branch : "";

  const [loadErr, setLoadErr] = useState("");
  const load = useCallback(async () => {
    const [b, u, t] = await Promise.allSettled([
      api<R[]>("/api/branches"), api<R[]>("/api/users"), api<R[]>(`/api/transactions?branchId=${active}`),
    ]);
    if (b.status === "fulfilled") setBranches(b.value);
    if (u.status === "fulfilled") setUsers(u.value);
    if (t.status === "fulfilled") setTxs(t.value);
    const bad = [b, u, t].find((x) => x.status === "rejected") as PromiseRejectedResult | undefined;
    setLoadErr(bad ? String(bad.reason?.message ?? bad.reason) : "");
  }, [active]);
  useEffect(() => { load(); }, [load]);
  const bname = (id: string) => { const b = branches.find((x) => x.id === id); return b ? `${b.name} (${b.street})` : "-"; };

  const shownUsers = active ? users.filter((u) => u.branchId === active) : users;
  const totalSales = txs.reduce((a, t) => a + Number(t.total), 0);

  return (
    <div className="space-y-6">
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}

      {owner && branches.length > 0 && (
        <div className="card flex flex-wrap items-end gap-4">
          <div className="min-w-[260px] flex-1"><BranchSelect branches={branches} value={active} onChange={setBranch} allowAll /></div>
          <p className="pb-2 text-sm text-muted">{active ? `Menampilkan tim dan transaksi cabang ${bname(active)}.` : "Menampilkan semua cabang."}</p>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/monitor" className="card transition hover:border-accent"><div className="font-medium">Pantau kasir</div><p className="text-sm text-muted">Lihat kasir cabang online atau offline.</p></Link>
        <Link href="/keuangan" className="card transition hover:border-accent"><div className="font-medium">Keuangan</div><p className="text-sm text-muted">Penjualan, pengeluaran, dan tutup kasir.</p></Link>
        <Link href="/kasir" className="card transition hover:border-accent"><div className="font-medium">Kasir</div><p className="text-sm text-muted">Buka kasir dan mulai berjualan.</p></Link>
        {owner && <Link href="/pengaturan" className="card transition hover:border-accent"><div className="font-medium">Pengaturan struk dan tampilan</div><p className="text-sm text-muted">Atur isi struk dan mode gelap.</p></Link>}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Cabang ({branches.length})</h2>
        {loadErr && <p className="text-sm text-danger" role="alert">{loadErr}</p>}
        <ul className="divide-y divide-line text-sm">{branches.map((b) => <li key={b.id} className="py-2"><span className="font-medium">{b.name}</span> <span className="text-muted">— Jl. {b.street}</span></li>)}</ul>
        {owner && (
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={async (e) => {
            e.preventDefault(); setErr("");
            try { await api("/api/branches", { method: "POST", body: bf }); setBf({ name: "", street: "" }); load(); } catch (x) { setErr((x as Error).message); }
          }}>
            <div><label className="label">Nama cabang</label><input required className="input" value={bf.name} onChange={(e) => setBf({ ...bf, name: e.target.value })} /></div>
            <div><label className="label">Nama jalan</label><input required className="input" value={bf.street} onChange={(e) => setBf({ ...bf, street: e.target.value })} /></div>
            <div className="flex items-end"><button className="btn-primary w-full">Tambah cabang</button></div>
            {err && <p className="text-sm text-danger sm:col-span-3" role="alert">{err}</p>}
          </form>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Tim ({shownUsers.length})</h2>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr><th className="th">Nama</th><th className="th">Email</th><th className="th">Peran</th><th className="th">Cabang</th></tr></thead>
          <tbody className="divide-y divide-line">{shownUsers.map((u) => (
            <tr key={u.id}><td className="td font-medium">{u.name}</td><td className="td">{u.email}</td><td className="td">{ROLE_LABEL[u.role]}</td><td className="td">{bname(u.branchId)}</td></tr>
          ))}</tbody></table></div>
        <StaffForm roles={owner ? ["kepala_cabang", "kasir", "gudang"] : ["kasir", "gudang"]} branches={owner ? branches : undefined} onDone={load} />
      </section>

      <section className="card overflow-x-auto p-0">
        <div className="p-4 pb-2"><h2 className="font-semibold">Transaksi terakhir</h2><p className="text-sm text-muted">{txs.length} transaksi, total {rp(totalSales)}</p></div>
        <table className="w-full"><thead><tr><th className="th">Invoice</th><th className="th">Waktu</th><th className="th">Cabang</th><th className="th">Kasir</th><th className="th">Pembayaran</th><th className="th">Total</th><th className="th"></th></tr></thead>
          <tbody className="divide-y divide-line">
            {txs.map((t) => (
              <tr key={t.id}><td className="td font-mono text-xs">{t.invoice}</td><td className="td">{tgl(t.createdAt)}</td><td className="td">{bname(t.branchId)}</td><td className="td">{t.cashierName}</td><td className="td">{t.paymentLabel || "Cash"}{t.orderNo ? <span className="text-xs text-muted"> · #{t.orderNo}{t.tableNo ? ` · meja ${t.tableNo}` : ""}</span> : null}</td><td className="td">{rp(t.total)}</td>
                <td className="td text-right"><button className="btn-ghost" onClick={async () => setReceipt(await api(`/api/transactions?id=${t.id}`))}>Struk</button></td></tr>
            ))}
            {!txs.length && <tr><td className="td text-muted" colSpan={7}>Belum ada transaksi. Buka halaman Kasir untuk mulai berjualan.</td></tr>}
          </tbody></table>
      </section>
    </div>
  );
}

function Home({ me }: { me: Me }) {
  const role = me.session.role;
  if (role === "developer" || role === "admin") return <Platform me={me} />;
  if (role === "kasir") return <Link href="/kasir" className="btn-primary">Buka kasir</Link>;
  if (role === "gudang") return <Link href="/gudang" className="btn-primary">Buka gudang</Link>;
  return <Team me={me} />;
}

export default function Dashboard() {
  return <Shell>{(me) => <Home me={me} />}</Shell>;
}
