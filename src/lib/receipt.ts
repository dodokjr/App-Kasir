import { all, type Row } from "./sheets";
import { normBusiness } from "./business";
import type { ReceiptData } from "./types";

export async function buildReceipt(tx: Row): Promise<ReceiptData> {
  const [stores, branches, items] = await Promise.all([all("stores"), all("branches"), all("transaction_items")]);
  const store = stores.find((x) => x.id === tx.storeId);
  const branch = branches.find((x) => x.id === tx.branchId);
  return {
    invoice: tx.invoice,
    storeName: store?.name ?? "",
    branchName: branch?.name ?? "",
    street: branch?.street ?? "",
    cashierName: tx.cashierName,
    createdAt: tx.createdAt,
    items: items.filter((i) => i.transactionId === tx.id).map((i) => ({
      name: i.name, price: Number(i.price), qty: Number(i.qty), subtotal: Number(i.subtotal),
      unit: i.unit || "pcs", note: i.note || "",
    })),
    total: Number(tx.total), paid: Number(tx.paid), change: Number(tx.change),
    subtotal: tx.subtotal ? Number(tx.subtotal) : Number(tx.total),
    taxAmount: Number(tx.taxAmount) || 0, taxRate: Number(tx.taxRate) || 0, taxMode: tx.taxMode || "",
    businessType: normBusiness(store?.businessType),
    // Transaksi lama (sebelum ada metode pembayaran) dianggap tunai
    paymentKey: tx.paymentKey || "cash", paymentLabel: tx.paymentLabel || "Cash", paymentRef: tx.paymentRef || "",
    orderType: tx.orderType || "", tableNo: tx.tableNo || "", customerName: tx.customerName || "", orderNo: tx.orderNo || "",
  };
}