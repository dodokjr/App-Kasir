import { handle, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { readStage, signStage, hmac, safeEq } from "@/lib/authflow";

const MAX_TRIES = 5;

// Lupa password, langkah 2: cek OTP. Benar -> token untuk membuat password baru
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "reset");
  const code = String(b.code || "").replace(/\D/g, "");
  if (code.length !== 6) throw new HttpError(400, "Masukkan 6 digit kode OTP");

  const r = (await all("auth_state", { fresh: true })).find((x) => x.id === st.ref && x.kind === "reset" && x.key === st.email);
  if (!r || r.data !== "1") throw new HttpError(400, "Kode salah atau sudah tidak berlaku. Minta kode baru", { expired: true });
  if (Number(r.expiresAt) < Date.now()) throw new HttpError(400, "Kode kedaluwarsa. Minta kode baru", { expired: true });
  const tries = Number(r.attempts || 0);
  if (tries >= MAX_TRIES) throw new HttpError(429, "Terlalu banyak salah. Minta kode baru", { expired: true });

  if (!safeEq(hmac(`${r.id}:${code}`), r.hash)) {
    await update("auth_state", r.id, { attempts: String(tries + 1) });
    const left = MAX_TRIES - tries - 1;
    throw new HttpError(401, left > 0 ? `Kode salah. Sisa kesempatan: ${left}` : "Kode salah. Minta kode baru", { attemptsLeft: left, expired: left <= 0 });
  }

  await update("auth_state", r.id, { data: "verified", hash: "", expiresAt: String(Date.now() + 10 * 60_000) });
  return { ok: true, token: await signStage({ step: "newpw", email: st.email, ref: r.id }, "10m") };
});