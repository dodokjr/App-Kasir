import { handle, need, HttpError } from "@/lib/api";
import { all, update } from "@/lib/sheets";

const me = async () => {
  const s = await need();
  const u = (await all("users", { fresh: true })).find((x) => x.id === s.uid);
  if (!u) throw new HttpError(401, "Silakan login dulu");
  return u;
};

export const GET = handle(async () => {
  const u = await me();
  return { name: u.name, email: u.email, phone: u.phone || "" };
});

// Nomor telepon akun (opsional). Boleh diawali +, 8 sampai 15 digit. Kosong = hapus
export const PATCH = handle(async (req) => {
  const u = await me();
  const b = await req.json();
  const raw = String(b.phone ?? "").trim();
  let phone = "";
  if (raw) {
    if (!/^\+?[\d\s\-()]+$/.test(raw)) throw new HttpError(400, "Nomor telepon hanya boleh berisi angka, spasi, tanda hubung, dan + di awal");
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) throw new HttpError(400, "Nomor telepon harus 8 sampai 15 digit");
    phone = (raw.startsWith("+") ? "+" : "") + digits;
  }
  await update("users", u.id, { phone }); // ditulis RAW, jadi angka 0 di depan dan tanda + tidak hilang
  return { ok: true, phone };
});
