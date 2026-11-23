import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";
import { dayKey } from "@/lib/shift";
import { branchFor } from "@/lib/rentalServer";
import { isKind, isUnitType, normProfitRate, occupies, readProfitRate, type RentalItem } from "@/lib/rental";

const USERS = ["kasir", "kepala_cabang", "kepala_toko"] as const;
const MANAGERS = ["kepala_cabang", "kepala_toko"] as const;

const toItem = (r: Record<string, string>): RentalItem => ({
  id: r.id, branchId: r.branchId, name: r.name, kind: isKind(r.kind) ? r.kind : "sewa",
  pricePerDay: Number(r.pricePerDay) || 0, note: r.note, active: r.active !== "FALSE", profitRate: readProfitRate(r.profitRate), category: isUnitType(r.category) ? r.category : "lainnya",
});

function price(v: unknown) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 1_000_000_000) throw new HttpError(400, "Harga per hari harus bilangan bulat rupiah (0 atau lebih)");
  return n;
}

export const GET = handle(async (req) => {
  const s = await need([...USERS]);
  const q = new URL(req.url).searchParams;
  const branchId = s.role === "kepala_toko" ? q.get("branchId") : s.branchId;
  const wantAll = q.get("all") === "1" && (MANAGERS as readonly string[]).includes(s.role);
  return (await all("rental_items"))
    .filter((r) => r.storeId === s.storeId && (!branchId || r.branchId === branchId))
    .map(toItem)
    .filter((i) => wantAll || i.active)
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const POST = handle(async (req) => {
  const s = await need([...MANAGERS]);
  const b = await req.json();
  const name = String(b.name ?? "").trim().slice(0, 50);
  if (!name) throw new HttpError(400, "Nama unit wajib diisi");
  const kind = isKind(b.kind) ? b.kind : "sewa";
  const pricePerDay = price(b.pricePerDay);
  const profitRate = normProfitRate(b.profitRate);
  if (isNaN(profitRate)) throw new HttpError(400, "Persen keuntungan harus antara 0 dan 100");
  const branchId = await branchFor(s, b.branchId);
  const dup = (await all("rental_items", { fresh: true })).some((r) => r.branchId === branchId && r.active !== "FALSE" && r.name.toLowerCase() === name.toLowerCase());
  if (dup) throw new HttpError(409, "Sudah ada unit aktif dengan nama yang sama di cabang ini");
  const id = uid();
  await add("rental_items", { id, storeId: s.storeId, branchId, name, kind, pricePerDay: String(pricePerDay), note: String(b.note ?? "").trim().slice(0, 120), active: "TRUE", createdAt: now(), profitRate: String(profitRate), category: isUnitType(b.category) ? b.category : "lainnya" });
  return { ok: true, id };
});

// Unit tidak dihapus, hanya dinonaktifkan, supaya riwayat booking tetap terbaca
export const PATCH = handle(async (req) => {
  const s = await need([...MANAGERS]);
  const b = await req.json();
  const it = (await all("rental_items", { fresh: true })).find((r) => r.id === b.id && r.storeId === s.storeId && (s.role === "kepala_toko" || r.branchId === s.branchId));
  if (!it) throw new HttpError(404, "Unit tidak ditemukan");
  const patch: Record<string, string> = {};
  if (b.name !== undefined) {
    const n = String(b.name).trim().slice(0, 50);
    if (!n) throw new HttpError(400, "Nama unit wajib diisi");
    patch.name = n;
  }
  if (b.kind !== undefined) {
    if (!isKind(b.kind)) throw new HttpError(400, "Jenis tidak valid");
    patch.kind = b.kind;
  }
  if (b.pricePerDay !== undefined) patch.pricePerDay = String(price(b.pricePerDay));
  if (b.category !== undefined) {
    if (!isUnitType(b.category)) throw new HttpError(400, "Tipe unit tidak valid");
    patch.category = b.category;
  }
  if (b.profitRate !== undefined) {
    const r = normProfitRate(b.profitRate);
    if (isNaN(r)) throw new HttpError(400, "Persen keuntungan harus antara 0 dan 100");
    patch.profitRate = String(r);
  }
  if (b.note !== undefined) patch.note = String(b.note).trim().slice(0, 120);
  if (b.active !== undefined) {
    if (!b.active) {
      const today = dayKey(now());
      const busy = (await all("bookings", { fresh: true })).some((r) => r.itemId === it.id && occupies(r.status) && r.endDate >= today);
      if (busy) throw new HttpError(409, "Unit masih punya booking atau sewa yang dipesan/berjalan. Selesaikan atau batalkan dulu");
    }
    patch.active = b.active ? "TRUE" : "FALSE";
  }
  if (!Object.keys(patch).length) throw new HttpError(400, "Tidak ada perubahan");
  await update("rental_items", it.id, patch);
  return { ok: true };
});
