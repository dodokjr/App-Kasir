import { NextResponse } from "next/server";
import { getSession, type Role, type Session } from "./auth";
import { isQuotaError, type Row } from "./sheets";

export class HttpError extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

export async function need(roles?: Role[]): Promise<Session> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Silakan login dulu");
  if (roles && !roles.includes(s.role)) throw new HttpError(403, "Akses ditolak");
  return s;
}

// developer/admin: semua toko, kepala_toko: satu toko, lainnya: satu cabang
export function inScope(s: Session, r: Row) {
  if (s.role === "developer" || s.role === "admin") return true;
  if (s.role === "kepala_toko") return r.storeId === s.storeId;
  return r.branchId === s.branchId;
}

export function handle(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    try {
      return NextResponse.json(await fn(req));
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (isQuotaError(e)) {
        console.warn("[sheets] kuota baca Google Sheets habis");
        return NextResponse.json({ error: "Layanan sedang sibuk (batas permintaan Google Sheets). Tunggu sekitar 1 menit lalu coba lagi." }, { status: 429 });
      }
      console.error(e);
      return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
    }
  };
}