import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all, add, update, now } from "@/lib/sheets";
import { isBusinessType } from "@/lib/business";
import { signStage, makeOtp, hmac } from "@/lib/authflow";
import { sendOtpEmail } from "@/lib/mail";

const OTP_TTL = 10 * 60_000;
const RESEND_GAP = 60_000;

// Langkah 1: validasi data, simpan sebagai pendaftaran tertunda, kirim OTP. Akun BELUM dibuat sebelum OTP benar
export const POST = handle(async (req) => {
  const b = await req.json();
  const storeName = String(b.storeName || "").trim();
  const branchName = String(b.branchName || "").trim() || "Pusat";
  const street = String(b.street || "").trim();
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!isBusinessType(b.businessType)) throw new HttpError(400, "Pilih jenis usaha toko Anda");
  if (!storeName || !name || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Lengkapi semua data");
  if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter");

  const rows = await all("auth_state", { fresh: true });
  if ((await all("users", { fresh: true })).some((u) => u.email === email)) throw new HttpError(409, "Email sudah terdaftar");

  const prev = rows.find((r) => r.kind === "reg" && r.key === email && r.data);
  const wait = prev ? RESEND_GAP - (Date.now() - Number(prev.sentAt || 0)) : 0;
  if (wait > 0) throw new HttpError(429, `Tunggu ${Math.ceil(wait / 1000)} detik sebelum meminta kode lagi`, { retryAfter: Math.ceil(wait / 1000) });

  const id = crypto.randomUUID(), code = makeOtp();
  const data = JSON.stringify({ storeName, branchName, street, name, businessType: b.businessType, passwordHash: await bcrypt.hash(password, 10) });
  await add("auth_state", { id, kind: "reg", key: email, hash: hmac(`${id}:${code}`), data, attempts: "0", phase: "0", lockUntil: "", expiresAt: String(Date.now() + OTP_TTL), sentAt: String(Date.now()) });
  try { await sendOtpEmail(email, name, code); }
  catch (e) { await update("auth_state", id, { data: "" }).catch(() => {}); throw e; }
  if (prev) await update("auth_state", prev.id, { data: "" }).catch(() => {}); // pendaftaran lama untuk email ini hangus

  return { ok: true, token: await signStage({ step: "otp", email, ref: id }, "20m"), email, resendIn: 60 };
});
