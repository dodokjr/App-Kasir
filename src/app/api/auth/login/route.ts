import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { seedDeveloper } from "@/lib/seed";
import { createSession, type Role } from "@/lib/auth";

export const POST = handle(async (req) => {
  const b = await req.json();
  const email = String(b.email || "").trim().toLowerCase();
  const users = await seedDeveloper();
  const u = users.find((x) => x.email === email);
  if (!u || !(await bcrypt.compare(String(b.password || ""), u.passwordHash))) throw new HttpError(401, "Email atau password salah");
  if (u.active === "FALSE") throw new HttpError(403, "Akun dinonaktifkan");
  if (u.storeId) {
    const st = (await all("stores")).find((s) => s.id === u.storeId);
    if (st?.active === "FALSE") throw new HttpError(403, "Toko dinonaktifkan. Hubungi admin");
  }
  await createSession({ uid: u.id, name: u.name, role: u.role as Role, storeId: u.storeId, branchId: u.branchId });
  return { ok: true };
});
