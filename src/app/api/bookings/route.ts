import { handle, need, HttpError } from "@/lib/api";
import { all, add, update, uid, now } from "@/lib/sheets";
import { dayKey } from "@/lib/shift";
import { branchFor } from "@/lib/rentalServer";
import { calcRental, fmtRange, isDate, isKind, MAX_DAYS, occupies, overlaps, readProfitRate, type Booking, type BookingStatus } from "@/lib/rental";

const ROLES = ["kasir", "kepala_cabang", "kepala_toko"] as const;
type R = Record<string, string>;

const toBooking = (r: R): Booking => ({
  id: r.id, branchId: r.branchId, itemId: r.itemId, itemName: r.itemName, kind: isKind(r.kind) ? r.kind : "booking",
  customerName: r.customerName, phone: r.phone, startDate: r.startDate, endDate: r.endDate,
  days: Number(r.days) || 0, pricePerDay: Number(r.pricePerDay) || 0, total: Number(r.total) || 0, paid: Number(r.paid) || 0,
  status: (["booked", "active", "returned", "cancelled"].includes(r.status) ? r.status : "booked") as BookingStatus,
  note: r.note, createdByName: r.createdByName, createdAt: r.createdAt, updatedAt: r.updatedAt, profitRate: readProfitRate(r.profitRate),
});

const money = (v: unknown, what: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100_000_000_000) throw new HttpError(400, `${what} harus bilangan bulat rupiah`);
  return n;
};

/** Unit yang sama tidak boleh dipesan dua kali di tanggal yang bertabrakan (kecuali yang sudah selesai atau batal) */
function assertFree(rows: R[], itemId: string, start: string, end: string, exceptId?: string) {
  const hit = rows.find((r) => r.itemId === itemId && r.id !== exceptId && occupies(r.status) && overlaps(start, end, r.startDate, r.endDate));
  if (hit) throw new HttpError(409, `Jadwal bentrok dengan ${hit.customerName} (${fmtRange(hit.startDate, hit.endDate)})`);
}

export const GET = handle(async (req) => {
  const s = await need([...ROLES]);
  const q = new URL(req.url).searchParams;
  const branchId = s.role === "kepala_toko" ? q.get("branchId") : s.branchId;
  const from = q.get("from") ?? "", to = q.get("to") ?? "";
  if ((from && !isDate(from)) || (to && !isDate(to))) throw new HttpError(400, "Tanggal tidak valid");
  return (await all("bookings"))
    .filter((r) => r.storeId === s.storeId && (!branchId || r.branchId === branchId))
    .filter((r) => (!to || r.startDate <= to) && (!from || r.endDate >= from))
    .map(toBooking)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.createdAt.localeCompare(b.createdAt));
});

export const POST = handle(async (req) => {
  const s = await need([...ROLES]);
  const b = await req.json();
  const branchId = await branchFor(s, b.branchId);
  const item = (await all("rental_items", { fresh: true })).find((r) => r.id === b.itemId && r.storeId === s.storeId && r.branchId === branchId);
  if (!item || item.active === "FALSE") throw new HttpError(400, "Unit tidak ditemukan atau sudah nonaktif");

  const customerName = String(b.customerName ?? "").trim().slice(0, 60);
  if (!customerName) throw new HttpError(400, "Nama penyewa wajib diisi");
  const phone = String(b.phone ?? "").trim().slice(0, 20);
  if (phone && !/^[0-9+\-\s()]+$/.test(phone)) throw new HttpError(400, "Nomor telepon hanya boleh angka, spasi, +, -, dan tanda kurung");
  if (!isDate(b.startDate) || !isDate(b.endDate)) throw new HttpError(400, "Tanggal mulai dan selesai wajib diisi");
  const pricePerDay = b.pricePerDay === undefined || b.pricePerDay === "" ? Number(item.pricePerDay) || 0 : money(b.pricePerDay, "Harga per hari");
  const { days, total } = calcRental(b.startDate, b.endDate, pricePerDay);
  if (!days) throw new HttpError(400, "Tanggal selesai tidak boleh sebelum tanggal mulai");
  if (days > MAX_DAYS) throw new HttpError(400, `Maksimal ${MAX_DAYS} hari per booking`);
  const kind = isKind(b.kind) ? b.kind : isKind(item.kind) ? item.kind : "sewa";
  const paid = b.paid === undefined || b.paid === "" ? 0 : money(b.paid, "Uang muka");
  if (paid > total) throw new HttpError(400, "Uang muka tidak boleh lebih besar dari total");

  assertFree(await all("bookings", { fresh: true }), item.id, b.startDate, b.endDate);

  // Sewa/rental yang mulai hari ini atau sebelumnya langsung berjalan. Booking menunggu sampai dimulai
  const today = dayKey(now());
  const status: BookingStatus = kind !== "booking" && b.startDate <= today ? "active" : "booked";
  const id = uid(), t = now();
  await add("bookings", {
    id, storeId: s.storeId, branchId, itemId: item.id, itemName: item.name, kind, customerName, phone,
    startDate: b.startDate, endDate: b.endDate, days: String(days), pricePerDay: String(pricePerDay), total: String(total), paid: String(paid),
    status, note: String(b.note ?? "").trim().slice(0, 200), createdById: s.uid, createdByName: s.name, createdAt: t, updatedAt: t, profitRate: String(readProfitRate(item.profitRate)),
  });
  return { ok: true, id, days, total, status };
});

// action: start | finish | cancel | pay | extend
export const PATCH = handle(async (req) => {
  const s = await need([...ROLES]);
  const b = await req.json();
  const rows = await all("bookings", { fresh: true });
  const r = rows.find((x) => x.id === b.id && x.storeId === s.storeId && (s.role === "kepala_toko" || x.branchId === s.branchId));
  if (!r) throw new HttpError(404, "Data tidak ditemukan");
  const patch: R = { updatedAt: now() };

  switch (b.action) {
    case "start":
      if (r.status !== "booked") throw new HttpError(409, "Hanya booking berstatus Dipesan yang bisa dimulai");
      patch.status = "active";
      break;
    case "finish":
      if (r.status !== "active") throw new HttpError(409, "Hanya yang berstatus Berjalan yang bisa diselesaikan");
      patch.status = "returned";
      break;
    case "cancel":
      if (!occupies(r.status)) throw new HttpError(409, "Data ini sudah selesai atau dibatalkan");
      patch.status = "cancelled";
      break;
    case "pay": {
      if (r.status === "cancelled") throw new HttpError(409, "Booking yang dibatalkan tidak bisa menerima pembayaran");
      const amount = money(b.amount, "Jumlah bayar");
      if (!(amount > 0)) throw new HttpError(400, "Jumlah bayar harus lebih dari 0");
      const paid = (Number(r.paid) || 0) + amount;
      if (paid > (Number(r.total) || 0)) throw new HttpError(400, "Pembayaran melebihi sisa tagihan");
      patch.paid = String(paid);
      break;
    }
    case "extend": {
      if (!occupies(r.status)) throw new HttpError(409, "Hanya yang berstatus Dipesan atau Berjalan yang bisa diubah tanggalnya");
      if (!isDate(b.endDate)) throw new HttpError(400, "Tanggal selesai tidak valid");
      const { days, total } = calcRental(r.startDate, b.endDate, Number(r.pricePerDay) || 0);
      if (!days) throw new HttpError(400, "Tanggal selesai tidak boleh sebelum tanggal mulai");
      if (days > MAX_DAYS) throw new HttpError(400, `Maksimal ${MAX_DAYS} hari per booking`);
      if (total < (Number(r.paid) || 0)) throw new HttpError(400, "Total baru lebih kecil dari yang sudah dibayar. Kembalikan selisihnya dulu lalu hubungi kepala toko");
      assertFree(rows, r.itemId, r.startDate, b.endDate, r.id);
      patch.endDate = b.endDate; patch.days = String(days); patch.total = String(total);
      break;
    }
    default:
      throw new HttpError(400, "Aksi tidak dikenal");
  }
  await update("bookings", r.id, patch);
  return { ok: true };
});
