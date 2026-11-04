import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { isBusinessType, normBusiness } from "@/lib/business";

export const GET = handle(async () => {
  const s = await need();
  const st = (await all("stores")).find((x) => x.id === s.storeId);
  if (!st) throw new HttpError(404, "Toko tidak ditemukan");
  return { name: st.name, businessType: normBusiness(st.businessType) };
});

// Jenis usaha bisa diganti kepala toko (misalnya toko lama yang belum memilih)
export const PATCH = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  if (!isBusinessType(b.businessType)) throw new HttpError(400, "Jenis usaha tidak valid");
  await update("stores", s.storeId, { businessType: b.businessType });
  return { ok: true };
});
