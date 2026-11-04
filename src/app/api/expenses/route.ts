import { handle, need, inScope, HttpError } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { all, add, update, uid, now } from "@/lib/sheets";

const ROLES: Role[] = ["kepala_toko", "kepala_cabang"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = handle(async (req) => {
  const s = await need(ROLES);
  const q = new URL(req.url).searchParams;
  const from = q.get("from") || "0000-00-00";
  const to = q.get("to") || "9999-99-99";
  const branchId = s.role === "kepala_cabang" ? s.branchId : q.get("branchId") || "";
  return (await all("expenses"))
    .filter((x) => inScope(s, x) && x.voided !== "TRUE" && x.date >= from && x.date <= to && (!branchId || x.branchId === branchId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
});

export const POST = handle(async (req) => {
  const s = await need(ROLES);
  const b = await req.json();
  let branchId = s.branchId;
  if (s.role === "kepala_toko") {
    branchId = b.branchId;
    const ok = (await all("branches")).some((x) => x.id === branchId && x.storeId === s.storeId);
    if (!ok) throw new HttpError(400, "Pilih cabang untuk pengeluaran ini");
  }
  const amount = Math.floor(Number(b.amount));
  if (!(amount > 0)) throw new HttpError(400, "Nominal pengeluaran harus lebih dari 0");
  if (!DATE.test(String(b.date))) throw new HttpError(400, "Tanggal tidak valid");
  const row = {
    id: uid(), storeId: s.storeId, branchId, date: String(b.date),
    category: String(b.category || "Lainnya").slice(0, 40), note: String(b.note ?? "").slice(0, 200),
    amount: String(amount), createdById: s.uid, createdByName: s.name, createdAt: now(), voided: "FALSE",
  };
  await add("expenses", row);
  return row;
});

// Pengeluaran tidak dihapus permanen, hanya dibatalkan agar jejak audit tetap ada
export const PATCH = handle(async (req) => {
  const s = await need(ROLES);
  const b = await req.json();
  const x = (await all("expenses")).find((e) => e.id === b.id && inScope(s, e));
  if (!x) throw new HttpError(404, "Pengeluaran tidak ditemukan");
  if (s.role === "kepala_cabang" && x.branchId !== s.branchId) throw new HttpError(403, "Bukan cabang Anda");
  await update("expenses", x.id, { voided: "TRUE" });
  return { ok: true };
});
