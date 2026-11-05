import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";
import { methodsOf } from "@/lib/payments";
import { PAYMENT_PRESETS, LOCKED_KEYS, type PayGroup } from "@/lib/business";

const GROUPS: PayGroup[] = ["bank", "qris", "online", "kurir", "lain"];
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24);

// Kasir hanya melihat metode yang aktif. Kepala toko melihat semua (?all=1) untuk mengatur
export const GET = handle(async (req) => {
  const s = await need();
  const wantAll = new URL(req.url).searchParams.get("all") === "1" && s.role === "kepala_toko";
  return methodsOf(s.storeId, wantAll);
});

// Tambah dari daftar siap pakai (ShopeeFood, GoFood, dst.) atau buat sendiri
export const POST = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const current = await methodsOf(s.storeId, true);
  const preset = PAYMENT_PRESETS.find((p) => p.key === b.presetKey);
  let key: string, label: string, group: PayGroup;
  if (preset) {
    key = preset.key; label = preset.label; group = preset.group;
    const ex = current.find((m) => m.key === key);
    if (ex) { if (!ex.active) await update("payment_methods", ex.id, { active: "TRUE" }); return { ok: true }; }
  } else {
    label = String(b.label || "").trim().slice(0, 30);
    if (!label) throw new HttpError(400, "Nama metode pembayaran wajib diisi");
    group = GROUPS.includes(b.group) ? b.group : "lain";
    key = "x_" + (slug(label) || uid());
    if (current.some((m) => m.key === key || m.label.toLowerCase() === label.toLowerCase())) throw new HttpError(409, "Metode ini sudah ada");
  }
  await add("payment_methods", { id: uid(), storeId: s.storeId, key, label, group, active: "TRUE", createdAt: now() });
  return { ok: true };
});

// Nonaktifkan / aktifkan, atau ganti nama. Tidak dihapus agar transaksi lama tetap terbaca
export const PATCH = handle(async (req) => {
  const s = await need(["kepala_toko"]);
  const b = await req.json();
  const m = (await methodsOf(s.storeId, true)).find((x) => x.id === b.id);
  if (!m) throw new HttpError(404, "Metode pembayaran tidak ditemukan");
  const patch: Record<string, string> = {};
  if (b.active !== undefined) {
    if (!b.active && LOCKED_KEYS.includes(m.key)) throw new HttpError(400, "Cash dan transfer bank adalah metode utama dan tidak bisa dinonaktifkan");
    patch.active = b.active ? "TRUE" : "FALSE";
  }
  if (b.label !== undefined) {
    const label = String(b.label).trim().slice(0, 30);
    if (!label) throw new HttpError(400, "Nama tidak boleh kosong");
    patch.label = label;
  }
  await update("payment_methods", m.id, patch);
  return { ok: true };
});