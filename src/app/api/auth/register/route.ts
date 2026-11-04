import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all, add, uid, now } from "@/lib/sheets";
import { createSession } from "@/lib/auth";
import { isBusinessType } from "@/lib/business";
import { seedMethods } from "@/lib/payments";

export const POST = handle(async (req) => {
  const b = await req.json();
  const storeName = String(b.storeName || "").trim();
  const branchName = String(b.branchName || "").trim() || "Pusat";
  const street = String(b.street || "").trim();
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!isBusinessType(b.businessType)) throw new HttpError(400, "Pilih jenis usaha toko Anda");
  if (!storeName || !street || !name || !email) throw new HttpError(400, "Lengkapi semua data");
  if (password.length < 6) throw new HttpError(400, "Password minimal 6 karakter");
  if ((await all("users")).some((u) => u.email === email)) throw new HttpError(409, "Email sudah terdaftar");

  const storeId = uid(), branchId = uid(), userId = uid();
  await add("stores", { id: storeId, name: storeName, active: "TRUE", createdAt: now(), businessType: b.businessType });
  await add("branches", { id: branchId, storeId, name: branchName, street, createdAt: now() });
  await add("users", {
    id: userId, storeId, branchId, name, email, passwordHash: await bcrypt.hash(password, 10),
    role: "kepala_toko", active: "TRUE", createdAt: now(),
  });
  await seedMethods(storeId);
  await createSession({ uid: userId, name, role: "kepala_toko", storeId, branchId });
  return { ok: true };
});
