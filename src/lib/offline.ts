// Mode offline: katalog dan antrean transaksi disimpan di perangkat (localStorage).
// File ini murni logika (tanpa React) supaya mudah diuji. Hook-nya ada di useQueue.ts.
import type { ReceiptData } from "./types";
import { calcTotals, lineTotal, isCash, type BusinessType, type DiscountPreset, type PayMethod, type TaxConfig } from "./business";

const K = {
  queue: "kt.queue.v1", device: "kt.device.v1", me: "kt.me.v1", shift: "kt.shift.v1", receipt: "kt.receipt.v1",
  catalog: (branchId: string) => `kt.catalog.v1.${branchId}`,
  seq: (branchId: string, day: string) => `kt.seq.v1.${branchId}.${day}`,
};

function store(): Storage | null { try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; } }
function read<T>(key: string, fallback: T): T {
  try { const s = store()?.getItem(key); return s ? (JSON.parse(s) as T) : fallback; } catch { return fallback; }
}
/** false bila gagal (penyimpanan penuh atau diblokir). Jangan anggap data tersimpan bila false */
function write(key: string, value: unknown): boolean {
  try { const s = store(); if (!s) return false; s.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
function del(key: string) { try { store()?.removeItem(key); } catch { /* abaikan */ } }

/** Kode unik transaksi. Dikirim ke server agar pengiriman ulang tidak pernah mencatat transaksi dua kali */
export function newClientId(): string {
  try { const c = (globalThis as { crypto?: Crypto }).crypto; if (c?.randomUUID) return c.randomUUID(); } catch { /* lanjut */ }
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${h()}${h()}-${h()}-${h()}-${h()}-${h()}${h()}${h()}`;
}

/** Kode 3 karakter per perangkat (huruf pertama selalu huruf). Mencegah nomor offline kembar antar perangkat */
export function deviceCode(): string {
  const have = read<string>(K.device, "");
  if (/^[A-Z][A-Z0-9]{2}$/.test(have)) return have;
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ", A = L + "23456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const code = pick(L) + pick(A) + pick(A);
  write(K.device, code);
  return code;
}

/** Nomor untuk transaksi offline: invoice OFF-YYYYMMDD-KODE-001 dan nomor pesanan A01 (F&B). Berurutan per cabang per hari */
export function nextOfflineNumbers(branchId: string, day: string) {
  const key = K.seq(branchId, day);
  const n = read<number>(key, 0) + 1;
  write(key, n);
  const code = deviceCode();
  return { invoice: `OFF-${day.replace(/-/g, "")}-${code}-${String(n).padStart(3, "0")}`, orderNo: `${code[0]}${String(n).padStart(2, "0")}` };
}

/* ---------- Data yang disimpan agar kasir bisa dibuka tanpa internet ---------- */
export type Catalog = {
  branchId: string; products: Record<string, string>[]; methods: PayMethod[]; tax: TaxConfig;
  discounts: DiscountPreset[]; manualMax: number; savedAt: string;
};
export const saveCatalog = (c: Catalog) => write(K.catalog(c.branchId), c);
export const loadCatalog = (branchId: string) => read<Catalog | null>(K.catalog(branchId), null);

export const saveMe = (me: unknown) => write(K.me, me);
export const loadMe = <T,>() => read<T | null>(K.me, null);
export const clearMe = () => del(K.me);

export const saveShift = (uid: string, shift: unknown) => write(K.shift, { uid, shift });
export const loadShift = <T,>(uid: string) => { const v = read<{ uid: string; shift: T | null } | null>(K.shift, null); return v && v.uid === uid ? v : null; };
export const saveReceiptSettings = (s: unknown) => write(K.receipt, s);
export const loadReceiptSettings = <T,>() => read<T | null>(K.receipt, null);

/* ---------- Antrean transaksi ---------- */
export type QueuedTx = {
  clientId: string; cashierId: string; branchId: string; createdAt: string; total: number;
  /** Isi permintaan ke POST /api/transactions */
  body: Record<string, unknown>;
  /** Struk yang sudah tercetak untuk pembeli */
  receipt: ReceiptData;
  state: "pending" | "failed"; error?: string; tries: number;
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => { try { f(); } catch { /* abaikan */ } });
export const subscribeQueue = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export const getQueue = (): QueuedTx[] => read<QueuedTx[]>(K.queue, []);
const setQueue = (q: QueuedTx[]) => { const ok = write(K.queue, q); emit(); return ok; };

/** false = gagal menyimpan (penyimpanan perangkat penuh). Transaksi TIDAK tersimpan, beri tahu kasir */
export function enqueue(tx: QueuedTx): boolean {
  const q = getQueue();
  if (q.some((x) => x.clientId === tx.clientId)) return true;
  return setQueue([...q, tx]);
}
export const removeTx = (clientId: string) => setQueue(getQueue().filter((x) => x.clientId !== clientId));
export const patchTx = (clientId: string, patch: Partial<QueuedTx>) => setQueue(getQueue().map((x) => (x.clientId === clientId ? { ...x, ...patch } : x)));
export const retryTx = (clientId: string) => patchTx(clientId, { state: "pending", error: undefined });

export function queueCounts(uid?: string) {
  const q = getQueue().filter((x) => !uid || x.cashierId === uid);
  const pending = q.filter((x) => x.state === "pending");
  return {
    pending: pending.length, failed: q.length - pending.length, total: q.length,
    pendingSales: q.reduce((a, x) => a + x.total, 0),
    otherAccounts: uid ? getQueue().length - q.length : 0,
  };
}

/** Jumlah barang yang sudah terjual offline tetapi belum tercatat di server, per produk. Dikurangkan dari stok yang tampil */
export function pendingQty(branchId: string, uid?: string) {
  const m = new Map<string, number>();
  for (const t of getQueue()) {
    if (t.branchId !== branchId || (uid && t.cashierId !== uid)) continue;
    for (const i of (t.body.items as { productId: string; qty: number }[]) ?? []) m.set(i.productId, Math.round(((m.get(i.productId) ?? 0) + Number(i.qty)) * 1000) / 1000);
  }
  return m;
}

type SyncErr = { network?: boolean; status?: number; message?: string };
export type SyncResult = { sent: number; failed: number; stopped: null | "network" | "auth" | "server" };
let running = false;

/**
 * Kirim antrean berurutan (yang tertua dulu). Berhenti saat jaringan putus atau server bermasalah dan dicoba lagi nanti.
 * Galat permanen (data ditolak) menandai transaksi "failed" dan lanjut ke berikutnya, supaya satu masalah tidak menahan semuanya.
 * Hanya transaksi milik akun yang sedang masuk yang dikirim.
 */
export async function syncQueue(post: (body: Record<string, unknown>) => Promise<unknown>, uid: string): Promise<SyncResult> {
  const res: SyncResult = { sent: 0, failed: 0, stopped: null };
  if (running) return res;
  running = true;
  try {
    const todo = getQueue().filter((x) => x.state === "pending" && x.cashierId === uid).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    for (const t of todo) {
      try { await post(t.body); removeTx(t.clientId); res.sent++; }
      catch (raw) {
        const e = raw as SyncErr;
        if (e.network) { res.stopped = "network"; break; }
        if (e.status === 401) { res.stopped = "auth"; break; }
        if ((e.status ?? 0) >= 500 || e.status === 429) { patchTx(t.clientId, { tries: t.tries + 1 }); res.stopped = "server"; break; }
        patchTx(t.clientId, { state: "failed", error: e.message || "Ditolak server", tries: t.tries + 1 });
        res.failed++;
      }
    }
  } finally { running = false; }
  return res;
}

/* ---------- Struk lokal ---------- */
export type LocalReceiptArgs = {
  invoice: string; orderNo: string; createdAt: string; storeName: string; branchName: string; street: string; cashierName: string;
  biz: BusinessType; lines: { name: string; price: number; qty: number; unit: string; note: string }[];
  discount: { type: "percent" | "nominal"; value: number; name: string } | null; taxCfg: TaxConfig;
  method: { key: string; label: string }; paymentRef: string; paid: number;
  orderType: string; tableNo: string; customerName: string;
};

/** Menyusun struk dengan rumus yang sama persis dengan server (calcTotals, lineTotal) */
export function buildLocalReceipt(a: LocalReceiptArgs): ReceiptData {
  const items = a.lines.map((l) => ({ name: l.name, price: l.price, qty: l.qty, unit: l.unit, note: l.note, subtotal: lineTotal(l.price, l.qty) }));
  const sub = items.reduce((x, i) => x + i.subtotal, 0);
  const t = calcTotals(sub, a.discount, a.taxCfg);
  const paid = isCash(a.method.key) ? a.paid : t.total;
  return {
    invoice: a.invoice, storeName: a.storeName, branchName: a.branchName, street: a.street, cashierName: a.cashierName, createdAt: a.createdAt,
    items, total: t.total, paid, change: Math.max(0, paid - t.total), businessType: a.biz,
    paymentKey: a.method.key, paymentLabel: a.method.label, paymentRef: a.paymentRef,
    orderType: a.orderType, tableNo: a.tableNo, customerName: a.customerName, orderNo: a.orderNo,
    subtotal: sub, taxAmount: t.tax, taxRate: a.taxCfg.enabled ? a.taxCfg.rate : 0, taxMode: a.taxCfg.enabled ? a.taxCfg.mode : "",
    discountName: a.discount && t.discount > 0 ? a.discount.name : "", discountAmount: t.discount,
  };
}