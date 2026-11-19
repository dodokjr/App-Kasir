import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";
import { dayKey } from "@/lib/shift";
import type { DiscountPreset } from "@/lib/business";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const toPreset = (r: Record<string, string>): DiscountPreset => ({
  id: r.id, name: r.name, type: r.type === "nominal" ? "nominal" : "percent", value: Number(r.value) || 0,
  minSubtotal: Number(r.minSubtotal) || 0, validFrom: r.validFrom, validTo: r.validTo, active: r.active !== "FALSE",
});

function parse(b: Record<string, unknown>) {
  const name = String(b.name ?? "").trim().slice(0, 40);
  if (!name) throw new HttpError(400, "Nama diskon wajib diisi");
  const type = b.type === "nominal" ? "nominal" : "percent";
  const value = Number(b.value);
  if (!(value > 0)) throw new HttpError(400, "Nilai diskon harus lebih dari 0");
  if (type === "percent" && value > 100) throw new HttpError(400, "Diskon persen maksimal 100");
  if (type === "nominal" && !Number.isInteger(value)) throw new HttpError(400, "Diskon nominal harus bilangan bulat rupiah");
  const minSubtotal = Math.max(0, Math.round(Number(b.minSubtotal) || 0));
  const validFrom = String(b.validFrom ?? ""), validTo = String(b.validTo ?? "");
  if ((validFrom && !DATE.test(validFrom)) || (validTo && !DATE.test(validTo))) throw new HttpError(400, "Tanggal berlaku tidak valid");
  if (validFrom && validTo && validFrom > validTo) throw new HttpError(400, "Tanggal mulai tidak boleh setelah tanggal akhir");
  return { name, type, value: String(value), minSubtotal: String(minSubtotal), validFrom, validTo };
}

// Kasir dan peran lain mendapat diskon yang aktif dan belum kedaluwarsa. Kepala toko bisa meminta semuanya (?all=1)
export const GET = handle(async (req) => {
  const s = await need();
  const wantAll = new URL(req.url).searchParams.get("all") === "1" && s.role === "kepala_toko";
  const today = dayKey(new Date().toISOString());
  return (await all("discounts"))
    .filter((r) => r.storeId === s.storeId)
    .map(toPreset)
    .filter((d) => wantAll || (d.active && (!d.validTo || d.validTo >= today)))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const POST = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const f = parse(await req.json());
  const dup = (await all("discounts", { fresh: true })).some((r) => r.storeId === s.storeId && r.name.toLowerCase() === f.name.toLowerCase() && r.active !== "FALSE");
  if (dup) throw new HttpError(409, "Sudah ada diskon aktif dengan nama yang sama");
  await add("discounts", { id: uid(), storeId: s.storeId, ...f, active: "TRUE", createdAt: now() });
  return { ok: true };
});

// Diskon tidak dihapus, hanya dinonaktifkan, agar transaksi lama tetap terbaca
export const PATCH = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const d = (await all("discounts", { fresh: true })).find((r) => r.id === b.id && r.storeId === s.storeId);
  if (!d) throw new HttpError(404, "Diskon tidak ditemukan");
  const patch: Record<string, string> = {};
  if (b.active !== undefined) patch.active = b.active ? "TRUE" : "FALSE";
  if (b.name !== undefined || b.value !== undefined || b.type !== undefined || b.minSubtotal !== undefined) {
    Object.assign(patch, parse({ name: d.name, type: d.type, value: d.value, minSubtotal: d.minSubtotal, validFrom: d.validFrom, validTo: d.validTo, ...b }));
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Tidak ada perubahan");
  await update("discounts", d.id, patch);
  return { ok: true };
});