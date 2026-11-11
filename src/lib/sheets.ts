import { google } from "googleapis";

export const SCHEMA = {
  stores: ["id", "name", "active", "createdAt", "businessType", "ppnEnabled", "ppnRate", "ppnMode"],
  branches: ["id", "storeId", "name", "street", "createdAt"],
  users: ["id", "storeId", "branchId", "name", "email", "passwordHash", "role", "active", "createdAt"],
  products: ["id", "storeId", "branchId", "sku", "name", "price", "stock", "createdAt", "unit", "imageVer"],
  transactions: ["id", "invoice", "storeId", "branchId", "cashierId", "cashierName", "total", "paid", "change", "createdAt", "paymentKey", "paymentLabel", "paymentRef", "orderType", "tableNo", "customerName", "orderNo", "subtotal", "taxAmount", "taxRate", "taxMode"],
  transaction_items: ["id", "transactionId", "productId", "name", "price", "qty", "subtotal", "unit", "note"],
  messages: ["id", "name", "email", "subject", "message", "createdAt", "readAt", "readBy"],
  shifts: ["id", "storeId", "branchId", "cashierId", "cashierName", "openedAt", "openingCash", "status", "closedAt", "countedCash", "expectedCash", "difference", "totalSales", "txCount", "itemsSold", "itemsJson", "note", "paymentsJson"],
  expenses: ["id", "storeId", "branchId", "date", "category", "note", "amount", "createdById", "createdByName", "createdAt", "voided"],
  receipt_settings: ["id", "storeId", "storeName", "address", "phone", "header", "footer", "paper", "showInvoice", "showCashier", "showPayment", "autoPrint", "updatedAt"],
  deposits: ["id", "storeId", "branchId", "date", "amount", "bankName", "accountNote", "note", "createdById", "createdByName", "createdAt", "voided"],
  product_images: ["id", "storeId", "branchId", "mime", "data", "updatedAt"],
  stock_requests: ["id", "storeId", "branchId", "requestNo", "status", "requestedById", "requestedByName", "note", "createdAt", "updatedAt", "fromBranchId", "trackingNo", "handledByName", "handledNote", "shippedAt", "receivedAt", "receivedByName", "receiveNote", "closedAt"],
  stock_request_items: ["id", "requestId", "productId", "name", "sku", "unit", "qty", "fromProductId", "sentQty", "receivedQty"],
  stock_request_notes: ["id", "requestId", "storeId", "authorId", "authorName", "authorRole", "text", "createdAt"],
  payment_methods: ["id", "storeId", "key", "label", "group", "active", "createdAt"],
  presence: ["id", "storeId", "branchId", "name", "role", "lastSeen", "page"],
} as const;

export type SheetName = keyof typeof SCHEMA;
export type Row = Record<string, string>;

export const uid = () => crypto.randomUUID().slice(0, 8);
export const now = () => new Date().toISOString();

// Semua keadaan disimpan di globalThis agar tidak hilang saat kode dimuat ulang (hot reload) di mode dev
type Entry = { rows: Row[]; at: number };
type Waiter = { resolve: (r: Row[]) => void; reject: (e: unknown) => void };
type Store = {
  client?: ReturnType<typeof google.sheets>;
  ready?: Promise<void> | null;
  cache: Map<SheetName, Entry>;
  inflight: Map<SheetName, Promise<Row[]>>;
  ver: Map<SheetName, number>;
  queue: Map<SheetName, Waiter>;
  timer?: ReturnType<typeof setTimeout>;
};
const g = globalThis as unknown as { __sheets?: Store };
const S: Store = (g.__sheets ??= { cache: new Map(), inflight: new Map(), ver: new Map(), queue: new Map() });

// Google Sheets membatasi ±60 permintaan baca per menit. Karena itu:
//  1. hasil baca disimpan singkat di memori (TTL), dan dibuang begitu ada penulisan ke tab itu
//  2. beberapa tab yang dibaca bersamaan digabung menjadi 1 permintaan (batchGet)
//  3. bila Google menolak karena kuota, data lama (maks. 5 menit) tetap dipakai daripada error
const TTL_MS = Number(process.env.SHEETS_CACHE_MS ?? 10_000);
const BATCH_MS = 20;
const STALE_MS = 5 * 60_000;

function client() {
  if (S.client) return S.client;
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return (S.client = google.sheets({ version: "v4", auth }));
}
const sid = () => process.env.GOOGLE_SHEET_ID!;

export const isQuotaError = (e: unknown) => {
  const x = e as { code?: number; status?: number; message?: string };
  return x?.code === 429 || x?.status === 429 || /quota exceeded|rate.?limit/i.test(String(x?.message));
};

export function init() {
  if (!S.ready) S.ready = setup().catch((e) => { S.ready = null; throw e; });
  return S.ready;
}

// Membuat tab + header otomatis jika belum ada. Hanya 2 permintaan baca, dan hanya sekali per proses
async function setup() {
  const s = client();
  const meta = await s.spreadsheets.get({ spreadsheetId: sid(), fields: "sheets.properties.title" });
  const have = new Set(meta.data.sheets?.map((x) => x.properties?.title));
  const names = Object.keys(SCHEMA) as SheetName[];
  const missing = names.filter((n) => !have.has(n));
  if (missing.length) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: sid(),
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
    await s.spreadsheets.values.batchUpdate({
      spreadsheetId: sid(),
      requestBody: { valueInputOption: "RAW", data: missing.map((n) => ({ range: `${n}!A1`, values: [[...SCHEMA[n]]] })) },
    });
  }

  // Versi lama: tab sudah ada tetapi belum punya kolom baru. Kolom baru selalu di ujung kanan,
  // jadi cukup menulis ulang baris header (data lama tidak bergeser). Semua header dibaca sekaligus.
  const existing = names.filter((x) => have.has(x));
  if (!existing.length) return;
  const r = await s.spreadsheets.values.batchGet({ spreadsheetId: sid(), ranges: existing.map((n) => `${n}!1:1`) });
  const fix: { range: string; values: string[][] }[] = [];
  existing.forEach((n, i) => {
    const head = (r.data.valueRanges?.[i]?.values?.[0] ?? []) as string[];
    const want = SCHEMA[n] as readonly string[];
    if (head.length >= want.length && want.every((k, j) => head[j] === k)) return;
    if (!head.every((k, j) => want[j] === k)) throw new Error(`Header tab "${n}" tidak cocok dengan skema aplikasi. Jangan ubah urutan kolom di Google Sheets`);
    fix.push({ range: `${n}!A1`, values: [[...want]] });
  });
  if (fix.length) await s.spreadsheets.values.batchUpdate({ spreadsheetId: sid(), requestBody: { valueInputOption: "RAW", data: fix } });
}

const parse = (values: unknown[][] | null | undefined): Row[] => {
  const [head, ...rows] = (values ?? []) as string[][];
  if (!head) return [];
  return rows.map((v) => Object.fromEntries(head.map((k, i) => [k, String(v[i] ?? "")])));
};

// Tab yang diminta dalam jeda singkat digabung menjadi satu permintaan batchGet
async function flush() {
  const batch = [...S.queue.entries()];
  S.queue.clear(); S.timer = undefined;
  const vers = batch.map(([n]) => S.ver.get(n) ?? 0);
  try {
    const r = await client().spreadsheets.values.batchGet({ spreadsheetId: sid(), ranges: batch.map(([n]) => `${n}!A:Z`) });
    batch.forEach(([n, w], i) => {
      const rows = parse(r.data.valueRanges?.[i]?.values);
      // Jangan simpan jika tab ini ditulis selagi pembacaan berjalan (datanya sudah usang)
      if ((S.ver.get(n) ?? 0) === vers[i]) S.cache.set(n, { rows, at: Date.now() });
      w.resolve(rows);
    });
  } catch (e) {
    for (const [n, w] of batch) {
      const c = S.cache.get(n);
      if (c && isQuotaError(e) && Date.now() - c.at < STALE_MS) { console.warn(`[sheets] kuota habis, memakai data lama untuk ${n}`); w.resolve(c.rows); }
      else w.reject(e);
    }
  }
}

function load(name: SheetName): Promise<Row[]> {
  const ex = S.inflight.get(name);
  if (ex) return ex;
  const p: Promise<Row[]> = new Promise<Row[]>((resolve, reject) => {
    S.queue.set(name, { resolve, reject });
    if (!S.timer) S.timer = setTimeout(flush, BATCH_MS);
  }).finally(() => { if (S.inflight.get(name) === p) S.inflight.delete(name); });
  S.inflight.set(name, p);
  return p;
}

// Panggil setelah menulis ke tab: buang cache supaya bacaan berikutnya mengambil data baru
function touch(name: SheetName) {
  S.cache.delete(name); S.inflight.delete(name); S.ver.set(name, (S.ver.get(name) ?? 0) + 1);
}

/**
 * Baca satu tab. `fresh: true` melewati cache; dipakai untuk keputusan yang tidak boleh memakai data usang
 * (stok saat bayar, cek email sudah terdaftar, kasir sudah dibuka).
 */
export async function all(name: SheetName, opts?: { fresh?: boolean }): Promise<Row[]> {
  await init();
  const c = S.cache.get(name);
  if (!opts?.fresh && c && Date.now() - c.at < TTL_MS) return c.rows.slice();
  return (await load(name)).slice();
}

const toValues = (name: SheetName, o: Row) => SCHEMA[name].map((k) => o[k] ?? "");

export async function addMany(name: SheetName, objs: Row[]) {
  await init();
  try {
    await client().spreadsheets.values.append({
      spreadsheetId: sid(), range: `${name}!A1`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
      requestBody: { values: objs.map((o) => toValues(name, o)) },
    });
  } finally { touch(name); }
}
export const add = (name: SheetName, obj: Row) => addMany(name, [obj]);

// Ubah satu baris (kolom pertama selalu id). Baris dicari dari data terbaru, bukan dari cache
export async function update(name: SheetName, id: string, patch: Partial<Row>) {
  await updateMany(name, [{ id, patch }]);
}

// Ubah banyak baris sekaligus dengan 1x baca + 1x tulis (hemat kuota Google Sheets)
export async function updateMany(name: SheetName, patches: { id: string; patch: Partial<Row> }[]) {
  if (!patches.length) return;
  await init();
  const rows = await all(name, { fresh: true });
  const data: { range: string; values: string[][] }[] = [];
  for (const { id, patch } of patches) {
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error("Data tidak ditemukan");
    // baris data pertama ada di baris sheet ke-2 (baris 1 = header)
    data.push({ range: `${name}!A${i + 2}`, values: [toValues(name, { ...rows[i], ...patch } as Row)] });
  }
  try {
    await client().spreadsheets.values.batchUpdate({ spreadsheetId: sid(), requestBody: { valueInputOption: "RAW", data } });
  } finally { touch(name); }
}