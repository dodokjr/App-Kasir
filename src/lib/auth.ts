import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type Role = "developer" | "admin" | "kepala_toko" | "kepala_cabang" | "kasir" | "gudang";
export type Session = { uid: string; name: string; role: Role; storeId: string; branchId: string };

// Tanpa JWT_SECRET, "undefined" akan dipakai sebagai kunci rahasia. Itu tidak aman, jadi tolak
const key = () => {
  const k = process.env.JWT_SECRET;
  if (!k || k.length < 32) throw new Error("JWT_SECRET belum diisi atau kurang dari 32 karakter (.env.local)");
  return new TextEncoder().encode(k);
};

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("12h").sign(key());
  (await cookies()).set("sid", token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
  });
}

export async function getSession(): Promise<Session | null> {
  const t = (await cookies()).get("sid")?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    return payload as unknown as Session;
  } catch { return null; }
}

export const destroySession = async () => { (await cookies()).delete("sid"); };
