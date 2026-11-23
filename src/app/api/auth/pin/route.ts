import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { createSession, type Role } from "@/lib/auth";
import { readStage, PIN_RE, weakPin, clearFails } from "@/lib/authflow";

// Membuat PIN pertama. Hanya bisa dengan token tahap "setpin" (setelah OTP atau setelah password+verifikasi), dan hanya jika PIN belum ada
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "setpin");
  const pin = String(b.pin || "");
  if (!PIN_RE.test(pin)) throw new HttpError(400, "PIN harus 6 digit angka");
  if (pin !== String(b.confirm || "")) throw new HttpError(400, "Konfirmasi PIN tidak sama");
  if (weakPin(pin)) throw new HttpError(400, "PIN terlalu mudah ditebak. Hindari 123456 atau angka berulang");

  const u = (await all("users", { fresh: true })).find((x) => x.id === st.uid);
  if (!u) throw new HttpError(404, "Akun tidak ditemukan");
  if (u.pinHash) throw new HttpError(409, "PIN sudah dibuat. Silakan masuk");
  if (u.active === "FALSE") throw new HttpError(403, "Akun dinonaktifkan");

  await update("users", u.id, { pinHash: await bcrypt.hash(pin, 10) });
  await clearFails(u.email);
  await createSession({ uid: u.id, name: u.name, role: u.role as Role, storeId: u.storeId, branchId: u.branchId });
  return { ok: true };
});
