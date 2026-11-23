import bcrypt from "bcryptjs";
import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { PIN_RE, weakPin, assertNotLocked, failAttempt, clearFails } from "@/lib/authflow";

const me = async () => {
  const s = await need();
  const u = (await all("users", { fresh: true })).find((x) => x.id === s.uid);
  if (!u) throw new HttpError(401, "Silakan login dulu");
  return u;
};

// Apakah akun ini sudah punya PIN (menentukan isi kolom "PIN saat ini" di Pengaturan)
export const GET = handle(async () => ({ hasPin: !!(await me()).pinHash }));

// Ganti PIN sendiri. Wajib membuktikan PIN lama (atau password bila belum pernah punya PIN). Salah dihitung sama seperti salah login
export const POST = handle(async (req) => {
  const u = await me();
  const b = await req.json();
  const pin = String(b.pin || "");
  if (!PIN_RE.test(pin)) throw new HttpError(400, "PIN baru harus 6 digit angka");
  if (pin !== String(b.confirm || "")) throw new HttpError(400, "Konfirmasi PIN tidak sama");
  if (weakPin(pin)) throw new HttpError(400, "PIN terlalu mudah ditebak. Hindari 123456 atau angka berulang");

  await assertNotLocked(u.email);
  const cur = String(b.current || "");
  const ok = u.pinHash ? PIN_RE.test(cur) && (await bcrypt.compare(cur, u.pinHash)) : await bcrypt.compare(cur, u.passwordHash);
  if (!ok) await failAttempt(u.email, u.pinHash ? "PIN lama salah" : "Password salah", req, { name: u.name, email: u.email });
  if (u.pinHash && (await bcrypt.compare(pin, u.pinHash))) throw new HttpError(400, "PIN baru harus berbeda dari PIN lama");

  await update("users", u.id, { pinHash: await bcrypt.hash(pin, 10) });
  await clearFails(u.email);
  return { ok: true };
});
