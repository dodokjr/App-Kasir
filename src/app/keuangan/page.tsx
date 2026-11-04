"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import BranchSelect from "@/components/BranchSelect";
import ShiftReportModal from "@/components/ShiftReportModal";
import { useBranch } from "@/lib/useBranch";
import { api, rp, tgl } from "@/lib/client";
import type { Me } from "@/lib/types";
import type { ItemAgg, PayAgg, ShiftOut } from "@/lib/shiftTypes";
import { fmtQty } from "@/lib/business";

type R = Record<string, string>;
type Finance = {
  range: { from: string; to: string; branchId: string };
  summary: { sales: number; txCount: number; itemsSold: number; avgTicket: number; expenses: number; net: number; shiftsClosed: number; shiftsOpen: number; cashDifference: number };
  daily: { date: string; sales: number; tx: number; expenses: number }[];
  items: ItemAgg[];
  byPayment: PayAgg[];
  byBranch: { branchId: string; name: string; sales: number; tx: number }[];
  shifts: ShiftOut[];
  expenses: (R & { branchName: string })[];
};

const CATEGORIES = ["Belanja stok", "Gaji", "Sewa", "Listrik / air / internet", "Operasional", "Lainnya"];
const dFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
const today = () => dFmt.format(new Date());
const back = (n: number) => new Date(Date.parse(today() + "T00:00:00Z") - n * 864e5).toISOString().slice(0, 10);

function csv(name: string, rows: (string | number)[][]) {
  const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

const TABS = ["Harian", "Per item", "Kasir (shift)", "Pengeluaran"] as const;

function Finance({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch("");
  const active = owner && branches.some((b) => b.id === branch) ? branch : "";
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<Finance | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Harian");
  const [report, setReport] = useState<ShiftOut | null>(null);
  const [ef, setEf] = useState({ date: today(), category: CATEGORIES[0], note: "", amount: "", branchId: "" });
  const [eErr, setEErr] = useState("");

  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch(() => {}); }, [owner]);
  const load = useCallback(async () => {
    try { setData(await api<Finance>(`/api/finance?from=${from}&to=${to}&branchId=${active}`)); setErr(""); }
    catch (x) { setErr((x as Error).message); }
  }, [from, to, active]);
  useEffect(() => { load(); }, [load]);

  const preset = (a: string, b: string) => { setFrom(a); setTo(b); };
  const expBranch = owner ? ef.branchId || active || branches[0]?.id || "" : "";

  async function addExpense(e: React.FormEvent) {
    e.preventDefault(); setEErr("");
    try {
      await api("/api/expenses", { method: "POST", body: { ...ef, branchId: expBranch, amount: Number(ef.amount) } });
      setEf({ ...ef, note: "", amount: "" }); load();
    } catch (x) { setEErr((x as Error).message); }
  }
  async function openReport(id: string) {
    try { setReport((await api<{ shift: ShiftOut }>(`/api/shifts?id=${id}`)).shift); } catch (x) { setErr((x as Error).message); }
  }

  const s = data?.summary;
  const cards: [string, string, string?][] = s ? [
    ["Penjualan", rp(s.sales)], ["Transaksi", String(s.txCount)], ["Item terjual", String(s.itemsSold)],
    ["Rata-rata / transaksi", rp(s.avgTicket)], ["Pengeluaran", rp(s.expenses)],
    ["Penjualan − pengeluaran", rp(s.net)],
    ["Selisih kas (kasir ditutup)", s.cashDifference === 0 ? "Pas" : `${s.cashDifference > 0 ? "+" : "−"}${rp(Math.abs(s.cashDifference))}`, s.cashDifference < 0 ? "text-danger" : ""],
  ] : [];

  return (
    <div className="space-y-6">
      {report && <ShiftReportModal shift={report} onClose={() => setReport(null)} />}

      <section className="card space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          {owner && branches.length > 0 && <div className="min-w-[240px]"><BranchSelect branches={branches} value={active} onChange={setBranch} allowAll /></div>}
          <div><label className="label" htmlFor="from">Dari</label><input id="from" type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label" htmlFor="to">Sampai</label><input id="to" type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => preset(today(), today())}>Hari ini</button>
          <button className="btn-ghost" onClick={() => preset(back(1), back(1))}>Kemarin</button>
          <button className="btn-ghost" onClick={() => preset(back(6), today())}>7 hari</button>
          <button className="btn-ghost" onClick={() => preset(back(29), today())}>30 hari</button>
          <button className="btn-ghost" onClick={() => preset(today().slice(0, 8) + "01", today())}>Bulan ini</button>
        </div>
        {err && <p className="text-sm text-danger" role="alert">{err}</p>}
      </section>

      {s && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([k, v, cls]) => (
            <div key={k} className="card"><div className="text-sm text-muted">{k}</div><div className={`mt-1 font-mono text-lg font-semibold ${cls ?? ""}`}>{v}</div></div>
          ))}
          <p className="col-span-full text-xs text-muted">
            Angka “Penjualan − pengeluaran” adalah arus kas, bukan laba bersih, karena harga modal (HPP) per produk belum dicatat.
            {s.shiftsOpen > 0 && ` Ada ${s.shiftsOpen} kasir yang masih dibuka; penjualannya sudah masuk ke angka di atas, tetapi selisih kasnya baru ada setelah kasir ditutup.`}
          </p>
        </section>
      )}

      {data && data.byPayment.length > 0 && (
        <section className="card overflow-x-auto p-0">
          <h2 className="p-4 pb-2 font-semibold">Per metode pembayaran</h2>
          <table className="w-full"><thead><tr><th className="th">Metode</th><th className="th">Transaksi</th><th className="th text-right">Penjualan</th></tr></thead>
            <tbody className="divide-y divide-line">{data.byPayment.map((p) => (
              <tr key={p.key}><td className="td font-medium">{p.label}</td><td className="td font-mono">{p.count}</td><td className="td text-right font-mono">{rp(p.total)}</td></tr>
            ))}</tbody></table>
        </section>
      )}

      {data && !active && data.byBranch.length > 1 && (
        <section className="card overflow-x-auto p-0">
          <h2 className="p-4 pb-2 font-semibold">Per cabang</h2>
          <table className="w-full"><thead><tr><th className="th">Cabang</th><th className="th">Transaksi</th><th className="th text-right">Penjualan</th></tr></thead>
            <tbody className="divide-y divide-line">{data.byBranch.map((b) => (
              <tr key={b.branchId}><td className="td font-medium">{b.name}</td><td className="td font-mono">{b.tx}</td><td className="td text-right font-mono">{rp(b.sales)}</td></tr>
            ))}</tbody></table>
        </section>
      )}

      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "btn-primary" : "btn-ghost"} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {data && tab === "Harian" && (
        <section className="card overflow-x-auto p-0">
          <div className="flex items-center justify-between p-4 pb-2"><h2 className="font-semibold">Ringkasan harian</h2>
            <button className="btn-ghost" onClick={() => csv(`harian-${from}_${to}.csv`, [["Tanggal", "Transaksi", "Penjualan", "Pengeluaran", "Selisih"], ...data.daily.map((d) => [d.date, d.tx, d.sales, d.expenses, d.sales - d.expenses])])}>Unduh CSV</button></div>
          <table className="w-full"><thead><tr><th className="th">Tanggal</th><th className="th">Transaksi</th><th className="th text-right">Penjualan</th><th className="th text-right">Pengeluaran</th><th className="th text-right">Selisih</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.daily.map((d) => (<tr key={d.date}><td className="td">{d.date}</td><td className="td font-mono">{d.tx}</td><td className="td text-right font-mono">{rp(d.sales)}</td><td className="td text-right font-mono">{rp(d.expenses)}</td><td className="td text-right font-mono">{rp(d.sales - d.expenses)}</td></tr>))}
              {!data.daily.length && <tr><td className="td text-muted" colSpan={5}>Tidak ada data pada rentang ini.</td></tr>}
            </tbody></table>
        </section>
      )}

      {data && tab === "Per item" && (
        <section className="card overflow-x-auto p-0">
          <div className="flex items-center justify-between p-4 pb-2"><h2 className="font-semibold">Item terjual (urut nilai)</h2>
            <button className="btn-ghost" onClick={() => csv(`item-${from}_${to}.csv`, [["Produk", "Qty", "Nilai"], ...data.items.map((i) => [i.name, i.qty, i.subtotal])])}>Unduh CSV</button></div>
          <table className="w-full"><thead><tr><th className="th">Produk</th><th className="th">Qty</th><th className="th text-right">Nilai</th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.items.map((i) => (<tr key={i.productId || i.name}><td className="td font-medium">{i.name}</td><td className="td font-mono">{fmtQty(i.qty)} {i.unit || "pcs"}</td><td className="td text-right font-mono">{rp(i.subtotal)}</td></tr>))}
              {!data.items.length && <tr><td className="td text-muted" colSpan={3}>Belum ada penjualan.</td></tr>}
            </tbody></table>
        </section>
      )}

      {data && tab === "Kasir (shift)" && (
        <section className="card overflow-x-auto p-0">
          <div className="flex items-center justify-between p-4 pb-2"><h2 className="font-semibold">Buka–tutup kasir</h2>
            <button className="btn-ghost" onClick={() => csv(`shift-${from}_${to}.csv`, [["Kasir", "Cabang", "Buka", "Tutup", "Modal awal", "Penjualan", "Kas seharusnya", "Kas dihitung", "Selisih"], ...data.shifts.map((x) => [x.cashierName, x.branchName, x.openedAt, x.closedAt, x.openingCash, x.totalSales, x.expectedCash, x.countedCash ?? "", x.difference ?? ""])])}>Unduh CSV</button></div>
          <table className="w-full"><thead><tr><th className="th">Kasir</th><th className="th">Buka</th><th className="th">Tutup</th><th className="th text-right">Penjualan</th><th className="th text-right">Selisih</th><th className="th"></th></tr></thead>
            <tbody className="divide-y divide-line">
              {data.shifts.map((x) => (
                <tr key={x.id}><td className="td"><div className="font-medium">{x.cashierName}</div><div className="text-xs text-muted">{x.branchName}</div></td>
                  <td className="td">{tgl(x.openedAt)}</td><td className="td">{x.status === "open" ? "Masih dibuka" : tgl(x.closedAt)}</td>
                  <td className="td text-right font-mono">{x.status === "open" ? "-" : rp(x.totalSales)}</td>
                  <td className={`td text-right font-mono ${(x.difference ?? 0) < 0 ? "text-danger" : ""}`}>{x.difference === null ? "-" : x.difference === 0 ? "Pas" : rp(x.difference)}</td>
                  <td className="td text-right"><button className="btn-ghost" onClick={() => openReport(x.id)}>Laporan</button></td></tr>
              ))}
              {!data.shifts.length && <tr><td className="td text-muted" colSpan={6}>Belum ada kasir dibuka pada rentang ini.</td></tr>}
            </tbody></table>
        </section>
      )}

      {data && tab === "Pengeluaran" && (
        <section className="space-y-4">
          <form onSubmit={addExpense} className="card grid gap-3 sm:grid-cols-6">
            <div><label className="label" htmlFor="ed">Tanggal</label><input id="ed" required type="date" className="input" value={ef.date} onChange={(e) => setEf({ ...ef, date: e.target.value })} /></div>
            <div><label className="label" htmlFor="ec">Kategori</label><select id="ec" className="input" value={ef.category} onChange={(e) => setEf({ ...ef, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="en">Keterangan</label><input id="en" className="input" maxLength={200} value={ef.note} onChange={(e) => setEf({ ...ef, note: e.target.value })} /></div>
            <div><label className="label" htmlFor="ea">Nominal</label><input id="ea" required inputMode="numeric" className="input font-mono" value={ef.amount} onChange={(e) => setEf({ ...ef, amount: e.target.value.replace(/\D/g, "") })} /></div>
            {owner && <div><label className="label" htmlFor="eb">Cabang</label><select id="eb" className="input" value={expBranch} onChange={(e) => setEf({ ...ef, branchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
            <div className="flex items-center gap-3 sm:col-span-6"><button className="btn-primary">Catat pengeluaran</button>{eErr && <span className="text-sm text-danger" role="alert">{eErr}</span>}</div>
          </form>
          <div className="card overflow-x-auto p-0">
            <table className="w-full"><thead><tr><th className="th">Tanggal</th><th className="th">Kategori</th><th className="th">Keterangan</th><th className="th">Cabang</th><th className="th text-right">Nominal</th><th className="th"></th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.expenses.map((x) => (
                  <tr key={x.id}><td className="td">{x.date}</td><td className="td">{x.category}</td><td className="td">{x.note || "-"}</td><td className="td">{x.branchName}</td><td className="td text-right font-mono">{rp(x.amount)}</td>
                    <td className="td text-right"><button className="btn-ghost" onClick={async () => { if (confirm("Batalkan pengeluaran ini?")) { await api("/api/expenses", { method: "PATCH", body: { id: x.id } }); load(); } }}>Batalkan</button></td></tr>
                ))}
                {!data.expenses.length && <tr><td className="td text-muted" colSpan={6}>Belum ada pengeluaran pada rentang ini.</td></tr>}
              </tbody></table>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Keuangan() {
  return <Shell>{(me) => (me.session.role === "kepala_toko" || me.session.role === "kepala_cabang")
    ? <Finance me={me} />
    : <p className="text-sm text-muted">Halaman keuangan hanya untuk kepala toko dan kepala cabang.</p>}</Shell>;
}
