import { handle, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";
import { readStage, makeOtp, hmac } from "@/lib/authflow";
import { sendOtpEmail } from "@/lib/mail";

const MAX_RESEND = 5;

export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "otp");
  const r = (await all("auth_state", { fresh: true })).find((x) => x.id === st.ref && x.kind === "reg");
  if (!r || !r.data) throw new HttpError(400, "Pendaftaran tidak ditemukan. Silakan daftar ulang");

  const wait = 60_000 - (Date.now() - Number(r.sentAt || 0));
  if (wait > 0) throw new HttpError(429, `Tunggu ${Math.ceil(wait / 1000)} detik sebelum meminta kode lagi`, { retryAfter: Math.ceil(wait / 1000) });
  const n = Number(r.phase || 0);
  if (n >= MAX_RESEND) throw new HttpError(429, "Batas kirim ulang tercapai. Silakan daftar ulang nanti");

  const code = makeOtp();
  const name = (JSON.parse(r.data) as { name: string }).name;
  await sendOtpEmail(r.key, name, code);
  await update("auth_state", r.id, { hash: hmac(`${r.id}:${code}`), attempts: "0", phase: String(n + 1), sentAt: String(Date.now()), expiresAt: String(Date.now() + 10 * 60_000) });
  return { ok: true, resendIn: 60 };
});
