import { all } from "@/lib/sheets";
import type { ItemAgg, PayAgg, ShiftOut } from "@/lib/shiftTypes";
import { isCash } from "@/lib/business";

type R = Record<string, string>;
const num = (v: unknown) => Number(v) || 0;

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });
/** Tanggal (YYYY-MM-DD) menurut WIB dari waktu ISO */
export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso).slice(0, 10) : dayFmt.format(d);
};

export function aggregateItems(items: R[]): ItemAgg[] {
  const m = new Map<string, ItemAgg>();
  for (const i of items) {
    const k = i.productId || i.name;
    const cur = m.get(k) ?? { productId: i.productId, name: i.name, qty: 0, subtotal: 0, unit: i.unit || "pcs" };
    cur.qty = Math.round((cur.qty + num(i.qty)) * 1000) / 1000;
    cur.subtotal += num(i.subtotal);
    m.set(k, cur);
  }
  return [...m.values()].sort((a, b) => b.subtotal - a.subtotal);
}

export function aggregatePayments(txs: R[]): PayAgg[] {
  const m = new Map<string, PayAgg>();
  for (const t of txs) {
    const key = t.paymentKey || "cash";
    const cur = m.get(key) ?? { key, label: t.paymentLabel || "Cash", total: 0, count: 0 };
    cur.total += num(t.total); cur.count += 1; m.set(key, cur);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/**
 * Menjumlahkan semua transaksi milik kasir ini di cabang shift,
 * dari waktu buka kasir sampai `until` (atau waktu tutup / sekarang).
 */
export async function summarize(shift: R, until?: string) {
  const end = until ?? (shift.closedAt || "");
  const txs = (await all("transactions")).filter(
    (t) =>
      t.storeId === shift.storeId && t.branchId === shift.branchId && t.cashierId === shift.cashierId &&
      t.createdAt >= shift.openedAt && (!end || t.createdAt <= end),
  );
  const ids = new Set(txs.map((t) => t.id));
  const items = aggregateItems((await all("transaction_items")).filter((i) => ids.has(i.transactionId)));
  const totalSales = txs.reduce((a, t) => a + num(t.total), 0);
  const payments = aggregatePayments(txs);
  // Hanya penjualan tunai yang ada di laci. QRIS, transfer, dan pesan antar masuk lewat rekening/platform
  const cashSales = payments.filter((p) => isCash(p.key)).reduce((a, p) => a + p.total, 0);
  const openingCash = num(shift.openingCash);
  return {
    txCount: txs.length,
    itemsSold: Math.round(items.reduce((a, i) => a + i.qty, 0) * 1000) / 1000,
    totalSales,
    openingCash,
    cashSales,
    expectedCash: openingCash + cashSales,
    items,
    payments,
  };
}
export type Summary = Awaited<ReturnType<typeof summarize>>;

export async function branchNames() {
  const m: Record<string, string> = {};
  for (const b of await all("branches")) m[b.id] = b.street ? `${b.name} (${b.street})` : b.name;
  return m;
}

export function shape(shift: R, names: Record<string, string>, live?: Summary, withItems = true): ShiftOut {
  const open = shift.status === "open";
  let items: ItemAgg[] = [];
  let payments: PayAgg[] = [];
  if (open && live) { items = live.items; payments = live.payments; }
  else if (withItems) {
    try { items = JSON.parse(shift.itemsJson || "[]"); } catch { items = []; }
    try { payments = JSON.parse(shift.paymentsJson || "[]"); } catch { payments = []; }
  }
  // Shift lama (sebelum ada metode pembayaran): semua penjualan dianggap tunai
  const cashSales = open && live ? live.cashSales
    : payments.length ? payments.filter((p) => isCash(p.key)).reduce((a, p) => a + p.total, 0) : num(shift.totalSales);
  return {
    id: shift.id,
    branchId: shift.branchId,
    branchName: names[shift.branchId] ?? "-",
    cashierId: shift.cashierId,
    cashierName: shift.cashierName,
    openedAt: shift.openedAt,
    closedAt: shift.closedAt || "",
    status: open ? "open" : "closed",
    openingCash: num(shift.openingCash),
    totalSales: open && live ? live.totalSales : num(shift.totalSales),
    txCount: open && live ? live.txCount : num(shift.txCount),
    itemsSold: open && live ? live.itemsSold : num(shift.itemsSold),
    expectedCash: open && live ? live.expectedCash : num(shift.expectedCash),
    countedCash: open ? null : shift.countedCash === "" ? null : num(shift.countedCash),
    difference: open ? null : shift.difference === "" ? null : num(shift.difference),
    note: shift.note || "",
    items,
    payments,
    cashSales,
  };
}
