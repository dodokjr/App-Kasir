import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";

export const GET = handle(async () => {
  const s = await need(["developer", "admin", "kepala_toko", "kepala_cabang"]);
  const rows = await all("branches");
  if (s.role === "kepala_toko") return rows.filter((r) => r.storeId === s.storeId);
  if (s.role === "kepala_cabang") return rows.filter((r) => r.id === s.branchId);
  return rows;
});

// Satu toko bisa punya banyak cabang: nama cabang + nama jalan
export const POST = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const name = String(b.name || "").trim(), street = String(b.street || "").trim();
  if (!name || !street) throw new HttpError(400, "Nama cabang dan nama jalan wajib diisi");
  await add("branches", { id: uid(), storeId: s.storeId, name, street, createdAt: now(), lat: "", lng: "" });
  return { ok: true };
});

// Atur lokasi cabang di peta. Kepala toko untuk semua cabang, kepala cabang untuk cabangnya sendiri.
// Kirim { id, clear: true } untuk menghapus lokasi.
export const PATCH = handle(async (req) => {
  const s = await need(["kepala_toko", "kepala_cabang"]);
  const b = await req.json();
  const br = (await all("branches")).find((x) => x.id === b.id && x.storeId === s.storeId);
  if (!br || (s.role === "kepala_cabang" && br.id !== s.branchId)) throw new HttpError(404, "Cabang tidak ditemukan");
  if (b.clear) { await update("branches", br.id, { lat: "", lng: "" }); return { ok: true }; }
  const lat = Number(b.lat), lng = Number(b.lng);
  if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new HttpError(400, "Koordinat tidak valid");
  // 6 desimal = ketelitian sekitar 10 cm, cukup untuk letak toko
  await update("branches", br.id, { lat: lat.toFixed(6), lng: lng.toFixed(6) });
  return { ok: true };
});