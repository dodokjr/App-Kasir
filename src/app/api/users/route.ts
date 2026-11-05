import bcrypt from "bcryptjs";
import { handle, need, HttpError } from "@/lib/api";
import { all, add, uid, now } from "@/lib/sheets";
import type { Role } from "@/lib/auth";

const CAN_CREATE: Partial<Record<Role, Role[]>> = {
  developer: ["admin"],
  kepala_toko: ["kepala_cabang", "kasir", "gudang"],
  kepala_cabang: ["kasir", "gudang"],
};

export const GET = handle(async () => {
  const s = await need(["developer", "admin", "kepala_toko", "kepala_cabang"]);
  let rows = await all("users");
  if (s.role === "kepala_toko") rows = rows.filter((u) => u.storeId === s.storeId);
  if (s.role === "kepala_cabang") rows = rows.filter((u) => u.branchId === s.branchId);
  return rows.map(({ passwordHash, ...r }) => r);
});

export const POST = handle(async (req) => {
  const s = await need(["developer", "kepala_toko", "kepala_cabang"]);
  const b = await req.json();
  const role = b.role as Role;
  if (!CAN_CREATE[s.role]?.includes(role)) throw new HttpError(403, "Peran ini tidak boleh Anda tambahkan");
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  if (!name || !email) throw new HttpError(400, "Nama dan email wajib diisi");
  if (String(b.password || "").length < 6) throw new HttpError(400, "Password minimal 6 karakter");
  if ((await all("users", { fresh: true })).some((u) => u.email === email)) throw new HttpError(409, "Email sudah terdaftar");

  let storeId = s.storeId, branchId = s.branchId;
  if (s.role === "developer") { storeId = ""; branchId = ""; }
  if (s.role === "kepala_toko") {
    const br = (await all("branches")).find((x) => x.id === b.branchId && x.storeId === s.storeId);
    if (!br) throw new HttpError(400, "Pilih cabang yang valid");
    branchId = br.id;
  }
  await add("users", {
    id: uid(), storeId, branchId, name, email, passwordHash: await bcrypt.hash(String(b.password), 10),
    role, active: "TRUE", createdAt: now(),
  });
  return { ok: true };
});