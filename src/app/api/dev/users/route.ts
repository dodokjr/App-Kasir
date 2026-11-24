import { handle, need, HttpError } from "@/lib/api";
import { all, update, removeByIds } from "@/lib/sheets";
import { leave } from "@/lib/presence";
import type { Session } from "@/lib/auth";

// Developer mengelola SEMUA akun kecuali akunnya sendiri dan sesama developer
async function target(s: Session, id: unknown) {
  const u = (await all("users", { fresh: true })).find((x) => x.id === String(id || ""));
  if (!u) throw new HttpError(404, "Pengguna tidak ditemukan");
  if (u.id === s.uid) throw new HttpError(400, "Tidak bisa mengubah akun Anda sendiri");
  if (u.role === "developer") throw new HttpError(403, "Akun developer tidak bisa dikelola dari sini");
  return u;
}

// Nonaktifkan / aktifkan akun, atau keluarkan paksa dari semua perangkat
export const PATCH = handle(async (req) => {
  const s = await need(["developer"]);
  const b = await req.json();
  const u = await target(s, b.id);
  if (b.action === "kick") {
    await update("users", u.id, { kickedAt: String(Date.now()), sessionId: "", sessionExp: "" });
    await leave(u.id).catch(() => {});
    return { ok: true };
  }
  if (b.action === "active") {
    const on = !!b.active;
    await update("users", u.id, on ? { active: "TRUE" } : { active: "FALSE", kickedAt: String(Date.now()), sessionId: "", sessionExp: "" });
    if (!on) await leave(u.id).catch(() => {});
    return { ok: true };
  }
  throw new HttpError(400, "Aksi tidak dikenal");
});

// Hapus akun permanen. Wajib mengetik ulang emailnya (confirm). Riwayat transaksi tetap ada (nama kasir tersimpan di transaksi).
// Untuk menghapus toko beserta semua isinya, pakai DELETE /api/dev/stores
export const DELETE = handle(async (req) => {
  const s = await need(["developer"]);
  const q = new URL(req.url).searchParams;
  const u = await target(s, q.get("id"));
  if ((q.get("confirm") || "").trim().toLowerCase() !== u.email.toLowerCase()) throw new HttpError(400, "Konfirmasi tidak cocok. Ketik email akun persis seperti tampilan");
  await removeByIds(["users", "presence"], () => ({ users: new Set([u.id]), presence: new Set([u.id]) }));
  return { ok: true };
});
