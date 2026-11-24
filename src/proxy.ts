import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE, LOGIN_PATH, HOME_AFTER_LOGIN, isGuestPage, isProtectedPage } from "@/lib/authRoutes";

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const k = process.env.JWT_SECRET;
  if (!k || k.length < 32) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(k)); // juga menolak token yang sudah melewati exp
    return true;
  } catch {
    return false;
  }
}

const noStore = (res: NextResponse) => { res.headers.set("Cache-Control", "no-store"); return res; };

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await hasValidSession(token);

  if (valid) {
    if (isGuestPage(pathname)) return noStore(NextResponse.redirect(new URL(HOME_AFTER_LOGIN, req.url)));
    return NextResponse.next();
  }

  // Tidak sah: bersihkan cookie bila ada (token habis / rusak)
  const stale = !!token;
  if (isProtectedPage(pathname)) {
    const res = NextResponse.redirect(new URL(LOGIN_PATH, req.url));
    if (stale) res.cookies.delete(SESSION_COOKIE);
    return noStore(res);
  }
  const res = NextResponse.next();
  if (stale) res.cookies.delete(SESSION_COOKIE);
  return res;
}

// Semua halaman (bukan API, file statis, atau aset Next) supaya cookie kedaluwarsa ikut dibersihkan di halaman publik juga
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|.*\\..*).*)"],
};