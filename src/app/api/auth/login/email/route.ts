import { handle, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { seedDeveloper } from "@/lib/seed";
import { signStage, assertNotLocked, failAttempt } from "@/lib/authflow";

// Langkah 1: cek email
export const POST = handle(async (req) => {
  const b = await req.json();
  const email = String(b.email || "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Format email belum benar");
  await assertNotLocked(email);
  const u = (await seedDeveloper()).find((x) => x.email === email);
  if (!u) await failAttempt(email, "Email belum terdaftar", req);
  if (u!.active === "FALSE") throw new HttpError(403, "Akun dinonaktifkan");
  return { ok: true, token: await signStage({ step: "password", uid: u!.id, email }) };
});
