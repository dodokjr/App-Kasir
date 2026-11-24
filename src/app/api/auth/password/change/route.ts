import bcrypt from "bcryptjs";
import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { assertNotLocked, failAttempt, clearFails } from "@/lib/authflow";

// Ganti password sendiri (Pengaturan). Wajib membuktikan password lama. Salah dihitung sama seperti salah login
export const POST = handle(async (req) => {
  const s = await need();
  const u = (await all("users", { fresh: true })).find((x) => x.id === s.uid);
  if (!u) throw new HttpError(401, "Silakan login dulu");
  const b = await req.json();
  const cur = String(b.current || ""), pw = String(b.password || "");
  if (pw.length < 8) throw new HttpError(400, "Password baru minimal 8 karakter");
  if (pw !== String(b.confirm || "")) throw new HttpError(400, "Konfirmasi password tidak sama");

  await assertNotLocked(u.email);
  if (!(await bcrypt.compare(cur, u.passwordHash))) await failAttempt(u.email, "Password saat ini salah", req, { name: u.name, email: u.email });
  if (await bcrypt.compare(pw, u.passwordHash)) throw new HttpError(400, "Password baru harus berbeda dari password lama");

  await update("users", u.id, { passwordHash: await bcrypt.hash(pw, 10) });
  await clearFails(u.email);
  return { ok: true };
});
