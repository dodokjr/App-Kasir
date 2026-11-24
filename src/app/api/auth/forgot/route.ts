import { handle, HttpError } from "@/lib/api";
import { all, add, update } from "@/lib/sheets";
import { signStage, makeOtp, hmac } from "@/lib/authflow";
import { sendOtpEmail } from "@/lib/mail";

const OTP_TTL = 10 * 60_000;
const RESEND_GAP = 60_000;

// Lupa password, langkah 1: kirim kode OTP ke email akun.
// Jawaban selalu sama baik email terdaftar atau tidak, supaya orang luar tidak bisa menebak email mana yang punya akun.
export const POST = handle(async (req) => {
  const b = await req.json();
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Format email belum benar");

  const u = (await all("users", { fresh: true })).find((x) => x.email === email);
  let ref: string = crypto.randomUUID(); // email tak terdaftar: ref palsu, kode tidak pernah dikirim

  if (u && u.active !== "FALSE") {
    const rows = await all("auth_state", { fresh: true });
    const prev = rows.find((r) => r.kind === "reset" && r.key === email && r.data);
    const wait = prev ? RESEND_GAP - (Date.now() - Number(prev.sentAt || 0)) : 0;
    if (prev && wait > 0) {
      ref = prev.id; // baru saja dikirim: pakai permintaan yang sama
    } else {
      const id = crypto.randomUUID(), code = makeOtp();
      await add("auth_state", { id, kind: "reset", key: email, hash: hmac(`${id}:${code}`), data: "1", attempts: "0", phase: "0", lockUntil: "", expiresAt: String(Date.now() + OTP_TTL), sentAt: String(Date.now()) });
      try { await sendOtpEmail(email, u.name, code, "reset password"); }
      catch (e) { await update("auth_state", id, { data: "" }).catch(() => {}); throw e; }
      if (prev) await update("auth_state", prev.id, { data: "", hash: "" }).catch(() => {});
      ref = id;
    }
  }
  return { ok: true, token: await signStage({ step: "reset", email, ref }, "20m"), email, resendIn: 60 };
});