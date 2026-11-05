import type { ReceiptData } from "./types";
import { calcTax, type TaxConfig } from "./business";

export type ReceiptSettings = {
  storeName: string; address: string; phone: string; header: string; footer: string;
  paper: "58" | "80"; showInvoice: boolean; showCashier: boolean; showPayment: boolean; autoPrint: boolean;
};

export const DEFAULT_SETTINGS: ReceiptSettings = {
  storeName: "", address: "", phone: "", header: "", footer: "Terima kasih",
  paper: "80", showInvoice: true, showCashier: true, showPayment: true, autoPrint: false,
};

export const SAMPLE_RECEIPT: ReceiptData = {
  invoice: "INV-20261104-MEL-0001", storeName: "Toko Contoh", branchName: "Melati", street: "Jl. Melati 12",
  cashierName: "Contoh Kasir", createdAt: new Date().toISOString(),
  items: [
    { name: "Kopi susu 250 ml", price: 18000, qty: 2, subtotal: 36000, unit: "porsi", note: "kurang manis" },
    { name: "Roti cokelat", price: 12000, qty: 1, subtotal: 12000, unit: "porsi", note: "" },
  ],
  total: 48000, paid: 50000, change: 2000, subtotal: 48000, taxAmount: 0, taxRate: 0, taxMode: "",
  businessType: "fnb", paymentKey: "cash", paymentLabel: "Cash", paymentRef: "",
  orderType: "dine_in", tableNo: "5", customerName: "Budi", orderNo: "01",
};

// Contoh untuk toko non-F&B (tanpa nomor meja dan struk dapur)
export const sampleFor = (type: ReceiptData["businessType"]): ReceiptData =>
  type === "fnb" ? SAMPLE_RECEIPT : {
    ...SAMPLE_RECEIPT, businessType: type, orderType: "", tableNo: "", customerName: "", orderNo: "",
    items: type === "sembako"
      ? [{ name: "Beras premium", price: 14000, qty: 2.5, subtotal: 35000, unit: "kg", note: "" }, { name: "Tomat", price: 12000, qty: 0.3, subtotal: 3600, unit: "kg", note: "" }]
      : [{ name: "Kaos polos", price: 65000, qty: 1, subtotal: 65000, unit: "pcs", note: "" }],
    total: type === "sembako" ? 38600 : 65000, paid: type === "sembako" ? 40000 : 70000, change: type === "sembako" ? 1400 : 5000,
    subtotal: type === "sembako" ? 38600 : 65000,
  };

// Terapkan pengaturan PPN ke struk contoh agar pratinjau sama dengan hasil nyata
export function withTax(r: ReceiptData, t: TaxConfig): ReceiptData {
  const sub = r.items.reduce((a, i) => a + i.subtotal, 0);
  const c = calcTax(sub, t);
  const paid = Math.ceil(c.total / 10000) * 10000;
  return { ...r, subtotal: sub, taxAmount: c.tax, taxRate: t.enabled ? t.rate : 0, taxMode: t.enabled ? t.mode : "", total: c.total, paid, change: paid - c.total };
}