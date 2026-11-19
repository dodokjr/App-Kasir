import { handle, need, inScope, HttpError } from "@/lib/api";
import { all, add, addMany, updateMany, uid, now } from "@/lib/sheets";
import { buildReceipt } from "@/lib/receipt";
import { methodsOf } from "@/lib/payments";
import { dayKey } from "@/lib/shift";
import type { Session } from "@/lib/auth";
import {
  calcDiscount, calcTotals, discountUsable, isCash, isFoodDelivery, lineTotal, normBusiness, normRate, parseTax, roundQty, stepOf, validQty,
  ORDER_TYPES, type DiscountInput, type DiscountPreset, type TaxConfig,
} from "@/lib/business";

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

type InLine = { productId: string; qty: number; note?: string; price?: number };
type InDiscount = { presetId?: string; manual?: boolean; name?: string; type?: string; value?: number; note?: string };
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const num = (v: unknown) => Number(v) || 0;
const CLIENT_ID = /^[A-Za-z0-9-]{8,64}$/;
const OFFLINE_NO = /^OFF-[A-Z0-9-]{6,32}$/;
const stepMsg = (name: string, unit: string) => (stepOf(unit) < 1 ? `Jumlah ${name} harus kelipatan 0,1 ${unit} (minimal 0,1)` : `Jumlah ${name} tidak valid`);

/**
 * Dua jalur:
 *  - ONLINE (biasa): harga, stok, PPN, dan diskon diambil dari server dan divalidasi ketat.
 *  - OFFLINE (b.offline = true): kasir sudah melayani pembeli tanpa internet dan struk sudah tercetak, jadi penjualan
 *    TETAP dicatat memakai harga/diskon/PPN yang tercetak. Bila ada yang berbeda dari data server saat ini
 *    (harga berubah, stok kurang, diskon tidak cocok, dst.) transaksi diberi tanda "review" untuk ditinjau kepala toko.
 * clientId membuat pengiriman ulang aman: transaksi yang sama tidak pernah tercatat dua kali.
 */
async function create(s: Session, b: Record<string, any>) {
  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, "Keranjang kosong");
  const offline = b.offline === true;
  const clientId = b.clientId === undefined || b.clientId === "" ? "" : String(b.clientId);
  if (clientId && !CLIENT_ID.test(clientId)) throw new HttpError(400, "Kode transaksi tidak valid");
  if (offline && !clientId) throw new HttpError(400, "Transaksi offline wajib punya kode transaksi");
  const review: string[] = [];

  const [shifts, stores, allTx, allProducts, presets] = await Promise.all([
    all("shifts", { fresh: true }), all("stores"), all("transactions", { fresh: true }), all("products", { fresh: true }), all("discounts"),
  ]);

  // Sudah pernah tercatat (kirim ulang setelah koneksi putus): kembalikan struk yang sama, jangan catat lagi
  if (clientId) {
    const dup = allTx.find((t) => t.clientId === clientId && t.storeId === s.storeId);
    if (dup) return buildReceipt(dup);
  }

  // Penjualan hanya boleh saat kasir dibuka. Cabang mengikuti cabang yang dipilih saat buka kasir
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
    else merged.set(String(i.productId), { productId: String(i.productId), qty: Number(i.qty), note: i.note, price: i.price });
  }

  const prods = allProducts.filter((p) => p.branchId === branchId);
  const lines = [...merged.values()].map((i) => {
    const p = prods.find((x) => x.id === i.productId);
    if (!p) throw new HttpError(400, "Ada produk yang tidak terdaftar di cabang Anda. Muat ulang halaman Kasir");
    const unit = p.unit || "pcs";
    const qty = roundQty(i.qty);
    if (!validQty(qty, stepOf(unit))) throw new HttpError(400, stepMsg(p.name, unit));
    const stock = num(p.stock);
    let price = num(p.price);
    if (offline) {
      // Harga yang tercetak di struk dipakai, dan diberi tanda bila berbeda dari harga sekarang
      const cp = Number(i.price);
      if (isFinite(cp) && cp >= 0 && cp <= 1e9) { if (Math.round(cp) !== price) review.push(`Harga ${p.name} berbeda (struk Rp ${Math.round(cp).toLocaleString("id-ID")}, sekarang Rp ${price.toLocaleString("id-ID")})`); price = Math.round(cp); }
      if (stock + 1e-9 < qty) review.push(`Stok ${p.name} kurang saat dikirim (sisa ${stock}, terjual ${qty})`);
    } else if (stock + 1e-9 < qty) throw new HttpError(400, `Stok ${p.name} tidak cukup (sisa ${p.stock} ${unit})`);
    return { p, qty, unit, price, subtotal: lineTotal(price, qty), note: biz === "fnb" ? clip(i.note, 80) : "" };
  });
  const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);

  // ---- PPN: online memakai aturan server; offline memakai aturan yang tercetak (dan ditandai bila sudah berubah)
  const serverTax = parseTax(store);
  let taxCfg: TaxConfig = serverTax;
  if (offline && b.tax && typeof b.tax === "object") {
    const rate = normRate(b.tax.rate);
    if (!isNaN(rate)) {
      taxCfg = { enabled: b.tax.enabled === true, rate, mode: b.tax.mode === "inclusive" ? "inclusive" : "exclusive" };
      if (taxCfg.enabled !== serverTax.enabled || (taxCfg.enabled && (taxCfg.rate !== serverTax.rate || taxCfg.mode !== serverTax.mode))) review.push("Pengaturan PPN saat transaksi berbeda dari pengaturan sekarang");
    }
  }

  // ---- Diskon
  const dIn: InDiscount | undefined = b.discount && typeof b.discount === "object" ? b.discount : undefined;
  let discount: DiscountInput | null = null, discountName = "", discountNote = "";
  if (dIn) {
    const mine = presets.filter((r) => r.storeId === s.storeId);
    const asPreset = (r: Record<string, string>): DiscountPreset => ({ id: r.id, name: r.name, type: r.type === "nominal" ? "nominal" : "percent", value: num(r.value), minSubtotal: num(r.minSubtotal), validFrom: r.validFrom, validTo: r.validTo, active: r.active !== "FALSE" });
    const today = dayKey(now());
    if (dIn.presetId && !dIn.manual) {
      const row = mine.find((r) => r.id === dIn.presetId);
      const pr = row ? asPreset(row) : null;
      if (pr && discountUsable(pr, subtotal, today)) { discount = { type: pr.type, value: pr.value }; discountName = pr.name; }
      else if (!offline) throw new HttpError(400, "Diskon tidak berlaku untuk transaksi ini. Muat ulang halaman Kasir");
      else {
        // Struk sudah tercetak dengan diskon ini; dicatat sesuai struk dan ditandai
        const type = dIn.type === "nominal" ? "nominal" : "percent", value = Number(dIn.value);
        if (!(value > 0) || (type === "percent" && value > 100)) throw new HttpError(400, "Diskon tidak valid");
        discount = { type, value }; discountName = clip(dIn.name, 40) || "Diskon";
        review.push(`Diskon "${discountName}" tidak lagi berlaku atau sudah berubah`);
      }
    } else if (dIn.manual) {
      const type = dIn.type === "nominal" ? "nominal" : "percent", value = Number(dIn.value);
      if (!(value > 0) || (type === "percent" && value > 100) || (type === "nominal" && !Number.isInteger(value))) throw new HttpError(400, "Diskon manual tidak valid");
      discountNote = clip(dIn.note, 60);
      const amount = calcDiscount(subtotal, { type, value });
      const cap = num(store?.discountManualMax);
      const problems: string[] = [];
      if (discountNote.length < 3) problems.push("Alasan diskon manual wajib diisi (minimal 3 huruf)");
      if (s.role === "kasir" && !(cap > 0)) problems.push("Diskon manual tidak diizinkan untuk kasir");
      else if (s.role === "kasir" && amount > Math.round((subtotal * cap) / 100)) problems.push(`Diskon manual melebihi batas ${cap}% dari subtotal`);
      if (problems.length) { if (!offline) throw new HttpError(400, problems[0]); review.push(...problems); }
      discount = { type, value }; discountName = "Manual";
    } else throw new HttpError(400, "Diskon tidak valid");
  }
  const t = calcTotals(subtotal, discount, taxCfg);
  const total = t.total;
  if (offline && Number.isFinite(Number(b.clientTotal)) && Math.round(Number(b.clientTotal)) !== total) review.push(`Total struk Rp ${Math.round(Number(b.clientTotal)).toLocaleString("id-ID")}, dihitung ulang Rp ${total.toLocaleString("id-ID")}`);

  // ---- Metode pembayaran: hanya yang diaktifkan kepala toko. Cash dan transfer bank selalu ada
  const methods = await methodsOf(s.storeId, false, biz);
  let method = methods.find((m) => m.key === (b.paymentKey || "cash"));
  if (!method && offline && /^[a-z0-9_]{1,40}$/.test(String(b.paymentKey ?? ""))) {
    method = { id: "", key: String(b.paymentKey), label: clip(b.paymentLabel, 30) || String(b.paymentKey), group: "lain", active: true, locked: false };
    review.push(`Metode pembayaran "${method.label}" tidak aktif lagi`);
  }
  if (!method) throw new HttpError(400, "Metode pembayaran tidak tersedia. Muat ulang halaman Kasir");
  let paid = Number(b.paid), change = 0;
  if (isCash(method.key)) {
    if (!(paid >= total)) {
      if (!offline) throw new HttpError(400, "Uang bayar kurang dari total");
      review.push(`Uang bayar kurang dari total (bayar Rp ${(isFinite(paid) ? paid : 0).toLocaleString("id-ID")}, total Rp ${total.toLocaleString("id-ID")})`);
      paid = isFinite(paid) ? paid : 0;
    } else change = paid - total;
  } else paid = total; // non-tunai dibayar pas

  // ---- Data pesanan khusus F&B
  let orderType = "", tableNo = "", customerName = "";
  if (biz === "fnb") {
    orderType = b.orderType || "dine_in";
    if (!ORDER_TYPES.some((o) => o.key === orderType)) throw new HttpError(400, "Jenis pesanan tidak valid");
    if (isFoodDelivery(method.key)) orderType = "take_away"; // ShopeeFood/GoFood/GrabFood selalu dibungkus
    tableNo = orderType === "dine_in" ? clip(b.tableNo, 10) : "";
    customerName = clip(b.customerName, 40);
  }

  // ---- Nomor: urut per cabang per hari (WIB). Struk offline memakai nomor OFF-... yang sudah tercetak
  const today = dayKey(new Date().toISOString());
  const todays = allTx.filter((t) => t.branchId === branchId && dayKey(t.createdAt) === today);
  const used = new Set(allTx.map((t) => t.invoice));
  const code = branchId.slice(0, 3).toUpperCase();
  let invoice = offline && OFFLINE_NO.test(String(b.offlineNo ?? "")) && !used.has(String(b.offlineNo)) ? String(b.offlineNo) : "";
  if (!invoice) { let seq = todays.length + 1; do { invoice = `INV-${today.replace(/-/g, "")}-${code}-${String(seq).padStart(4, "0")}`; seq++; } while (used.has(invoice)); }
  let orderNo = biz === "fnb" ? String(Math.max(0, ...todays.map((t) => Number(t.orderNo) || 0)) + 1).padStart(2, "0") : "";
  if (biz === "fnb" && offline) { const o = String(b.orderNo ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 6); if (o) orderNo = o; }

  // ---- Waktu: transaksi offline dicatat pada waktu kejadian, selama masuk akal (setelah kasir dibuka, tidak di masa depan)
  let createdAt = now();
  if (offline && b.offlineAt) {
    const at = Date.parse(String(b.offlineAt));
    if (isFinite(at) && at >= Date.parse(shift.openedAt) && at <= Date.now() + 120_000) createdAt = new Date(at).toISOString();
    else review.push("Waktu transaksi offline tidak wajar, memakai waktu kirim");
  }

  const id = uid();
  const tx = {
    id, invoice, storeId: s.storeId, branchId, cashierId: s.uid, cashierName: s.name,
    total: String(total), paid: String(paid), change: String(change), createdAt,
    paymentKey: method.key, paymentLabel: method.label, paymentRef: clip(b.paymentRef, 40),
    orderType, tableNo, customerName, orderNo,
    subtotal: String(subtotal), taxAmount: String(t.tax),
    taxRate: taxCfg.enabled ? String(taxCfg.rate) : "0", taxMode: taxCfg.enabled ? taxCfg.mode : "",
    discountName, discountType: discount?.type ?? "", discountValue: discount ? String(discount.value) : "",
    discountAmount: String(t.discount), discountNote,
    clientId, offline: offline ? "TRUE" : "", review: review.join(" | ").slice(0, 500), syncedAt: offline ? now() : "",
  };
  await add("transactions", tx);
  await addMany("transaction_items", lines.map((l) => ({
    id: uid(), transactionId: id, productId: l.p.id, name: l.p.name,
    price: String(l.price), qty: String(l.qty), subtotal: String(l.subtotal), unit: l.unit, note: l.note,
  })));
  // Stok tidak pernah turun di bawah 0. Kekurangan pada transaksi offline sudah ditandai di atas
  await updateMany("products", lines.map((l) => ({ id: l.p.id, patch: { stock: String(Math.max(0, roundQty(num(l.p.stock) - l.qty))) } })));
  return buildReceipt(tx);
}

// Dua permintaan dengan clientId sama yang tiba bersamaan digabung, supaya tidak tercatat ganda
const g = globalThis as unknown as { __txFlights?: Map<string, Promise<unknown>> };
export const POST = handle(async (req) => {
  const s = await need(["kasir", "kepala_toko", "kepala_cabang"]);
  const b = await req.json();
  const cid = typeof b.clientId === "string" ? b.clientId : "";
  if (!cid || !CLIENT_ID.test(cid)) return create(s, b);
  const flights = (g.__txFlights ??= new Map());
  const key = `${s.storeId}:${cid}`;
  const running = flights.get(key);
  if (running) return running;
  const p = create(s, b).finally(() => flights.delete(key));
  flights.set(key, p);
  return p;
});