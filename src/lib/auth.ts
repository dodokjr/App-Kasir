import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { all, update } from "./sheets";
import { HttpError } from "./api";

export type Role = "developer" | "admin" | "kepala_toko" | "kepala_cabang" | "kasir" | "gudang";
export type Session = { uid: string; name: string; role: Role; storeId: string; branchId: string; sid?: string };

// Tanpa JWT_SECRET, "undefined" akan dipakai sebagai kunci rahasia. Itu tidak aman, jadi tolak
const key = () => {
  const k = process.env.JWT_SECRET;
  if (!k || k.length < 32) throw new Error("JWT_SECRET belum diisi atau kurang dari 32 karakter (.env.local)");
  return new TextEncoder().encode(k);
};

const SESSION_MS = 60 * 60 * 12 * 1000;

/**
 * Satu akun = satu perangkat. Bila akun masih punya sesi aktif di perangkat LAIN, login ditolak sampai
 * pengguna keluar (logout) di perangkat itu. Perangkat yang sama (cookie sesi yang sama) boleh masuk lagi.
 * Sesi dianggap bebas bila sudah logout, kedaluwarsa (12 jam), di-kick, atau password direset lewat email.
 */
export async function assertFreeToLogin(u: Record<string, string>) {
  if (!u.sessionId || (Number(u.sessionExp) || 0) <= Date.now()) return;
  const cur = await getSession({ check: false });
  if (cur?.sid && cur.sid === u.sessionId) return;
  throw new HttpError(409, "Akun ini sedang masuk di perangkat lain. Keluar (logout) dulu di perangkat tersebut, lalu coba lagi.", { inUse: true });
}

export async function createSession(s: Session) {
  // Baca ulang akun (tanpa cache) supaya dua perangkat yang login bersamaan tidak lolos keduanya
  const u = (await all("users", { fresh: true })).find((x) => x.id === s.uid);
  if (!u) throw new HttpError(401, "Akun tidak ditemukan");
  await assertFreeToLogin(u);
  const sid = crypto.randomUUID();
  await update("users", s.uid, { sessionId: sid, sessionExp: String(Date.now() + SESSION_MS) });
  const token = await new SignJWT({ ...s, sid }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("12h").sign(key());
  (await cookies()).set("sid", token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
  });
}

/**
 * check = true (bawaan): token sah DAN akun masih ada, aktif, dan belum di-kick (baca Google Sheets).
 * check = false: hanya cek token. Dipakai halaman publik (cuma untuk menampilkan tombol Masuk/Dashboard) dan logout,
 * supaya halaman seperti beranda dan 404 tidak bergantung pada Google Sheets. Data sensitif tetap lewat API yang memakai check = true.
 */
export async function getSession(opts: { check?: boolean } = {}): Promise<Session | null> {
  const t = (await cookies()).get("sid")?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    // Cek ke daftar akun: akun yang dihapus, dinonaktifkan, atau di-kick (kickedAt lebih baru dari waktu login) langsung ditolak.
    // Bila Google Sheets sedang error/kuota habis, sesi yang tokennya sah tetap dipakai agar aplikasi tidak mati total.
    if (opts.check !== false) try {
      const u = (await all("users")).find((x) => x.id === payload.uid);
      if (!u || u.active === "FALSE") return null;
      const kicked = Number(u.kickedAt) || 0;
      if (kicked && Math.floor(kicked / 1000) > (payload.iat ?? 0)) return null;
      // Hanya sesi terbaru yang sah. Sesi lama (perangkat lain) atau sesi yang sudah di-logout ditolak.
      // Token lama tanpa sid tetap diterima selama akun belum punya sesi bertanda.
      if ((u.sessionId || "") !== String(payload.sid || "")) return null;
    } catch {}
    return payload as unknown as Session;
  } catch { return null; }
}

export const destroySession = async () => { (await cookies()).delete("sid"); };