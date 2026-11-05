import { handle, need, inScope, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { isCash } from "@/lib/business";
import { dayKey, branchNames } from "@/lib/shift";
import type { LedgerEntry } from "@/lib/shiftTypes";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => Number(v) || 0;
const ORDER = { pemasukan: 0, pengeluaran: 1, pencairan: 2 } as const;

/**
 * Buku saldo: saldo = pemasukan (penjualan) − pengeluaran − pencairan ke rekening.
 * Saldo selalu dihitung dari catatan paling awal, jadi tidak berubah saat rentang tanggal diganti.
 * Rentang tanggal hanya memilih baris mana yang ditampilkan.
 */
export const GET = handle(async (req) => {
  const s = await need(["kepala_toko", "kepala_cabang"]);
  const q = new URL(req.url).searchParams;
  const today = dayKey(new Date().toISOString());
  const from = q.get("from") || today;
  const to = q.get("to") || today;
  if (!DATE.test(from) || !DATE.test(to) || from > to) throw new HttpError(400, "Rentang tanggal tidak valid");
  if ((Date.parse(to) - Date.parse(from)) / 864e5 > 366) throw new HttpError(400, "Rentang maksimal 366 hari");

  const branchId = s.role === "kepala_cabang" ? s.branchId : q.get("branchId") || "";
  const ok = (x: Record<string, string>) => inScope(s, x) && (!branchId || x.branchId === branchId);
  const [names, txs, exps, deps] = await Promise.all([branchNames(), all("transactions"), all("expenses"), all("deposits")]);

  // Pemasukan: penjualan dijumlahkan per hari per cabang agar buku tidak berisi ribuan baris
  const inc = new Map<string, { date: string; branchId: string; sum: number; n: number }>();
  let incomeCash = 0;
  for (const t of txs.filter(ok)) {
    const date = dayKey(t.createdAt), k = `${date}|${t.branchId}`;
    const r = inc.get(k) ?? { date, branchId: t.branchId, sum: 0, n: 0 };
    r.sum += num(t.total); r.n += 1; inc.set(k, r);
    if (isCash(t.paymentKey)) incomeCash += num(t.total);
  }

  type Raw = Omit<LedgerEntry, "balance"> & { at: string };
  const raw: Raw[] = [
    ...[...inc.values()].map((r): Raw => ({
      id: `in-${r.date}-${r.branchId}`, date: r.date, kind: "pemasukan", label: `Penjualan, ${r.n} transaksi`,
      detail: "", branchName: names[r.branchId] ?? "-", amount: r.sum, at: r.date,
    })),
    ...exps.filter((x) => ok(x) && x.voided !== "TRUE").map((x): Raw => ({
      id: x.id, date: x.date, kind: "pengeluaran", label: x.category || "Pengeluaran",
      detail: x.note, branchName: names[x.branchId] ?? "-", amount: num(x.amount), at: x.createdAt,
    })),
    ...deps.filter((x) => ok(x) && x.voided !== "TRUE").map((x): Raw => ({
      id: x.id, date: x.date, kind: "pencairan", label: `Pencairan ke ${x.bankName}`,
      detail: [x.accountNote, x.note].filter(Boolean).join(", "), branchName: names[x.branchId] ?? "-", amount: num(x.amount), at: x.createdAt,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date) || ORDER[a.kind] - ORDER[b.kind] || a.at.localeCompare(b.at));

  let bal = 0, opening = 0;
  const entries: LedgerEntry[] = raw.map(({ at, ...e }) => {
    bal += e.kind === "pemasukan" ? e.amount : -e.amount;
    if (e.date < from) opening = bal;
    return { ...e, balance: bal };
  });

  const inRange = entries.filter((e) => e.date >= from && e.date <= to);
  const sum = (list: LedgerEntry[], k: LedgerEntry["kind"]) => list.filter((e) => e.kind === k).reduce((a, e) => a + e.amount, 0);
  return {
    range: { from, to, branchId },
    totals: {
      income: sum(entries, "pemasukan"), incomeCash, expense: sum(entries, "pengeluaran"),
      withdrawn: sum(entries, "pencairan"), balance: bal,
    },
    period: {
      opening, income: sum(inRange, "pemasukan"), expense: sum(inRange, "pengeluaran"),
      withdrawn: sum(inRange, "pencairan"), closing: inRange.length ? inRange[inRange.length - 1].balance : opening,
    },
    entries: inRange.reverse(), // terbaru di atas
  };
});