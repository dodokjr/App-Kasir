import { handle, need, inScope, HttpError } from "@/lib/api";
import type { Role } from "@/lib/auth";
import { all, add, update, uid, now } from "@/lib/sheets";
import { summarize, shape, branchNames } from "@/lib/shift";

const SELL: Role[] = ["kasir", "kepala_toko", "kepala_cabang"];

export const GET = handle(async (req) => {
  const s = await need();
  const q = new URL(req.url).searchParams;
  const names = await branchNames();
  const shifts = await all("shifts");

  // Shift yang sedang dibuka milik pengguna ini (beserta total sementara)
  if (q.get("current")) {
    const sh = shifts.find((x) => x.cashierId === s.uid && x.status === "open");
    return { shift: sh ? shape(sh, names, await summarize(sh)) : null };
  }

  const scoped = shifts.filter((x) => inScope(s, x) && (s.role !== "kasir" || x.cashierId === s.uid));
  const id = q.get("id");
  if (id) {
    const sh = scoped.find((x) => x.id === id);
    if (!sh) throw new HttpError(404, "Data kasir tidak ditemukan");
    return { shift: shape(sh, names, sh.status === "open" ? await summarize(sh) : undefined) };
  }
  return {
    shifts: scoped.sort((a, b) => b.openedAt.localeCompare(a.openedAt)).slice(0, 100).map((x) => shape(x, names, undefined, false)),
  };
});

export const POST = handle(async (req) => {
  const s = await need(SELL);
  const b = await req.json();
  const names = await branchNames();
  const mine = (await all("shifts", { fresh: true })).find((x) => x.cashierId === s.uid && x.status === "open");

  if (b.action === "open") {
    if (mine) throw new HttpError(400, "Kasir Anda sudah dibuka. Tutup kasir dulu sebelum membuka yang baru");
    const opening = Math.floor(Number(b.openingCash ?? 0));
    if (!(opening >= 0)) throw new HttpError(400, "Modal awal tidak valid");

    let branchId = s.branchId;
    if (s.role === "kepala_toko") {
      branchId = b.branchId || s.branchId;
      const ok = (await all("branches")).some((x) => x.id === branchId && x.storeId === s.storeId);
      if (!ok) throw new HttpError(400, "Pilih cabang tempat berjualan");
    }
    const row = {
      id: uid(), storeId: s.storeId, branchId, cashierId: s.uid, cashierName: s.name,
      openedAt: now(), openingCash: String(opening), status: "open", closedAt: "",
      countedCash: "", expectedCash: "", difference: "", totalSales: "", txCount: "", itemsSold: "", itemsJson: "", note: "", paymentsJson: "",
    };
    await add("shifts", row);
    return { shift: shape(row, names, await summarize(row)) };
  }

  if (b.action === "close") {
    if (!mine) throw new HttpError(400, "Tidak ada kasir yang sedang dibuka");
    const counted = Math.floor(Number(b.countedCash));
    if (!(counted >= 0)) throw new HttpError(400, "Isi jumlah uang tunai yang ada di laci kasir");

    const closedAt = now();
    const sum = await summarize(mine, closedAt);
    let itemsJson = JSON.stringify(sum.items);
    if (itemsJson.length > 45000) itemsJson = JSON.stringify(sum.items.slice(0, 200));
    const patch = {
      status: "closed", closedAt, countedCash: String(counted), expectedCash: String(sum.expectedCash),
      difference: String(counted - sum.expectedCash), totalSales: String(sum.totalSales),
      txCount: String(sum.txCount), itemsSold: String(sum.itemsSold), itemsJson,
      note: String(b.note ?? "").slice(0, 300), paymentsJson: JSON.stringify(sum.payments),
    };
    await update("shifts", mine.id, patch);
    return { shift: shape({ ...mine, ...patch }, names) };
  }
  throw new HttpError(400, "Aksi tidak dikenal");
});