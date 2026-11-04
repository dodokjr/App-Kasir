import type { BusinessType } from "./business";

export type ReceiptItem = { name: string; price: number; qty: number; subtotal: number; unit: string; note: string };

export type ReceiptData = {
  invoice: string; storeName: string; branchName: string; street: string; cashierName: string; createdAt: string;
  items: ReceiptItem[];
  total: number; paid: number; change: number;
  businessType: BusinessType;
  paymentKey: string; paymentLabel: string; paymentRef: string;
  orderType: string; tableNo: string; customerName: string; orderNo: string;
};
export type Me = {
  session: { uid: string; name: string; role: string; storeId: string; branchId: string };
  store: { name: string; businessType: BusinessType } | null;
  branch: { name: string; street: string } | null;
};
