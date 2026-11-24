import bcrypt from "bcryptjs";
import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, remove, uid, now } from "@/lib/sheets";
import type { Role, Session } from "@/lib/auth";
import { leave } from "@/lib/presence";
import { PIN_RE, weakPin } from "@/lib/authflow";

const CAN_CREATE: Partial<Record<Role, Role[]>> = {
  developer: ["admin"],
  kepala_toko: ["kepala_cabang", "kasir", "gudang"],
  kepala_cabang: ["kasir", "gudang"],
};

function checkPin(pin: string) {
  if (!PIN_RE.test(pin)) throw new HttpError(400, "PIN harus 6 digit angka");
  if (weakPin(pin)) throw new HttpError(400, "PIN terlalu mudah ditebak. Hindari 123456 atau angka berulang");
}

// Anggota yang boleh dikelola = peran yang boleh dibuat oleh si pengelola, dan masih dalam lingkupnya
async function target(s: Session, id: unknown) {
  const u = (await all("users", { fresh: true })).find((x) => x.id === String(id || ""));
  if (!u) throw new HttpError(404, "Anggota tidak ditemukan");
  if (u.id === s.uid) throw new HttpError(400, "Tidak bisa mengubah akun Anda sendiri");
  const inScope =
    s.role === "developer" ||
    (s.role === "kepala_toko" && u.storeId === s.storeId) ||
    (s.role === "kepala_cabang" && u.storeId === s.storeId && u.branchId === s.branchId);
  if (!inScope || !CAN_CREATE[s.role]?.includes(u.role as Role)) throw new HttpError(403, "Anda tidak berhak mengelola akun ini");
  return u;
}

export const GET = handle(async () => {
  const s = await need(["developer", "admin", "kepala_toko", "kepala_cabang"]);
  let rows = await all("users");
  if (s.role === "kepala_toko") rows = rows.filter((u) => u.storeId === s.storeId);
  if (s.role === "kepala_cabang") rows = rows.filter((u) => u.branchId === s.branchId);
  return rows.map(({ passwordHash, pinHash, kickedAt, sessionId, sessionExp, ...r }) => ({ ...r, hasPin: pinHash ? "TRUE" : "FALSE" }));
});

export const POST = handle(async (req) => {
  const s = await need(["developer", "kepala_toko", "kepala_cabang"]);
  const b = await req.json();
  const role = b.role as Role;
  if (!CAN_CREATE[s.role]?.includes(role)) throw new HttpError(403, "Peran ini tidak boleh Anda tambahkan");
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  if (!name || !email) throw new HttpError(400, "Nama dan email wajib diisi");
  if (String(b.password || "").length < 6) throw new HttpError(400, "Password minimal 6 karakter");
  const pin = String(b.pin || "");
  if (pin) checkPin(pin);
  if ((await all("users", { fresh: true })).some((u) => u.email === email)) throw new HttpError(409, "Email sudah terdaftar");

  let storeId = s.storeId, branchId = s.branchId;
  if (s.role === "developer") { storeId = ""; branchId = ""; }
  if (s.role === "kepala_toko") {
    const br = (await all("branches")).find((x) => x.id === b.branchId && x.storeId === s.storeId);
    if (!br) throw new HttpError(400, "Pilih cabang yang valid");
    branchId = br.id;
  }
  await add("users", {
    id: uid(), storeId, branchId, name, email, passwordHash: await bcrypt.hash(String(b.password), 10),
    role, active: "TRUE", createdAt: now(), pinHash: pin ? await bcrypt.hash(pin, 10) : "", kickedAt: "", phone: "", sessionId: "", sessionExp: "",
  });
  return { ok: true };
});

// Kelola anggota: kick (keluarkan paksa dari semua perangkat), aktif/nonaktif, atur PIN
export const PATCH = handle(async (req) => {
  const s = await need(["developer", "kepala_toko", "kepala_cabang"]);
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
  if (b.action === "setpin") {
    const pin = String(b.pin || "");
    checkPin(pin);
    await update("users", u.id, { pinHash: await bcrypt.hash(pin, 10) });
    return { ok: true };
  }
  throw new HttpError(400, "Aksi tidak dikenal");
});

// Hapus anggota permanen. Riwayat transaksi tetap ada (nama kasir tersimpan di transaksi)
export const DELETE = handle(async (req) => {
  const s = await need(["developer", "kepala_toko", "kepala_cabang"]);
  const u = await target(s, new URL(req.url).searchParams.get("id"));
  await remove("users", u.id);
  await leave(u.id).catch(() => {});
  return { ok: true };
});
