import { handle, need, inScope, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { isCash } from "@/lib/business";
import { aggregateItems, aggregatePayments, dayKey, shape, branchNames } from "@/lib/shift";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => Number(v) || 0;

export const GET = handle(async (req) => {
  const s = await need(["kepala_toko", "kepala_cabang"]);
  const q = new URL(req.url).searchParams;
  const today = dayKey(new Date().toISOString());
  const from = q.get("from") || today;
  const to = q.get("to") || today;
  if (!DATE.test(from) || !DATE.test(to) || from > to) throw new HttpError(400, "Rentang tanggal tidak valid");
  if ((Date.parse(to) - Date.parse(from)) / 864e5 > 366) throw new HttpError(400, "Rentang maksimal 366 hari");

  const branchId = s.role === "kepala_cabang" ? s.branchId : q.get("branchId") || "";
  const inBranch = (x: Record<string, string>) => !branchId || x.branchId === branchId;
  const [names, allTx, allItems, allExp, allDep, allShifts] = await Promise.all([
    branchNames(), all("transactions"), all("transaction_items"), all("expenses"), all("deposits"), all("shifts"),
  ]);

  const txs = allTx.filter((t) => {
    const d = dayKey(t.createdAt);
    return inScope(s, t) && inBranch(t) && d >= from && d <= to;
  });
  const ids = new Set(txs.map((t) => t.id));
  const items = aggregateItems(allItems.filter((i) => ids.has(i.transactionId)));

  const expenses = allExp.filter(
    (x) => inScope(s, x) && inBranch(x) && x.voided !== "TRUE" && x.date >= from && x.date <= to,
  );
  const deposits = allDep.filter(
    (x) => inScope(s, x) && inBranch(x) && x.voided !== "TRUE" && x.date >= from && x.date <= to,
  );
  const shifts = allShifts.filter((x) => {
    const d = dayKey(x.openedAt);
    return inScope(s, x) && inBranch(x) && d >= from && d <= to;
  });

  const daily = new Map<string, { date: string; sales: number; tx: number; expenses: number }>();
  const day = (d: string) => daily.get(d) ?? (daily.set(d, { date: d, sales: 0, tx: 0, expenses: 0 }), daily.get(d)!);
  for (const t of txs) { const r = day(dayKey(t.createdAt)); r.sales += num(t.total); r.tx += 1; }
  for (const x of expenses) day(x.date).expenses += num(x.amount);

  const byBranch = new Map<string, { branchId: string; name: string; sales: number; tx: number }>();
  for (const t of txs) {
    const r = byBranch.get(t.branchId) ?? { branchId: t.branchId, name: names[t.branchId] ?? "-", sales: 0, tx: 0 };
    r.sales += num(t.total); r.tx += 1; byBranch.set(t.branchId, r);
  }

  const sales = txs.reduce((a, t) => a + num(t.total), 0);
  const spent = expenses.reduce((a, x) => a + num(x.amount), 0);
  const closed = shifts.filter((x) => x.status === "closed");

  return {
    range: { from, to, branchId },
    summary: {
      sales, txCount: txs.length, itemsSold: Math.round(items.reduce((a, i) => a + i.qty, 0) * 1000) / 1000,
      avgTicket: txs.length ? Math.round(sales / txs.length) : 0,
      expenses: spent, net: sales - spent,
      tax: txs.reduce((a, t) => a + num(t.taxAmount), 0),
      // Penjualan tunai (transaksi lama tanpa metode dianggap tunai) dan jumlah yang sudah dicatat disetor ke rekening
      cashSales: txs.filter((t) => isCash(t.paymentKey)).reduce((a, t) => a + num(t.total), 0),
      deposited: deposits.reduce((a, x) => a + num(x.amount), 0),
      shiftsClosed: closed.length, shiftsOpen: shifts.length - closed.length,
      cashDifference: closed.reduce((a, x) => a + num(x.difference), 0),
    },
    daily: [...daily.values()].sort((a, b) => b.date.localeCompare(a.date)),
    items: items.slice(0, 50),
    byPayment: aggregatePayments(txs),
    byBranch: branchId ? [] : [...byBranch.values()].sort((a, b) => b.sales - a.sales),
    shifts: shifts.sort((a, b) => b.openedAt.localeCompare(a.openedAt)).map((x) => shape(x, names, undefined, false)),
    deposits: deposits.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map((x) => ({ ...x, branchName: names[x.branchId] ?? "-" })),
    expenses: expenses.sort((a, b) => b.date.localeCompare(a.date)).map((x) => ({ ...x, branchName: names[x.branchId] ?? "-" })),
  };
});