// Aman dipakai di browser maupun server

export type BusinessType = "fnb" | "retail" | "sembako" | "lainnya";

export const BUSINESS_TYPES: { key: BusinessType; label: string; desc: string; defaultUnit: string }[] = [
  { key: "fnb", label: "F&B (makanan dan minuman)", desc: "Restoran, kafe, warung makan. Ada nomor meja, nama customer, nomor pesanan, dan struk dapur.", defaultUnit: "porsi" },
  { key: "retail", label: "Retail (jualan barang)", desc: "Toko pakaian, elektronik, kelontong kemasan, dan barang lain yang dijual per buah.", defaultUnit: "pcs" },
  { key: "sembako", label: "Sembako (kiloan dan sayuran)", desc: "Beras, sayur, buah, telur. Jumlah dihitung per kg mulai dari 0,1 kg.", defaultUnit: "kg" },
  { key: "lainnya", label: "Lainnya", desc: "Jenis usaha lain. Kasir berjalan seperti retail.", defaultUnit: "pcs" },
];

export const isBusinessType = (v: unknown): v is BusinessType => BUSINESS_TYPES.some((b) => b.key === v);
export const normBusiness = (v: unknown): BusinessType => (isBusinessType(v) ? v : "retail");

// step = kelipatan jumlah terkecil. kg dan liter boleh desimal mulai 0,1
export const UNITS: { key: string; label: string; step: number }[] = [
  { key: "pcs", label: "pcs", step: 1 },
  { key: "porsi", label: "porsi", step: 1 },
  { key: "pack", label: "pack", step: 1 },
  { key: "kg", label: "kg", step: 0.1 },
  { key: "liter", label: "liter", step: 0.1 },
];
export const unitOf = (u?: string) => UNITS.find((x) => x.key === u) ?? UNITS[0];
export const stepOf = (u?: string) => unitOf(u).step;

// Hindari 0.1 + 0.2 = 0.30000000000000004
export const roundQty = (n: number) => Math.round(n * 1000) / 1000;
// Subtotal selalu dibulatkan ke rupiah utuh, dipakai sama persis di browser dan server
export const lineTotal = (price: number, qty: number) => Math.round(price * qty);
export const fmtQty = (n: number) => String(roundQty(n)).replace(".", ",");
// Terima "0,5" maupun "0.5"
export const parseQty = (s: string) => Number(String(s).replace(",", "."));
// Apakah qty kelipatan step (0,1 kg, 0,2 kg, dst.)
export const validQty = (qty: number, step: number) => {
  if (!(qty > 0) || !isFinite(qty)) return false;
  const k = qty / step;
  return Math.abs(k - Math.round(k)) < 1e-6 && Math.round(k) >= 1;
};

export const ORDER_TYPES = [
  { key: "dine_in", label: "Makan di tempat" },
  { key: "take_away", label: "Bawa pulang" },
] as const;
export type OrderType = (typeof ORDER_TYPES)[number]["key"];
export const orderTypeLabel = (k?: string) => ORDER_TYPES.find((o) => o.key === k)?.label ?? "";

// ---- Metode pembayaran ----
export type PayGroup = "cash" | "bank" | "qris" | "online" | "kurir" | "lain";
export type PayPreset = { key: string; label: string; group: PayGroup; hint?: BusinessType[] };

export const CASH_KEY = "cash";
export const TRANSFER_KEY = "transfer";
// Cash dan transfer bank adalah metode utama: selalu ada dan tidak bisa dinonaktifkan
export const LOCKED_KEYS = [CASH_KEY, TRANSFER_KEY];

export const PAYMENT_PRESETS: PayPreset[] = [
  { key: CASH_KEY, label: "Cash", group: "cash" },
  { key: TRANSFER_KEY, label: "Transfer bank", group: "bank" },
  { key: "qris", label: "QRIS", group: "qris" },
  { key: "shopeefood", label: "ShopeeFood", group: "online", hint: ["fnb"] },
  { key: "gofood", label: "GoFood", group: "online", hint: ["fnb"] },
  { key: "grabfood", label: "GrabFood", group: "online", hint: ["fnb"] },
  { key: "gosend", label: "GoSend", group: "kurir", hint: ["retail", "sembako", "lainnya"] },
  { key: "grab_barang", label: "Grab Barang", group: "kurir", hint: ["retail", "sembako", "lainnya"] },
  { key: "paket", label: "Paket / ekspedisi", group: "kurir", hint: ["retail", "lainnya"] },
];

export const DEFAULT_ACTIVE = [CASH_KEY, TRANSFER_KEY, "qris"];
export const isCash = (key?: string) => !key || key === CASH_KEY;

export type PayMethod = { id: string; key: string; label: string; group: PayGroup; active: boolean; locked: boolean };

export const GROUP_LABEL: Record<PayGroup, string> = {
  cash: "Tunai", bank: "Bank", qris: "QRIS", online: "Pesan antar", kurir: "Kurir / paket", lain: "Lainnya",
};
