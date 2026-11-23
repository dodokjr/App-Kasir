import { handle, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";
import { seedMethods } from "@/lib/payments";
import { readStage, signStage, hmac, safeEq } from "@/lib/authflow";

const MAX_TRIES = 5;

// Langkah 2: cek OTP. Bila benar, akun dibuat lalu diminta membuat PIN (belum ada sesi/dashboard)
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "otp");
  const code = String(b.code || "").replace(/\D/g, "");
  if (code.length !== 6) throw new HttpError(400, "Masukkan 6 digit kode OTP");

  const r = (await all("auth_state", { fresh: true })).find((x) => x.id === st.ref && x.kind === "reg");
  if (!r || !r.data) throw new HttpError(400, "Kode tidak berlaku lagi. Silakan daftar ulang");
  if (Number(r.expiresAt) < Date.now()) throw new HttpError(400, "Kode kedaluwarsa. Minta kode baru", { expired: true });
  const tries = Number(r.attempts || 0);
  if (tries >= MAX_TRIES) throw new HttpError(429, "Terlalu banyak salah. Minta kode baru", { expired: true });

  if (!safeEq(hmac(`${r.id}:${code}`), r.hash)) {
    await update("auth_state", r.id, { attempts: String(tries + 1) });
    const left = MAX_TRIES - tries - 1;
    throw new HttpError(401, left > 0 ? `Kode salah. Sisa kesempatan: ${left}` : "Kode salah. Minta kode baru", { attemptsLeft: left, expired: left <= 0 });
  }

  const email = r.key;
  if ((await all("users", { fresh: true })).some((u) => u.email === email)) throw new HttpError(409, "Email sudah terdaftar");
  const p = JSON.parse(r.data) as { storeName: string; branchName: string; street: string; name: string; businessType: string; passwordHash: string };

  const storeId = uid(), branchId = uid(), userId = uid();
  await add("stores", { id: storeId, name: p.storeName, active: "TRUE", createdAt: now(), businessType: p.businessType });
  await add("branches", { id: branchId, storeId, name: p.branchName, street: p.street, createdAt: now() });
  await add("users", { id: userId, storeId, branchId, name: p.name, email, passwordHash: p.passwordHash, role: "kepala_toko", active: "TRUE", createdAt: now(), pinHash: "" });
  await seedMethods(storeId);
  await update("auth_state", r.id, { data: "", hash: "" }); // sekali pakai

  return { ok: true, token: await signStage({ step: "setpin", uid: userId, email }, "20m") };
});
