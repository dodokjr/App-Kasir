import { handle, need, HttpError } from "@/lib/api";
import { all, removeByIds, type SheetName } from "@/lib/sheets";

// Tab yang punya kolom storeId. transaction_items dan stock_request_items terhubung lewat induknya
const BY_STORE: SheetName[] = [
  "branches", "users", "products", "transactions", "shifts", "expenses", "receipt_settings", "deposits", "product_images",
  "stock_requests", "stock_request_notes", "targets", "payment_methods", "presence", "discounts", "rental_items", "bookings",
];
const TABS: SheetName[] = ["stores", ...BY_STORE, "transaction_items", "stock_request_items"];

// Hapus toko PERMANEN beserta cabang, akun, produk, transaksi, keuangan, booking, dan lainnya.
// Wajib mengetik ulang nama toko (confirm). Tidak bisa dibatalkan. Pesan dari halaman Kontak tidak ikut terhapus.
// Toggle aktif/nonaktif toko tetap lewat PATCH /api/stores
export const DELETE = handle(async (req) => {
  await need(["developer"]);
  const q = new URL(req.url).searchParams;
  const id = q.get("id") || "";
  const store = (await all("stores", { fresh: true })).find((x) => x.id === id);
  if (!store) throw new HttpError(404, "Toko tidak ditemukan");
  if ((q.get("confirm") || "").trim() !== store.name.trim()) throw new HttpError(400, "Konfirmasi tidak cocok. Ketik nama toko persis seperti tampilan");

  const counts = await removeByIds(TABS, (data) => {
    const plan: Record<string, Set<string>> = {};
    plan.stores = new Set([id]);
    for (const n of BY_STORE) plan[n] = new Set(data[n].filter((r) => r.storeId === id).map((r) => r.id));
    const tx = new Set(plan.transactions);
    plan.transaction_items = new Set(data.transaction_items.filter((r) => tx.has(r.transactionId)).map((r) => r.id));
    const sr = new Set(plan.stock_requests);
    plan.stock_request_items = new Set(data.stock_request_items.filter((r) => sr.has(r.requestId)).map((r) => r.id));
    return plan;
  });
  return { ok: true, counts, total: Object.values(counts).reduce((a, n) => a + n, 0) };
});
