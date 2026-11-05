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
  { key: "take_away", label: "Bungkus / bawa pulang" },
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

// ---- PPN (pajak) ----
// exclusive = PPN ditambahkan di atas harga. inclusive = harga di produk sudah termasuk PPN.
export type TaxMode = "exclusive" | "inclusive";
export type TaxConfig = { enabled: boolean; rate: number; mode: TaxMode };
export const DEFAULT_TAX: TaxConfig = { enabled: false, rate: 12, mode: "exclusive" };
// Pilihan cepat tarif di Pengaturan (tarif tetap bisa diisi bebas)
export const TAX_PRESETS = [11, 12];

export const normRate = (v: unknown) => {
  const n = Math.round(Number(String(v).replace(",", ".")) * 100) / 100;
  return isFinite(n) && n >= 0 && n <= 100 ? n : NaN;
};
// Baca dari baris toko di Sheets. Toko lama (kolom kosong) = PPN nonaktif
export function parseTax(r?: Record<string, string>): TaxConfig {
  const rate = normRate(r?.ppnRate || DEFAULT_TAX.rate);
  return {
    enabled: r?.ppnEnabled === "TRUE",
    rate: isNaN(rate) ? DEFAULT_TAX.rate : rate,
    mode: r?.ppnMode === "inclusive" ? "inclusive" : "exclusive",
  };
}
/** Dipakai sama persis di browser dan server. `total` = jumlah yang dibayar customer */
export function calcTax(subtotal: number, t: TaxConfig) {
  if (!t.enabled || !(t.rate > 0)) return { subtotal, tax: 0, total: subtotal };
  if (t.mode === "inclusive") return { subtotal, tax: Math.round(subtotal - subtotal / (1 + t.rate / 100)), total: subtotal };
  const tax = Math.round((subtotal * t.rate) / 100);
  return { subtotal, tax, total: subtotal + tax };
}
export const fmtRate = (n: number) => String(n).replace(".", ",");

// ---- Aplikasi pesan antar makanan ----
// Hanya untuk toko F&B. Pesanannya otomatis dibungkus (tanpa meja) dan tidak muncul di jenis usaha lain
export const FOOD_APPS = ["shopeefood", "gofood", "grabfood"];
const FOOD_NAMES = ["shopeefood", "shopee food", "gofood", "go food", "grabfood", "grab food"];
export const isFoodDelivery = (key?: string) => !!key && FOOD_APPS.includes(key);
/** Nama bebas yang meniru aplikasi makanan, misalnya "Go-Food" atau "grab food" */
export const looksLikeFoodApp = (label: string) => FOOD_NAMES.includes(label.toLowerCase().replace(/[^a-z ]/g, "").trim());
/** Apakah metode ini boleh dipakai di jenis usaha tersebut */
export const methodAllowed = (biz: BusinessType, key: string, label = "") =>
  biz === "fnb" || !(isFoodDelivery(key) || looksLikeFoodApp(label));