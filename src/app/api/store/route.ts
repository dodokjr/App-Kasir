import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { isBusinessType, normBusiness, normRate, parseTax } from "@/lib/business";

// Semua peran boleh membaca (kasir butuh tarif PPN untuk menghitung total)
export const GET = handle(async () => {
  const s = await need();
  const st = (await all("stores")).find((x) => x.id === s.storeId);
  if (!st) throw new HttpError(404, "Toko tidak ditemukan");
  return { name: st.name, businessType: normBusiness(st.businessType), tax: parseTax(st) };
});

// Hanya kepala toko yang menentukan jenis usaha dan aturan PPN toko
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
  if (!Object.keys(patch).length) throw new HttpError(400, "Tidak ada perubahan");
  await update("stores", s.storeId, patch);
  return { ok: true };
});