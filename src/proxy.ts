import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

export async function proxy(req: NextRequest) {
  const t = req.cookies.get("sid")?.value;
  if (t) {
    try {
      const k = process.env.JWT_SECRET;
      if (k && k.length >= 32) {
        await jwtVerify(t, new TextEncoder().encode(k));
        return NextResponse.next();
      }
      throw new Error("JWT_SECRET");
    } catch {}
  }
  return NextResponse.redirect(new URL("/login", req.url));
}
export const config = { matcher: ["/dashboard/:path*", "/kasir/:path*", "/gudang/:path*", "/keuangan/:path*", "/pengaturan/:path*", "/monitor/:path*"] };
