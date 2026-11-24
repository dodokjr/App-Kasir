import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { readStage, clearFails } from "@/lib/authflow";

// Lupa password, langkah 3: simpan password baru. Token ini hanya sah setelah OTP benar, dan hanya sekali pakai
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "newpw");
  const password = String(b.password || "");
  if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter");
  if (password !== String(b.confirm || "")) throw new HttpError(400, "Konfirmasi password tidak sama");

  const r = (await all("auth_state", { fresh: true })).find((x) => x.id === st.ref && x.kind === "reset" && x.key === st.email);
  if (!r || r.data !== "verified" || Number(r.expiresAt) < Date.now()) throw new HttpError(401, "Sesi verifikasi berakhir. Silakan mulai lagi");
  const u = (await all("users", { fresh: true })).find((x) => x.email === st.email);
  if (!u || u.active === "FALSE") throw new HttpError(401, "Sesi verifikasi berakhir. Silakan mulai lagi");

  await update("auth_state", r.id, { data: "", hash: "" }); // sekali pakai
  // Password berubah: semua perangkat dikeluarkan dan kunci "sedang login" dilepas, jadi pemilik akun bisa langsung masuk lagi
  await update("users", u.id, { passwordHash: await bcrypt.hash(password, 10), kickedAt: String(Date.now()), sessionId: "", sessionExp: "" });
  await clearFails(u.email);
  return { ok: true };
});