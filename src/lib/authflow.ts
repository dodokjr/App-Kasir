import { SignJWT, jwtVerify } from "jose";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { HttpError } from "./api";
import { all, add, update, now, type Row } from "./sheets";
import { sendAlertEmail } from "./mail";

/* ---------- Token tahap (stateless) ----------
 * Setiap langkah login/registrasi menghasilkan token pendek yang hanya berlaku untuk langkah berikutnya,
 * jadi langkah tidak bisa dilompati (misalnya langsung ke PIN tanpa password). */
export type Step = "password" | "human" | "pin" | "setpin" | "otp" | "reset" | "newpw";
export type Stage = { step: Step; email: string; uid?: string; ref?: string; iat?: number };

const secret = () => {
  const k = process.env.JWT_SECRET;
  if (!k || k.length < 32) throw new Error("JWT_SECRET belum diisi atau kurang dari 32 karakter (.env.local)");
  return k;
};
const key = () => new TextEncoder().encode(secret());

export const signStage = (s: Omit<Stage, "iat">, ttl = "15m") =>
  new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(ttl).sign(key());

export async function readStage(token: unknown, step: Step): Promise<Stage> {
  try {
    const { payload } = await jwtVerify(String(token || ""), key());
    if (payload.step !== step) throw new Error("step");
    return payload as unknown as Stage;
  } catch {
    throw new HttpError(401, "Sesi verifikasi berakhir. Silakan mulai lagi");
  }
}

/* ---------- OTP ---------- */
export const makeOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
export const hmac = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");
export const safeEq = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export const PIN_RE = /^\d{6}$/;
const SEQ = ["012345", "123456", "234567", "345678", "456789", "543210", "654321", "765432", "876543", "987654"];
export const weakPin = (p: string) => /^(\d)\1{5}$/.test(p) || SEQ.includes(p);

/* ---------- Info klien ---------- */
export function clientInfo(req: Request) {
  const h = req.headers;
  const ip = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "tidak diketahui").trim();
  const dec = (v: string | null) => { try { return v ? decodeURIComponent(v) : ""; } catch { return v || ""; } };
  return { ip, device: (h.get("user-agent") || "tidak diketahui").slice(0, 200), city: dec(h.get("x-vercel-ip-city")), country: h.get("x-vercel-ip-country") || "" };
}

async function locate(c: ReturnType<typeof clientInfo>): Promise<string> {
  if (c.city || c.country) return [c.city, c.country].filter(Boolean).join(", ");
  if (!c.ip || c.ip === "tidak diketahui" || /^(127\.|10\.|192\.168\.|::1|fe80)/.test(c.ip)) return "Lokasi tidak diketahui (jaringan lokal)";
  try {
    const r = await fetch(`https://ipwho.is/${encodeURIComponent(c.ip)}`, { signal: AbortSignal.timeout(3000) });
    const d = await r.json();
    if (d?.success) return [d.city, d.region, d.country].filter(Boolean).join(", ");
  } catch {}
  return "Lokasi tidak diketahui";
}

/* ---------- Pembatasan percobaan ----------
 * Tahap 0: 3 kesempatan. Salah semua -> beku 8 menit.
 * Tahap 1 (setelah beku): 2 kesempatan. Salah semua -> email peringatan (IP + lokasi) lalu beku 8 menit lagi.
 * Semua kesalahan (email, password, PIN) dihitung bersama per email; berhasil login = reset. */
const FREEZE_MS = 8 * 60_000;
const limitOf = (phase: number) => (phase === 0 ? 3 : 2);

const fmt = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} menit ${s % 60} detik` : `${s} detik`);

const getLock = async (email: string) => (await all("auth_state", { fresh: true })).find((r) => r.kind === "lock" && r.key === email);

async function saveLock(row: Row | undefined, email: string, patch: Partial<Row>) {
  if (row) return update("auth_state", row.id, patch);
  return add("auth_state", { id: crypto.randomUUID(), kind: "lock", key: email, hash: "", data: "", attempts: "0", phase: "0", lockUntil: "", expiresAt: "", sentAt: "", ...patch } as Row);
}

export async function assertNotLocked(email: string) {
  const r = await getLock(email);
  const left = Math.ceil((Number(r?.lockUntil || 0) - Date.now()) / 1000);
  if (left > 0) throw new HttpError(429, `Akun dibekukan sementara. Coba lagi dalam ${fmt(left)}`, { retryAfter: left });
}

export async function clearFails(email: string) {
  const r = await getLock(email);
  if (r && (Number(r.attempts) || Number(r.phase) || r.lockUntil)) await update("auth_state", r.id, { attempts: "0", phase: "0", lockUntil: "" });
}

/** Catat satu kesalahan lalu lempar galat. `user` diisi bila email terdaftar (untuk email peringatan). */
export async function failAttempt(email: string, msg: string, req: Request, user?: { name: string; email: string }): Promise<never> {
  const r = await getLock(email);
  const phase = Number(r?.phase || 0);
  const fails = Number(r?.attempts || 0) + 1;
  const left = limitOf(phase) - fails;

  if (left > 0) {
    await saveLock(r, email, { attempts: String(fails) });
    throw new HttpError(401, `${msg}. Sisa kesempatan: ${left}`, { attemptsLeft: left });
  }

  await saveLock(r, email, { attempts: "0", phase: "1", lockUntil: String(Date.now() + FREEZE_MS) });
  if (phase >= 1 && user) {
    const c = clientInfo(req);
    try { await sendAlertEmail(user.email, user.name, { ip: c.ip, location: await locate(c), device: c.device }); }
    catch (e) { console.error("[alert-email]", e); }
  }
  throw new HttpError(429, `${msg}. Akun dibekukan 8 menit`, { retryAfter: FREEZE_MS / 1000 });
}