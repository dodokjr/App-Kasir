import { handle, HttpError } from "@/lib/api";
import { all } from "@/lib/sheets";
import { readStage, signStage } from "@/lib/authflow";

// Langkah 3: "Saya bukan robot". Bot yang mengisi kolom jebakan atau mengirim terlalu cepat ditolak (tanpa menghitung sebagai salah login)
export const POST = handle(async (req) => {
  const b = await req.json();
  const st = await readStage(b.token, "human");
  const age = Date.now() - (st.iat ?? 0) * 1000;
  if (b.hp || b.checked !== true || age < 1500) throw new HttpError(400, "Verifikasi gagal. Centang kotak lagi");
  const u = (await all("users", { fresh: true })).find((x) => x.id === st.uid);
  if (!u) throw new HttpError(401, "Sesi verifikasi berakhir. Silakan mulai lagi");
  // Belum punya PIN (akun lama): wajib membuat dulu sebelum dashboard
  const mode = u.pinHash ? "pin" : "setpin";
  return { ok: true, mode, token: await signStage({ step: mode, uid: u.id, email: u.email }, "10m") };
});
