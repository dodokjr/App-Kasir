import { google } from "googleapis";

export const SCHEMA = {
  stores: ["id", "name", "active", "createdAt", "businessType"],
  branches: ["id", "storeId", "name", "street", "createdAt"],
  users: ["id", "storeId", "branchId", "name", "email", "passwordHash", "role", "active", "createdAt"],
  products: ["id", "storeId", "branchId", "sku", "name", "price", "stock", "createdAt", "unit"],
  transactions: ["id", "invoice", "storeId", "branchId", "cashierId", "cashierName", "total", "paid", "change", "createdAt", "paymentKey", "paymentLabel", "paymentRef", "orderType", "tableNo", "customerName", "orderNo"],
  transaction_items: ["id", "transactionId", "productId", "name", "price", "qty", "subtotal", "unit", "note"],
  messages: ["id", "name", "email", "subject", "message", "createdAt"],
  shifts: ["id", "storeId", "branchId", "cashierId", "cashierName", "openedAt", "openingCash", "status", "closedAt", "countedCash", "expectedCash", "difference", "totalSales", "txCount", "itemsSold", "itemsJson", "note", "paymentsJson"],
  expenses: ["id", "storeId", "branchId", "date", "category", "note", "amount", "createdById", "createdByName", "createdAt", "voided"],
  receipt_settings: ["id", "storeId", "storeName", "address", "phone", "header", "footer", "paper", "showInvoice", "showCashier", "showPayment", "autoPrint", "updatedAt"],
  payment_methods: ["id", "storeId", "key", "label", "group", "active", "createdAt"],
  presence: ["id", "storeId", "branchId", "name", "role", "lastSeen", "page"],
} as const;

export type SheetName = keyof typeof SCHEMA;
export type Row = Record<string, string>;

export const uid = () => crypto.randomUUID().slice(0, 8);
export const now = () => new Date().toISOString();

function client() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_CLIENT_EMAIL,
    key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}
const sid = () => process.env.GOOGLE_SHEET_ID!;

let ready: Promise<void> | null = null;
export function init() {
  if (!ready) ready = setup().catch((e) => { ready = null; throw e; });
  return ready;
}

// Membuat tab + header otomatis jika belum ada
async function setup() {
  const s = client();
  const meta = await s.spreadsheets.get({ spreadsheetId: sid() });
  const have = new Set(meta.data.sheets?.map((x) => x.properties?.title));
  const names = Object.keys(SCHEMA) as SheetName[];
  const missing = names.filter((n) => !have.has(n));
  if (missing.length) {
    await s.spreadsheets.batchUpdate({
      spreadsheetId: sid(),
      requestBody: { requests: missing.map((title) => ({ addSheet: { properties: { title } } })) },
    });
    for (const n of missing) {
      await s.spreadsheets.values.update({
        spreadsheetId: sid(), range: `${n}!A1`, valueInputOption: "RAW",
        requestBody: { values: [[...SCHEMA[n]]] },
      });
    }
  }

  // Versi lama: tab sudah ada tetapi belum punya kolom baru. Kolom baru selalu di ujung kanan,
  // jadi cukup menulis ulang baris header (data lama tidak bergeser).
  for (const n of names.filter((x) => have.has(x))) {
    const r = await s.spreadsheets.values.get({ spreadsheetId: sid(), range: `${n}!1:1` });
    const head = (r.data.values?.[0] ?? []) as string[];
    const want = SCHEMA[n] as readonly string[];
    const same = head.length >= want.length && want.every((k, i) => head[i] === k);
    if (same) continue;
    const prefixOk = head.every((k, i) => want[i] === k);
    if (!prefixOk) throw new Error(`Header tab "${n}" tidak cocok dengan skema aplikasi. Jangan ubah urutan kolom di Google Sheets`);
    await s.spreadsheets.values.update({
      spreadsheetId: sid(), range: `${n}!A1`, valueInputOption: "RAW", requestBody: { values: [[...want]] },
    });
  }
}

export async function all(name: SheetName): Promise<Row[]> {
  await init();
  const r = await client().spreadsheets.values.get({ spreadsheetId: sid(), range: `${name}!A:Z` });
  const [head, ...rows] = r.data.values ?? [];
  if (!head) return [];
  return rows.map((v) => Object.fromEntries(head.map((k: string, i: number) => [k, String(v[i] ?? "")])));
}

const toValues = (name: SheetName, o: Row) => SCHEMA[name].map((k) => o[k] ?? "");

export async function addMany(name: SheetName, objs: Row[]) {
  await init();
  await client().spreadsheets.values.append({
    spreadsheetId: sid(), range: `${name}!A1`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS",
    requestBody: { values: objs.map((o) => toValues(name, o)) },
  });
}
export const add = (name: SheetName, obj: Row) => addMany(name, [obj]);

export async function update(name: SheetName, id: string, patch: Partial<Row>) {
  await init();
  const s = client();
  const r = await s.spreadsheets.values.get({ spreadsheetId: sid(), range: `${name}!A:Z` });
  const rows = r.data.values ?? [];
  const idx = rows.findIndex((v, i) => i > 0 && v[0] === id);
  if (idx < 0) throw new Error("Data tidak ditemukan");
  const head = rows[0] as string[];
  const cur: Row = Object.fromEntries(head.map((k, i) => [k, String(rows[idx][i] ?? "")]));
  const next = { ...cur, ...patch } as Row;
  await s.spreadsheets.values.update({
    spreadsheetId: sid(), range: `${name}!A${idx + 1}`, valueInputOption: "RAW",
    requestBody: { values: [toValues(name, next)] },
  });
}

// Ubah banyak baris sekaligus dengan 1x baca + 1x tulis (hemat kuota Google Sheets)
export async function updateMany(name: SheetName, patches: { id: string; patch: Partial<Row> }[]) {
  if (!patches.length) return;
  await init();
  const s = client();
  const r = await s.spreadsheets.values.get({ spreadsheetId: sid(), range: `${name}!A:Z` });
  const rows = r.data.values ?? [];
  const head = (rows[0] ?? []) as string[];
  const data: { range: string; values: string[][] }[] = [];
  for (const { id, patch } of patches) {
    const idx = rows.findIndex((v, i) => i > 0 && v[0] === id);
    if (idx < 0) throw new Error("Data tidak ditemukan");
    const cur: Row = Object.fromEntries(head.map((k, i) => [k, String(rows[idx][i] ?? "")]));
    data.push({ range: `${name}!A${idx + 1}`, values: [toValues(name, { ...cur, ...patch } as Row)] });
  }
  await s.spreadsheets.values.batchUpdate({
    spreadsheetId: sid(), requestBody: { valueInputOption: "RAW", data },
  });
}
