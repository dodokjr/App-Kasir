import bcrypt from "bcryptjs";
import { handle, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { createSession, type Role } from "@/lib/auth";
import { readStage, assertNotLocked, failAttempt, clearFails, PIN_RE } from "@/lib/authflow";

// Langkah 4: cek PIN. Benar -> sesi dibuat -> client redirect ke dashboard
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "pin");
  await assertNotLocked(st.email);
  const u = (await all("users", { fresh: true })).find((x) => x.id === st.uid);
  if (!u || !u.pinHash) throw new HttpError(401, "Sesi verifikasi berakhir. Silakan mulai lagi");
  const pin = String(b.pin || "");
  if (!PIN_RE.test(pin) || !(await bcrypt.compare(pin, u.pinHash))) await failAttempt(u.email, "PIN salah", req, { name: u.name, email: u.email });
  await clearFails(u.email);
  await createSession({ uid: u.id, name: u.name, role: u.role as Role, storeId: u.storeId, branchId: u.branchId });
  return { ok: true };
});
