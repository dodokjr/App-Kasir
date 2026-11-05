"use client";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import BranchSelect from "@/components/BranchSelect";
import ShiftReportModal from "@/components/ShiftReportModal";
import { useBranch } from "@/lib/useBranch";
import { api, rp, tgl } from "@/lib/client";
import type { Me } from "@/lib/types";
import type { ItemAgg, LedgerEntry, PayAgg, ShiftOut } from "@/lib/shiftTypes";
import { fmtQty } from "@/lib/business";

type R = Record<string, string>;
type Finance = {
  range: { from: string; to: string; branchId: string };
  summary: { sales: number; txCount: number; itemsSold: number; avgTicket: number; expenses: number; tax: number; cashSales: number; deposited: number; net: number; shiftsClosed: number; shiftsOpen: number; cashDifference: number };
  daily: { date: string; sales: number; tx: number; expenses: number }[];
  items: ItemAgg[];
  byPayment: PayAgg[];
  byBranch: { branchId: string; name: string; sales: number; tx: number }[];
  shifts: ShiftOut[];
  expenses: (R & { branchName: string })[];
  deposits: (R & { branchName: string })[];
};

type Balance = {
  totals: { income: number; incomeCash: number; expense: number; withdrawn: number; balance: number };
  period: { opening: number; income: number; expense: number; withdrawn: number; closing: number };
  entries: LedgerEntry[];
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

const TABS = ["Harian", "Buku saldo", "Per item", "Kasir (shift)", "Pengeluaran", "Pencairan ke rekening"] as const;
const BANKS = ["BCA", "BRI", "BNI", "Mandiri", "BSI", "CIMB Niaga", "Permata", "Danamon", "Jago", "SeaBank"];

function Finance({ me }: { me: Me }) {
  const owner = me.session.role === "kepala_toko";
  const [branches, setBranches] = useState<R[]>([]);
  const [branch, setBranch] = useBranch("");
  const active = owner && branches.some((b) => b.id === branch) ? branch : "";
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [data, setData] = useState<Finance | null>(null);
  const [bal, setBal] = useState<Balance | null>(null);
  const [err, setErr] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Harian");
  const [report, setReport] = useState<ShiftOut | null>(null);
  const [ef, setEf] = useState({ date: today(), category: CATEGORIES[0], note: "", amount: "", branchId: "" });
  const [eErr, setEErr] = useState("");
  const [df, setDf] = useState({ date: today(), bankName: "", accountNote: "", note: "", amount: "", branchId: "" });
  const [dErr, setDErr] = useState("");

  useEffect(() => { if (owner) api<R[]>("/api/branches").then(setBranches).catch(() => {}); }, [owner]);
  const load = useCallback(async () => {
    try {
      const qs = `from=${from}&to=${to}&branchId=${active}`;
      const [f, b] = await Promise.all([api<Finance>(`/api/finance?${qs}`), api<Balance>(`/api/balance?${qs}`)]);
      setData(f); setBal(b); setErr("");
    }
    catch (x) { setErr((x as Error).message); }
  }, [from, to, active]);
  useEffect(() => { load(); }, [load]);

  const preset = (a: string, b: string) => { setFrom(a); setTo(b); };
  const expBranch = owner ? ef.branchId || active || branches[0]?.id || "" : "";
  const depBranch = owner ? df.branchId || active || branches[0]?.id || "" : "";

  async function addExpense(e: React.FormEvent) {
    e.preventDefault(); setEErr("");
    try {
      await api("/api/expenses", { method: "POST", body: { ...ef, branchId: expBranch, amount: Number(ef.amount) } });
      setEf({ ...ef, note: "", amount: "" }); load();
    } catch (x) { setEErr((x as Error).message); }
  }
  async function addDeposit(e: React.FormEvent) {
    e.preventDefault(); setDErr("");
    try {
      await api("/api/deposits", { method: "POST", body: { ...df, branchId: depBranch, amount: Number(df.amount) } });
      setDf({ ...df, note: "", amount: "" }); load();
    } catch (x) { setDErr((x as Error).message); }
  }
  async function openReport(id: string) {
    try { setReport((await api<{ shift: ShiftOut }>(`/api/shifts?id=${id}`)).shift); } catch (x) { setErr((x as Error).message); }
  }

  const s = data?.summary;
  const cards: [string, string, string?][] = s ? [
    ["Penjualan", rp(s.sales)], ...(s.tax > 0 ? [["PPN di dalam penjualan", rp(s.tax)] as [string, string]] : []), ["Transaksi", String(s.txCount)], ["Item terjual", String(s.itemsSold)],
    ["Rata-rata / transaksi", rp(s.avgTicket)], ["Pengeluaran", rp(s.expenses)],
    ["Penjualan − pengeluaran", rp(s.net)],
    ...(s.cashSales > 0 || s.deposited > 0 ? [
      ["Penjualan tunai", rp(s.cashSales)] as [string, string],
      ["Sudah dicairkan ke rekening", rp(s.deposited)] as [string, string],
      ["Tunai belum dicairkan (perkiraan)", rp(s.cashSales - s.deposited), s.cashSales - s.deposited < 0 ? "text-danger" : ""] as [string, string, string],
    ] : []),
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

      {bal && (
        <section className="card p-5 sm:p-6" aria-label="Saldo terakhir">
          <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
            <div>
              <div className="text-sm font-medium text-muted">Saldo terakhir{active ? " (cabang terpilih)" : ""}</div>
              <div className={`mt-1 text-4xl font-extrabold tracking-tight ${bal.totals.balance < 0 ? "text-danger" : ""}`}>{rp(bal.totals.balance)}</div>
              <p className="mt-1 max-w-[46ch] text-sm text-muted">Dihitung dari semua catatan sejak awal, jadi tidak berubah saat Anda mengganti tanggal.</p>
            </div>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-1 text-sm">
              <div><dt className="text-muted">Pemasukan</dt><dd className="font-mono font-semibold">{rp(bal.totals.income)}</dd></div>
              <div><dt className="text-muted">− Pengeluaran</dt><dd className="font-mono font-semibold">{rp(bal.totals.expense)}</dd></div>
              <div><dt className="text-muted">− Pencairan</dt><dd className="font-mono font-semibold">{rp(bal.totals.withdrawn)}</dd></div>
            </dl>
          </div>
          {bal.totals.balance < 0 && <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">Saldo minus: pengeluaran dan pencairan lebih besar dari pemasukan yang tercatat di aplikasi. Cek apakah ada uang awal atau penjualan sebelum memakai aplikasi, atau catatan yang salah.</p>}
        </section>
      )}

      {s && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(([k, v, cls]) => (
            <div key={k} className="card"><div className="text-sm text-muted">{k}</div><div className={`mt-1 font-mono text-lg font-semibold ${cls ?? ""}`}>{v}</div></div>
          ))}
          <p className="col-span-full text-xs text-muted">
            Angka “Penjualan − pengeluaran” adalah arus kas, bukan laba bersih, karena harga modal (HPP) per produk belum dicatat.
            {(s.cashSales > 0 || s.deposited > 0) && " “Tunai belum dicairkan” adalah perkiraan: penjualan tunai dikurangi pencairan yang Anda catat, belum memperhitungkan pengeluaran yang dibayar dari kas."}
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

      {data && bal && tab === "Buku saldo" && (
        <section className="card overflow-x-auto p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 pb-2">
            <div><h2 className="font-semibold">Buku saldo</h2><p className="text-sm text-muted">Saldo = pemasukan − pengeluaran − pencairan ke rekening. Terbaru di atas.</p></div>
            <button className="btn-ghost" onClick={() => csv(`buku-saldo-${from}_${to}.csv`, [["Tanggal", "Jenis", "Keterangan", "Cabang", "Masuk", "Keluar", "Saldo"], ...[...bal.entries].reverse().map((e) => [e.date, e.kind, [e.label, e.detail].filter(Boolean).join(" - "), e.branchName, e.kind === "pemasukan" ? e.amount : "", e.kind === "pemasukan" ? "" : e.amount, e.balance])])}>Unduh CSV</button>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 pb-3 text-sm sm:grid-cols-5">
            <div><dt className="text-muted">Saldo awal periode</dt><dd className="font-mono font-semibold">{rp(bal.period.opening)}</dd></div>
            <div><dt className="text-muted">+ Pemasukan</dt><dd className="font-mono font-semibold">{rp(bal.period.income)}</dd></div>
            <div><dt className="text-muted">− Pengeluaran</dt><dd className="font-mono font-semibold">{rp(bal.period.expense)}</dd></div>
            <div><dt className="text-muted">− Pencairan</dt><dd className="font-mono font-semibold">{rp(bal.period.withdrawn)}</dd></div>
            <div><dt className="text-muted">Saldo akhir periode</dt><dd className={`font-mono font-semibold ${bal.period.closing < 0 ? "text-danger" : ""}`}>{rp(bal.period.closing)}</dd></div>
          </dl>
          <table className="w-full"><thead><tr><th className="th">Tanggal</th><th className="th">Keterangan</th><th className="th">Cabang</th><th className="th text-right">Masuk</th><th className="th text-right">Keluar</th><th className="th text-right">Saldo</th></tr></thead>
            <tbody className="divide-y divide-line">
              {bal.entries.map((e) => (
                <tr key={e.id}>
                  <td className="td whitespace-nowrap">{e.date}</td>
                  <td className="td"><span className={`mr-2 rounded-full px-2 py-0.5 text-xs font-semibold ${e.kind === "pemasukan" ? "bg-accent/10 text-accent dark:text-link" : e.kind === "pengeluaran" ? "bg-sun/30 text-sun-ink dark:text-ink" : "bg-line text-ink"}`}>{e.kind === "pemasukan" ? "Pemasukan" : e.kind === "pengeluaran" ? "Pengeluaran" : "Pencairan"}</span>{e.label}{e.detail && <div className="text-xs text-muted">{e.detail}</div>}</td>
                  <td className="td">{e.branchName}</td>
                  <td className="td text-right font-mono">{e.kind === "pemasukan" ? `+${rp(e.amount)}` : ""}</td>
                  <td className="td text-right font-mono">{e.kind === "pemasukan" ? "" : `−${rp(e.amount)}`}</td>
                  <td className={`td text-right font-mono font-semibold ${e.balance < 0 ? "text-danger" : ""}`}>{rp(e.balance)}</td>
                </tr>
              ))}
              {!bal.entries.length && <tr><td className="td text-muted" colSpan={6}>Tidak ada pemasukan, pengeluaran, atau pencairan pada rentang ini.</td></tr>}
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

      {data && tab === "Pencairan ke rekening" && (
        <section className="space-y-4">
          <div className="card space-y-1 text-sm">
            <p><strong>Ini hanya pencatatan.</strong> Aplikasi tidak memindahkan uang. Setelah Anda mencairkan atau mentransfer hasil penjualan ke rekening bank (misalnya uang kas toko, atau dana dari QRIS dan GoFood), catat di sini sebagai bukti.</p>
            <p className="text-muted">Cukup tulis nama bank dan 4 digit terakhir rekening. Jangan isi nomor rekening lengkap.</p>
          </div>
          <form onSubmit={addDeposit} className="card grid gap-3 sm:grid-cols-6">
            <div><label className="label" htmlFor="dd">Tanggal</label><input id="dd" required type="date" className="input" value={df.date} onChange={(e) => setDf({ ...df, date: e.target.value })} /></div>
            <div><label className="label" htmlFor="db">Bank tujuan</label><input id="db" required list="bank-list" maxLength={40} className="input" placeholder="Contoh: BCA" value={df.bankName} onChange={(e) => setDf({ ...df, bankName: e.target.value })} /><datalist id="bank-list">{BANKS.map((b) => <option key={b} value={b} />)}</datalist></div>
            <div><label className="label" htmlFor="da">Rekening (opsional)</label><input id="da" maxLength={60} className="input" placeholder="a.n. toko, ****1234" value={df.accountNote} onChange={(e) => setDf({ ...df, accountNote: e.target.value })} /></div>
            <div><label className="label" htmlFor="dm">Nominal</label><input id="dm" required inputMode="numeric" className="input font-mono" value={df.amount} onChange={(e) => setDf({ ...df, amount: e.target.value.replace(/\D/g, "") })} /></div>
            {owner && <div><label className="label" htmlFor="dbr">Dari cabang</label><select id="dbr" className="input" value={depBranch} onChange={(e) => setDf({ ...df, branchId: e.target.value })}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
            <div className={owner ? "" : "sm:col-span-2"}><label className="label" htmlFor="dn">Catatan (opsional)</label><input id="dn" maxLength={200} className="input" placeholder="Pencairan hari Senin" value={df.note} onChange={(e) => setDf({ ...df, note: e.target.value })} /></div>
            <div className="flex items-center gap-3 sm:col-span-6"><button className="btn-primary">Catat pencairan</button>{dErr && <span className="text-sm text-danger" role="alert">{dErr}</span>}</div>
          </form>
          <div className="card overflow-x-auto p-0">
            <div className="flex items-center justify-between p-4 pb-2"><h2 className="font-semibold">Pencairan tercatat</h2>
              <button className="btn-ghost" onClick={() => csv(`pencairan-${from}_${to}.csv`, [["Tanggal", "Bank", "Rekening", "Cabang", "Nominal", "Catatan", "Dicatat oleh"], ...data.deposits.map((x) => [x.date, x.bankName, x.accountNote, x.branchName, x.amount, x.note, x.createdByName])])}>Unduh CSV</button></div>
            <table className="w-full"><thead><tr><th className="th">Tanggal</th><th className="th">Bank tujuan</th><th className="th">Cabang</th><th className="th">Catatan</th><th className="th text-right">Nominal</th><th className="th"></th></tr></thead>
              <tbody className="divide-y divide-line">
                {data.deposits.map((x) => (
                  <tr key={x.id}><td className="td">{x.date}</td>
                    <td className="td"><div className="font-medium">{x.bankName}</div>{x.accountNote && <div className="text-xs text-muted">{x.accountNote}</div>}</td>
                    <td className="td">{x.branchName}</td>
                    <td className="td">{x.note || "-"}<div className="text-xs text-muted">dicatat {x.createdByName}</div></td>
                    <td className="td text-right font-mono">{rp(x.amount)}</td>
                    <td className="td text-right"><button className="btn-ghost" onClick={async () => { if (confirm("Batalkan catatan pencairan ini?")) { await api("/api/deposits", { method: "PATCH", body: { id: x.id } }); load(); } }}>Batalkan</button></td></tr>
                ))}
                {!data.deposits.length && <tr><td className="td text-muted" colSpan={6}>Belum ada pencairan tercatat pada rentang ini.</td></tr>}
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