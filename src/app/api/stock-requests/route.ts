import { handle, need, inScope, HttpError } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { all, add, addMany, update, updateMany, uid, now } from "@/lib/sheets";
import { UNITS, roundQty, stepOf, validQty } from "@/lib/business";
import { dayKey, branchNames } from "@/lib/shift";

/**
 * Permintaan barang: gudang / kepala cabang meminta barang ke kepala toko (gudang pusat).
 * diajukan -> dikirim (stok cabang asal berkurang, ada nomor resi) -> diterima (stok cabang peminta bertambah)
 * Cabang lain jalur: ditolak (oleh kepala toko) atau dibatalkan (oleh peminta, sebelum diproses).
 */
const REQUESTERS: Role[] = ["gudang", "kepala_cabang"];
const VIEWERS: Role[] = ["gudang", "kepala_cabang", "kepala_toko"];
const clip = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
const num = (v: unknown) => Number(v) || 0;
const EPS = 1e-9;
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
const stepMsg = (name: string, unit: string) => (stepOf(unit) < 1 ? `Jumlah ${name} harus kelipatan 0,1 ${unit} (minimal 0,1)` : `Jumlah ${name} harus bilangan bulat`);

export const GET = handle(async () => {
  const s = await need(VIEWERS);
  const [reqs, items, notes, names] = await Promise.all([
    all("stock_requests"), all("stock_request_items"), all("stock_request_notes"), branchNames(),
  ]);
  return reqs
    .filter((r) => inScope(s, r))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 100)
    .map((r) => ({
      ...r,
      branchName: names[r.branchId] ?? "-",
      fromBranchName: r.fromBranchId ? names[r.fromBranchId] ?? "-" : "",
      items: items.filter((i) => i.requestId === r.id),
      notes: notes.filter((n) => n.requestId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }));
});

type InItem = { productId?: string; name?: string; unit?: string; qty?: number };

export const POST = handle(async (req) => {
  const s = await need(REQUESTERS);
  const b = await req.json();
  if (!Array.isArray(b.items) || !b.items.length) throw new HttpError(400, "Isi minimal satu barang");
  if (b.items.length > 30) throw new HttpError(400, "Maksimal 30 barang dalam satu permintaan");

  const prods = (await all("products")).filter((p) => p.branchId === s.branchId);
  const merged = new Map<string, { productId: string; name: string; sku: string; unit: string; qty: number }>();
  for (const i of b.items as InItem[]) {
    let productId = "", name = "", sku = "", unit = "pcs";
    if (i.productId) {
      const p = prods.find((x) => x.id === i.productId);
      if (!p) throw new HttpError(400, "Ada barang yang tidak terdaftar di cabang Anda. Muat ulang halaman");
      productId = p.id; name = p.name; sku = p.sku; unit = p.unit || "pcs";
    } else {
      name = clip(i.name, 80);
      if (!name) throw new HttpError(400, "Nama barang wajib diisi");
      unit = UNITS.some((u) => u.key === i.unit) ? String(i.unit) : "pcs";
    }
    const qty = roundQty(Number(i.qty));
    if (!validQty(qty, stepOf(unit))) throw new HttpError(400, stepMsg(name, unit));
    if (qty > 100000) throw new HttpError(400, `Jumlah ${name} terlalu besar`);
    const key = productId || `n:${name.toLowerCase()}`;
    const cur = merged.get(key);
    if (cur) cur.qty = roundQty(cur.qty + qty); else merged.set(key, { productId, name, sku, unit, qty });
  }

  // Nomor permintaan berurutan per toko per hari
  const existing = await all("stock_requests", { fresh: true });
  const today = dayKey(new Date().toISOString());
  const used = new Set(existing.map((r) => r.requestNo));
  let seq = existing.filter((r) => r.storeId === s.storeId && dayKey(r.createdAt) === today).length + 1, requestNo = "";
  do { requestNo = `REQ-${today.replace(/-/g, "")}-${String(seq).padStart(3, "0")}`; seq++; } while (used.has(requestNo));

  const id = uid(), t = now();
  await add("stock_requests", {
    id, storeId: s.storeId, branchId: s.branchId, requestNo, status: "diajukan", requestedById: s.uid, requestedByName: s.name,
    note: clip(b.note, 300), createdAt: t, updatedAt: t, fromBranchId: "", trackingNo: "", handledByName: "", handledNote: "",
    shippedAt: "", receivedAt: "", receivedByName: "", receiveNote: "", closedAt: "",
  });
  await addMany("stock_request_items", [...merged.values()].map((m) => ({
    id: uid(), requestId: id, productId: m.productId, name: m.name, sku: m.sku, unit: m.unit, qty: String(m.qty),
    fromProductId: "", sentQty: "", receivedQty: "",
  })));
  return { ok: true, id, requestNo };
});

export const PATCH = handle(async (req) => {
  const s = await need(VIEWERS);
  const b = await req.json();
  const r = (await all("stock_requests", { fresh: true })).find((x) => x.id === b.id && inScope(s, x));
  if (!r) throw new HttpError(404, "Permintaan tidak ditemukan");
  const t = now();

  // ---- Catatan: kedua pihak boleh berbalas kapan saja
  if (b.action === "catat") {
    const text = clip(b.text, 500);
    if (!text) throw new HttpError(400, "Tulis pesan terlebih dulu");
    await add("stock_request_notes", { id: uid(), requestId: r.id, storeId: r.storeId, authorId: s.uid, authorName: s.name, authorRole: s.role, text, createdAt: t });
    return { ok: true };
  }

  const items = (await all("stock_request_items", { fresh: true })).filter((i) => i.requestId === r.id);

  // ---- Batal oleh peminta, hanya sebelum diproses
  if (b.action === "batal") {
    if (!REQUESTERS.includes(s.role)) throw new HttpError(403, "Hanya peminta yang bisa membatalkan");
    if (r.status !== "diajukan") throw new HttpError(400, "Permintaan yang sudah diproses tidak bisa dibatalkan");
    await update("stock_requests", r.id, { status: "dibatalkan", updatedAt: t, closedAt: t });
    return { ok: true };
  }

  // ---- Tolak oleh kepala toko
  if (b.action === "tolak") {
    if (s.role !== "kepala_toko") throw new HttpError(403, "Hanya kepala toko yang bisa menolak");
    if (r.status !== "diajukan") throw new HttpError(400, "Permintaan ini sudah diproses");
    const why = clip(b.note, 300);
    if (!why) throw new HttpError(400, "Tulis alasan penolakan");
    await update("stock_requests", r.id, { status: "ditolak", handledByName: s.name, handledNote: why, updatedAt: t, closedAt: t });
    return { ok: true };
  }

  // ---- Kirim oleh kepala toko: jumlah boleh lebih sedikit dari permintaan, sesuai stok cabang asal
  if (b.action === "kirim") {
    if (s.role !== "kepala_toko") throw new HttpError(403, "Hanya kepala toko yang bisa mengirim barang");
    if (r.status !== "diajukan") throw new HttpError(400, "Permintaan ini sudah diproses");
    const fromBranchId = String(b.fromBranchId ?? "");
    const okBranch = (await all("branches")).some((x) => x.id === fromBranchId && x.storeId === s.storeId);
    if (!okBranch) throw new HttpError(400, "Pilih cabang asal barang");
    if (fromBranchId === r.branchId) throw new HttpError(400, "Cabang asal tidak boleh sama dengan cabang peminta");
    const trackingNo = clip(b.trackingNo, 40);
    if (!trackingNo) throw new HttpError(400, "Nomor resi atau nomor pengiriman wajib diisi");

    const prods = await all("products", { fresh: true });
    const inputs: { itemId: string; fromProductId?: string; sentQty?: number }[] = Array.isArray(b.items) ? b.items : [];
    const taken = new Map<string, number>(); // total yang diambil per barang sumber
    const sentBy = new Map<string, { fromProductId: string; sent: number }>();
    for (const it of items) {
      const inp = inputs.find((x) => x.itemId === it.id);
      const sent = roundQty(Number(inp?.sentQty ?? 0));
      if (!(sent >= 0)) throw new HttpError(400, `Jumlah kirim ${it.name} tidak valid`);
      if (sent === 0) { sentBy.set(it.id, { fromProductId: "", sent: 0 }); continue; }
      const unit = it.unit || "pcs";
      if (!validQty(sent, stepOf(unit))) throw new HttpError(400, stepMsg(it.name, unit));
      if (sent > num(it.qty) + EPS) throw new HttpError(400, `Jumlah kirim ${it.name} melebihi yang diminta (${it.qty} ${unit})`);
      const sp = prods.find((p) => p.id === inp?.fromProductId && p.branchId === fromBranchId && p.storeId === s.storeId);
      if (!sp) throw new HttpError(400, `Pilih barang sumber di cabang asal untuk ${it.name}`);
      if ((sp.unit || "pcs") !== unit) throw new HttpError(400, `Satuan ${sp.name} (${sp.unit || "pcs"}) berbeda dengan permintaan (${unit})`);
      const total = roundQty((taken.get(sp.id) ?? 0) + sent);
      if (num(sp.stock) + EPS < total) throw new HttpError(400, `Stok ${sp.name} di cabang asal tidak cukup (sisa ${sp.stock} ${unit})`);
      taken.set(sp.id, total);
      sentBy.set(it.id, { fromProductId: sp.id, sent });
    }
    if (![...sentBy.values()].some((v) => v.sent > 0)) throw new HttpError(400, "Isi jumlah kirim minimal satu barang, atau pilih Tolak jika tidak bisa memenuhi");

    await updateMany("products", [...taken.entries()].map(([id, qty]) => ({ id, patch: { stock: String(roundQty(num(prods.find((p) => p.id === id)!.stock) - qty)) } })));
    await updateMany("stock_request_items", items.map((it) => {
      const v = sentBy.get(it.id)!;
      return { id: it.id, patch: { fromProductId: v.fromProductId, sentQty: String(v.sent) } };
    }));
    await update("stock_requests", r.id, {
      status: "dikirim", fromBranchId, trackingNo, handledByName: s.name, handledNote: clip(b.note, 300), shippedAt: t, updatedAt: t,
    });
    return { ok: true };
  }

  // ---- Terima oleh peminta: stok cabang bertambah sebesar jumlah yang benar-benar diterima
  if (b.action === "terima") {
    if (!REQUESTERS.includes(s.role)) throw new HttpError(403, "Hanya peminta yang bisa mengonfirmasi penerimaan");
    if (r.status !== "dikirim") throw new HttpError(400, "Barang belum dikirim atau sudah dikonfirmasi");
    const prods = await all("products", { fresh: true });
    const inputs: { itemId: string; receivedQty?: number }[] = Array.isArray(b.items) ? b.items : [];
    const add_: Map<string, number> = new Map();
    const create: Record<string, string>[] = [];
    const patches: { id: string; patch: Record<string, string> }[] = [];

    for (const it of items) {
      const sent = num(it.sentQty);
      if (!(sent > 0)) { patches.push({ id: it.id, patch: { receivedQty: "0" } }); continue; }
      const unit = it.unit || "pcs";
      const inp = inputs.find((x) => x.itemId === it.id);
      const rec = roundQty(Number(inp?.receivedQty ?? sent));
      if (!(rec >= 0) || rec > sent + EPS) throw new HttpError(400, `Jumlah diterima ${it.name} harus 0 sampai ${sent}`);
      if (rec > 0 && !validQty(rec, stepOf(unit))) throw new HttpError(400, stepMsg(it.name, unit));
      let productId = it.productId;
      if (rec > 0) {
        let target = productId ? prods.find((p) => p.id === productId && p.branchId === r.branchId) : undefined;
        if (!target && !productId) target = prods.find((p) => p.branchId === r.branchId && ((it.sku && p.sku && same(p.sku, it.sku)) || same(p.name, it.name)));
        if (target) { productId = target.id; add_.set(target.id, roundQty((add_.get(target.id) ?? 0) + rec)); }
        else if (productId) throw new HttpError(400, `Barang ${it.name} sudah tidak ada di daftar produk cabang Anda`);
        else {
          // Barang baru: dibuat di cabang peminta dengan harga dari barang sumber (bisa diubah di Gudang)
          const src = prods.find((p) => p.id === it.fromProductId);
          productId = uid();
          create.push({ id: productId, storeId: r.storeId, branchId: r.branchId, sku: src?.sku ?? it.sku, name: it.name, price: src?.price ?? "0", stock: String(rec), createdAt: t, unit, imageVer: "" });
        }
      }
      patches.push({ id: it.id, patch: { receivedQty: String(rec), productId: productId ?? "" } });
    }
    if (create.length) for (const row of create) await add("products", row);
    await updateMany("products", [...add_.entries()].map(([id, qty]) => ({ id, patch: { stock: String(roundQty(num(prods.find((p) => p.id === id)!.stock) + qty)) } })));
    await updateMany("stock_request_items", patches);
    await update("stock_requests", r.id, { status: "diterima", receivedAt: t, receivedByName: s.name, receiveNote: clip(b.note, 300), updatedAt: t, closedAt: t });
    return { ok: true };
  }

  throw new HttpError(400, "Aksi tidak dikenal");
});