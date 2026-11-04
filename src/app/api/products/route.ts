import { handle, need, inScope, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";
import { UNITS, roundQty } from "@/lib/business";

const WRITERS = ["gudang", "kepala_toko", "kepala_cabang"] as const;
const unitOk = (u: unknown) => UNITS.some((x) => x.key === u);

export const GET = handle(async (req) => {
  const s = await need();
  const branchId = new URL(req.url).searchParams.get("branchId");
  let rows = (await all("products")).filter((r) => inScope(s, r));
  if (branchId) rows = rows.filter((r) => r.branchId === branchId);
  return rows.map((r) => ({ ...r, unit: r.unit || "pcs" }));
});

export const POST = handle(async (req) => {
  const s = await need([...WRITERS]);
  const b = await req.json();
  const name = String(b.name || "").trim();
  const price = Math.round(Number(b.price)), stock = roundQty(Number(b.stock || 0));
  if (!name || !(price >= 0) || !(stock >= 0)) throw new HttpError(400, "Data produk tidak valid");
  const unit = b.unit === undefined || b.unit === "" ? "pcs" : b.unit;
  if (!unitOk(unit)) throw new HttpError(400, "Satuan tidak valid");
  let branchId = s.branchId;
  if (s.role === "kepala_toko" && b.branchId) {
    const ok = (await all("branches")).some((x) => x.id === b.branchId && x.storeId === s.storeId);
    if (!ok) throw new HttpError(400, "Cabang tidak valid");
    branchId = b.branchId;
  }
  await add("products", {
    id: uid(), storeId: s.storeId, branchId, sku: String(b.sku || "").trim(), name,
    price: String(price), stock: String(stock), createdAt: now(), unit,
  });
  return { ok: true };
});

export const PATCH = handle(async (req) => {
  const s = await need([...WRITERS]);
  const b = await req.json();
  const p = (await all("products")).find((r) => r.id === b.id);
  if (!p || !inScope(s, p)) throw new HttpError(404, "Produk tidak ditemukan");
  const patch: Record<string, string> = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim();
    if (!n) throw new HttpError(400, "Nama produk wajib diisi");
    patch.name = n;
  }
  if (b.price !== undefined) {
    const v = Math.round(Number(b.price));
    if (!isFinite(v)) throw new HttpError(400, "Harga tidak valid");
    patch.price = String(Math.max(0, v));
  }
  if (b.stock !== undefined) {
    const v = roundQty(Number(b.stock));
    if (!isFinite(v)) throw new HttpError(400, "Stok tidak valid");
    patch.stock = String(Math.max(0, v));
  }
  if (b.unit !== undefined) {
    if (!unitOk(b.unit)) throw new HttpError(400, "Satuan tidak valid");
    patch.unit = b.unit;
  }
  await update("products", p.id, patch);
  return { ok: true };
});
