// Booking, sewa, dan rental. Aman dipakai di browser maupun server.
// Tanggal selalu berupa teks YYYY-MM-DD (WIB). Hari dihitung TERMASUK hari mulai dan hari selesai:
// 10 s/d 12 = 3 hari.

export type RentalKind = "booking" | "sewa" | "rental";
export const KINDS: { key: RentalKind; label: string; desc: string }[] = [
  { key: "booking", label: "Booking", desc: "Pesan jadwal di muka (kamar, lapangan, studio). Belum dipakai sampai hari H." },
  { key: "sewa", label: "Sewa", desc: "Sewa ruang atau barang (tenda, alat pesta, kamar kos harian)." },
  { key: "rental", label: "Rental", desc: "Rental kendaraan atau alat (mobil, motor, kamera, genset)." },
];
export const isKind = (v: unknown): v is RentalKind => KINDS.some((k) => k.key === v);
export const kindLabel = (k?: string) => KINDS.find((x) => x.key === k)?.label ?? "Booking";

export type BookingStatus = "booked" | "active" | "returned" | "cancelled";
export const STATUSES: { key: BookingStatus; label: string }[] = [
  { key: "booked", label: "Dipesan" },
  { key: "active", label: "Berjalan" },
  { key: "returned", label: "Selesai" },
  { key: "cancelled", label: "Batal" },
];
export const statusLabel = (s?: string) => STATUSES.find((x) => x.key === s)?.label ?? "Dipesan";
/** Hanya booking yang dipesan atau berjalan yang menempati jadwal unit */
export const occupies = (s?: string) => s === "booked" || s === "active";

// Tipe unit: kamar, mobil, motor, barang, atau lainnya. Hanya penanda, tidak mengubah hitungan harga
export type UnitType = "kamar" | "mobil" | "motor" | "barang" | "lainnya";
export const UNIT_TYPES: { key: UnitType; label: string }[] = [
  { key: "kamar", label: "Kamar" }, { key: "mobil", label: "Mobil" }, { key: "motor", label: "Motor" },
  { key: "barang", label: "Barang" }, { key: "lainnya", label: "Lainnya" },
];
export const isUnitType = (v: unknown): v is UnitType => UNIT_TYPES.some((u) => u.key === v);
export const unitTypeLabel = (k?: string) => UNIT_TYPES.find((u) => u.key === k)?.label ?? "Lainnya";

export type RentalItem = {
  id: string; branchId: string; name: string; kind: RentalKind; pricePerDay: number; note: string; active: boolean;
  /** Persen keuntungan dari total sewa (bawaan 15) */
  profitRate: number;
  category: UnitType;
};
export type Booking = {
  id: string; branchId: string; itemId: string; itemName: string; kind: RentalKind;
  customerName: string; phone: string; startDate: string; endDate: string; days: number;
  pricePerDay: number; total: number; paid: number; status: BookingStatus; note: string;
  createdByName: string; createdAt: string; updatedAt: string;
  /** Persen keuntungan yang berlaku saat booking dibuat */
  profitRate: number;
};

// ---- Skema keuntungan ----
// Keuntungan = persen tertentu dari total sewa (bawaan 15%). Persen disalin ke booking saat dibuat,
// jadi mengubah persen di unit tidak mengubah booking lama. Harga yang dibayar penyewa tidak berubah.
export const DEFAULT_PROFIT_RATE = 15;
/** Persen 0-100, maksimal 2 desimal. NaN bila tidak valid. Kosong = bawaan */
export function normProfitRate(v: unknown) {
  if (v === undefined || v === null || String(v).trim() === "") return DEFAULT_PROFIT_RATE;
  const n = Math.round(Number(String(v).replace(",", ".")) * 100) / 100;
  return isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
}
/** Baca dari Sheets. Data lama (kolom kosong) memakai bawaan 15% */
export const readProfitRate = (v: unknown) => { const n = normProfitRate(v); return isNaN(n) ? DEFAULT_PROFIT_RATE : n; };
/** Keuntungan dalam rupiah utuh dan sisanya sebagai modal/biaya. Sama persis di browser dan server */
export function calcProfit(total: number, rate: number) {
  const profit = Math.round((Math.max(0, total) * Math.min(100, Math.max(0, rate))) / 100);
  return { profit, cost: Math.max(0, total) - profit };
}
export const fmtRate = (n: number) => String(n).replace(".", ",");

// ---- Status unit (note: sedang disewa / dibooking / dirental / kosong) ----
export type UnitState = {
  state: "free" | "used" | "booked";
  /** Yang sedang memakai unit (used) atau yang sudah memesan untuk hari ini (booked) */
  current?: Booking;
  /** Booking berikutnya yang akan datang (setelah hari ini) */
  next?: Booking;
  /** Sedang dipakai tetapi sudah lewat tanggal selesai */
  late: boolean;
};
/** Status satu unit pada tanggal `today` (YYYY-MM-DD). Hanya booking Dipesan/Berjalan yang dihitung */
export function unitState(itemId: string, bookings: Booking[], today: string): UnitState {
  const mine = bookings.filter((b) => b.itemId === itemId && occupies(b.status)).sort((a, b) => a.startDate.localeCompare(b.startDate));
  // Berjalan dan sudah mulai: masih dipakai walau lewat tanggal selesai (belum dikembalikan)
  const used = mine.find((b) => b.status === "active" && b.startDate <= today);
  const booked = mine.find((b) => b.status === "booked" && b.startDate <= today && b.endDate >= today);
  const current = used ?? booked;
  const next = mine.find((b) => b !== current && b.startDate > today);
  return { state: used ? "used" : booked ? "booked" : "free", current, next, late: !!used && used.endDate < today };
}
/** Teks note status, misalnya "Sedang disewa" atau "Sudah dibooking" */
export function stateLabel(st: UnitState) {
  if (st.state === "free") return "Kosong, bisa dipakai";
  if (st.state === "booked") return "Sudah dibooking";
  return st.current?.kind === "rental" ? "Sedang dirental" : st.current?.kind === "sewa" ? "Sedang disewa" : "Sedang dipakai (booking)";
}

export const MAX_DAYS = 366;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(s: unknown): s is string {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  const t = Date.parse(s + "T00:00:00Z");
  return !isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
}
/** Jumlah hari termasuk hari mulai dan hari selesai. 0 bila tanggal tidak valid atau terbalik */
export function daysInclusive(start: string, end: string) {
  if (!isDate(start) || !isDate(end)) return 0;
  const n = Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / 864e5) + 1;
  return n >= 1 ? n : 0;
}
/** Harga sewa = jumlah hari x harga per hari (rupiah utuh). Dipakai sama persis di browser dan server */
export function calcRental(start: string, end: string, pricePerDay: number) {
  const days = daysInclusive(start, end);
  return { days, total: days * Math.max(0, Math.round(pricePerDay || 0)) };
}
/** Dua rentang tanggal (termasuk ujung) saling bertabrakan */
export const overlaps = (aS: string, aE: string, bS: string, bE: string) => aS <= bE && aE >= bS;

export const addDay = (key: string, n: number) => new Date(Date.parse(key + "T00:00:00Z") + n * 864e5).toISOString().slice(0, 10);

export type PayState = "lunas" | "dp" | "belum";
export const payState = (paid: number, total: number): PayState => (total > 0 && paid >= total ? "lunas" : paid > 0 ? "dp" : total === 0 ? "lunas" : "belum");
export const PAY_LABEL: Record<PayState, string> = { lunas: "Lunas", dp: "Sebagian (DP)", belum: "Belum dibayar" };

export const fmtDate = (d: string) => (isDate(d) ? new Date(d + "T00:00:00Z").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "-");
export const fmtRange = (s: string, e: string) => (s === e ? fmtDate(s) : `${fmtDate(s)} – ${fmtDate(e)}`);

// ---- Nota (struk) booking, sewa, dan rental ----
export type NotaInfo = { storeName: string; branchName: string; street: string };
/** Nomor nota, mis. SWA-20261124-A1B2. Dibentuk dari tanggal buat (WIB) dan id, jadi selalu sama untuk booking yang sama */
export function notaNo(b: Pick<Booking, "kind" | "id" | "createdAt">) {
  const p = b.kind === "sewa" ? "SWA" : b.kind === "rental" ? "RTL" : "BKG";
  const t = Date.parse(b.createdAt);
  const d = isNaN(t) ? "00000000" : new Date(t).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }).replace(/-/g, "");
  return `${p}-${d}-${b.id.replace(/[^a-z0-9]/gi, "").slice(0, 4).toUpperCase()}`;
}
/** Teks "lunas" atau sisa tagihan untuk nota */
export const notaPayLine = (b: Pick<Booking, "paid" | "total">) => {
  const left = Math.max(0, b.total - b.paid);
  return { left, state: payState(b.paid, b.total) };
};
