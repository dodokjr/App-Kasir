import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { assertFreeToLogin } from "@/lib/auth";
import { readStage, signStage, assertNotLocked, failAttempt } from "@/lib/authflow";

// Langkah 2: cek password
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "password");
  await assertNotLocked(st.email);
  const u = (await all("users", { fresh: true })).find((x) => x.id === st.uid);
  if (!u) throw new HttpError(401, "Sesi verifikasi berakhir. Silakan mulai lagi");
  if (u.active === "FALSE") throw new HttpError(403, "Akun dinonaktifkan");
  if (!(await bcrypt.compare(String(b.password || ""), u.passwordHash))) await failAttempt(u.email, "Password salah", req, { name: u.name, email: u.email });
  if (u.storeId) {
    const stRow = (await all("stores")).find((s) => s.id === u.storeId);
    if (stRow?.active === "FALSE") throw new HttpError(403, "Toko dinonaktifkan. Hubungi admin");
  }
  await assertFreeToLogin(u); // password benar, tapi akun sedang dipakai di perangkat lain
  return { ok: true, token: await signStage({ step: "human", uid: u.id, email: u.email }, "10m") };
});
