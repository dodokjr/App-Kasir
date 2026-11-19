import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { isBusinessType, normBusiness, normRate, parseTax } from "@/lib/business";

// Batas diskon manual untuk kasir, dalam persen dari subtotal. 0 = kasir tidak boleh memberi diskon manual
const manualMax = (v: unknown) => { const n = Number(v); return isFinite(n) && n > 0 ? Math.min(100, n) : 0; };

// Semua peran boleh membaca (kasir butuh tarif PPN dan aturan diskon untuk menghitung total)
export const GET = handle(async () => {
  const s = await need();
  const st = (await all("stores")).find((x) => x.id === s.storeId);
  if (!st) throw new HttpError(404, "Toko tidak ditemukan");
  return { name: st.name, businessType: normBusiness(st.businessType), tax: parseTax(st), discountManualMax: manualMax(st.discountManualMax) };
});

// Hanya kepala toko yang menentukan jenis usaha, aturan PPN, dan batas diskon manual
export const PATCH = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const patch: Record<string, string> = {};
  if (b.businessType !== undefined) {
    if (!isBusinessType(b.businessType)) throw new HttpError(400, "Jenis usaha tidak valid");
    patch.businessType = b.businessType;
  }
  if (b.tax !== undefined) {
    const rate = normRate(b.tax.rate);
    if (isNaN(rate)) throw new HttpError(400, "Tarif PPN harus antara 0 dan 100");
    if (b.tax.enabled && !(rate > 0)) throw new HttpError(400, "Tarif PPN harus lebih dari 0 saat PPN diaktifkan");
    patch.ppnEnabled = b.tax.enabled ? "TRUE" : "FALSE";
    patch.ppnRate = String(rate);
    patch.ppnMode = b.tax.mode === "inclusive" ? "inclusive" : "exclusive";
  }
  if (b.discountManualMax !== undefined) {
    const n = Number(b.discountManualMax);
    if (!isFinite(n) || n < 0 || n > 100) throw new HttpError(400, "Batas diskon manual harus antara 0 dan 100 persen");
    patch.discountManualMax = String(manualMax(n));
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Tidak ada perubahan");
  await update("stores", s.storeId, patch);
  return { ok: true };
});