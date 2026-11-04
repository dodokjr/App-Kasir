import { handle, need, HttpError } from "@/lib/api";
import { all, add, uid, now } from "@/lib/sheets";

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
  await add("branches", { id: uid(), storeId: s.storeId, name, street, createdAt: now() });
  return { ok: true };
});
