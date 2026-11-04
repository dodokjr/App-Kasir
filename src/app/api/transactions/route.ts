import { handle, need, inScope, HttpError } from "@/lib/api";
import { all, add, addMany, updateMany, uid, now } from "@/lib/sheets";
import { buildReceipt } from "@/lib/receipt";
import { methodsOf } from "@/lib/payments";
import { dayKey } from "@/lib/shift";
import { isCash, lineTotal, normBusiness, roundQty, stepOf, validQty, ORDER_TYPES } from "@/lib/business";

export const GET = handle(async (req) => {
  const s = await need();
  const q = new URL(req.url).searchParams;
  const id = q.get("id");
  const branchId = q.get("branchId");
  let txs = (await all("transactions")).filter((t) => inScope(s, t));
  if (branchId) txs = txs.filter((t) => t.branchId === branchId);
  if (id) {
    const tx = txs.find((t) => t.id === id);
    if (!tx) throw new HttpError(404, "Transaksi tidak ditemukan");
    return buildReceipt(tx);
  }
  return txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
});

type InLine = { productId: string; qty: number; note?: string };
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);

export const POST = handle(async (req) => {
  const s = await need(["kasir", "kepala_toko", "kepala_cabang"]);
  const b = await req.json();
  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, "Keranjang kosong");

  // Penjualan hanya boleh saat kasir dibuka. Cabang mengikuti cabang yang dipilih saat buka kasir
  const [shifts, stores, allTx, allProducts] = await Promise.all([all("shifts"), all("stores"), all("transactions"), all("products")]);
  const shift = shifts.find((x) => x.cashierId === s.uid && x.status === "open");
  if (!shift) throw new HttpError(400, "Kasir belum dibuka. Buka kasir terlebih dulu");
  const branchId = shift.branchId;
  const store = stores.find((x) => x.id === s.storeId);
  if (store?.active === "FALSE") throw new HttpError(403, "Toko dinonaktifkan. Hubungi admin");
  const biz = normBusiness(store?.businessType);

  // Gabungkan baris yang produknya sama supaya pengecekan stok tidak bisa dilewati
  const merged = new Map<string, InLine>();
  for (const i of b.items as InLine[]) {
    const cur = merged.get(i.productId);
    if (cur) { cur.qty = Number(cur.qty) + Number(i.qty); if (i.note && !cur.note) cur.note = i.note; }
    else merged.set(i.productId, { productId: String(i.productId), qty: Number(i.qty), note: i.note });
  }

  // Harga & stok selalu diambil dari server, bukan dari browser
  const prods = allProducts.filter((p) => p.branchId === branchId);
  const lines = [...merged.values()].map((i) => {
    const p = prods.find((x) => x.id === i.productId);
    if (!p) throw new HttpError(400, "Ada produk yang tidak terdaftar di cabang Anda. Muat ulang halaman Kasir");
    const unit = p.unit || "pcs";
    const step = stepOf(unit);
    const qty = roundQty(i.qty);
    if (!validQty(qty, step)) {
      throw new HttpError(400, step < 1 ? `Jumlah ${p.name} harus kelipatan 0,1 ${unit} (minimal 0,1)` : `Jumlah ${p.name} tidak valid`);
    }
    if (Number(p.stock) + 1e-9 < qty) throw new HttpError(400, `Stok ${p.name} tidak cukup (sisa ${p.stock} ${unit})`);
    const price = Number(p.price);
    return { p, qty, unit, price, subtotal: lineTotal(price, qty), note: biz === "fnb" ? clip(i.note, 80) : "" };
  });
  const total = lines.reduce((a, l) => a + l.subtotal, 0);

  // Metode pembayaran: hanya yang diaktifkan kepala toko. Cash dan transfer bank selalu ada
  const methods = await methodsOf(s.storeId);
  const method = methods.find((m) => m.key === (b.paymentKey || "cash"));
  if (!method) throw new HttpError(400, "Metode pembayaran tidak tersedia. Muat ulang halaman Kasir");
  let paid = Number(b.paid), change = 0;
  if (isCash(method.key)) {
    if (!(paid >= total)) throw new HttpError(400, "Uang bayar kurang dari total");
    change = paid - total;
  } else {
    paid = total; // non-tunai dibayar pas
  }

  // Data pesanan khusus F&B
  let orderType = "", tableNo = "", customerName = "";
  if (biz === "fnb") {
    orderType = b.orderType || "dine_in";
    if (!ORDER_TYPES.some((o) => o.key === orderType)) throw new HttpError(400, "Jenis pesanan tidak valid");
    tableNo = orderType === "dine_in" ? clip(b.tableNo, 10) : "";
    customerName = clip(b.customerName, 40);
  }

  // Nomor urut per cabang per hari (WIB). Invoice dibuat unik walau dua kasir menyimpan bersamaan
  const today = dayKey(new Date().toISOString());
  const todays = allTx.filter((t) => t.branchId === branchId && dayKey(t.createdAt) === today);
  const used = new Set(allTx.map((t) => t.invoice));
  const code = branchId.slice(0, 3).toUpperCase();
  let seq = todays.length + 1, invoice = "";
  do { invoice = `INV-${today.replace(/-/g, "")}-${code}-${String(seq).padStart(4, "0")}`; seq++; } while (used.has(invoice));
  const orderNo = biz === "fnb"
    ? String(Math.max(0, ...todays.map((t) => Number(t.orderNo) || 0)) + 1).padStart(2, "0")
    : "";

  const id = uid();
  const tx = {
    id, invoice, storeId: s.storeId, branchId, cashierId: s.uid, cashierName: s.name,
    total: String(total), paid: String(paid), change: String(change), createdAt: now(),
    paymentKey: method.key, paymentLabel: method.label, paymentRef: clip(b.paymentRef, 40),
    orderType, tableNo, customerName, orderNo,
  };
  await add("transactions", tx);
  await addMany("transaction_items", lines.map((l) => ({
    id: uid(), transactionId: id, productId: l.p.id, name: l.p.name,
    price: String(l.price), qty: String(l.qty), subtotal: String(l.subtotal), unit: l.unit, note: l.note,
  })));
  await updateMany("products", lines.map((l) => ({ id: l.p.id, patch: { stock: String(roundQty(Number(l.p.stock) - l.qty)) } })));
  return buildReceipt(tx);
});
