import type { ReceiptData } from "./types";
import { DEFAULT_SETTINGS, type ReceiptSettings } from "./receiptSettings";
import { fmtQty, isCash, orderTypeLabel } from "./business";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const when = (iso: string) => new Date(iso).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });

type Doc = InstanceType<typeof import("jspdf").jsPDF>;

// Pembantu gambar: dipakai struk customer dan struk dapur
function tools(doc: Doc, W: number, M: number, start = 8) {
  let y = start;
  return {
    get y() { return y; },
    skip: (n: number) => { y += n; },
    center(t: string, size = 9, bold = false) {
      doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(size);
      doc.splitTextToSize(t, W - 2 * M).forEach((l: string) => { doc.text(l, W / 2, y, { align: "center" }); y += size * 0.45; });
    },
    lr(l: string, rt: string, bold = false, size = 8) {
      doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(size);
      doc.text(l, M, y); doc.text(rt, W - M, y, { align: "right" }); y += size * 0.5;
    },
    text(t: string, size = 8, bold = false, indent = 0) {
      doc.setFont("courier", bold ? "bold" : "normal"); doc.setFontSize(size);
      doc.splitTextToSize(t, W - 2 * M - indent).forEach((l: string) => { doc.text(l, M + indent, y); y += size * 0.45; });
    },
    rule() { doc.setLineWidth(0.1); doc.line(M, y - 2, W - M, y - 2); y += 2; },
  };
}

async function make(paper: "58" | "80", draw: (t: ReturnType<typeof tools>) => void, file: string) {
  const { jsPDF } = await import("jspdf");
  const W = paper === "58" ? 58 : 80, M = 4;
  // Gambar sekali untuk mengukur tinggi, lalu sekali lagi pada kertas dengan tinggi pas
  const probe = new jsPDF({ unit: "mm", format: [W, 2000] });
  const pt = tools(probe, W, M); draw(pt);
  const height = pt.y + 6;
  const doc = new jsPDF({ unit: "mm", format: [W, height] });
  draw(tools(doc, W, M));
  doc.save(file);
}

// Struk PDF lebar 58/80mm sesuai pengaturan, tinggi menyesuaikan isi
export async function downloadReceiptPdf(r: ReceiptData, s: ReceiptSettings = DEFAULT_SETTINGS) {
  const fnb = r.businessType === "fnb";
  await make(s.paper, (t) => {
    t.center(s.storeName || r.storeName, 11, true);
    t.center(`Cabang ${r.branchName}`, 8);
    t.center(r.street, 8);
    if (s.address) t.center(s.address, 8);
    if (s.phone) t.center(`Telp ${s.phone}`, 8);
    if (s.header) { t.skip(1); t.rule(); t.center(s.header, 8); }
    t.skip(2); t.rule();
    if (s.showInvoice) t.lr("No", r.invoice);
    t.lr("Tanggal", when(r.createdAt));
    if (s.showCashier) t.lr("Kasir", r.cashierName);
    if (fnb && r.orderNo) t.lr("Pesanan", `#${r.orderNo}`);
    if (fnb && r.customerName) t.lr("Customer", r.customerName);
    if (fnb && r.orderType) t.lr("Jenis", orderTypeLabel(r.orderType));
    if (fnb && r.tableNo) t.lr("Meja", r.tableNo);
    t.rule();
    r.items.forEach((i) => {
      t.text(i.name);
      if (i.note) t.text(`* ${i.note}`, 8, false, 2);
      t.lr(`${fmtQty(i.qty)} ${i.unit === "pcs" ? "x" : i.unit + " x"} ${rp(i.price)}`, rp(i.subtotal));
    });
    t.rule();
    t.lr("Total", rp(r.total), true);
    t.lr("Pembayaran", r.paymentLabel);
    if (r.paymentRef) t.lr("Ref", r.paymentRef);
    if (s.showPayment && isCash(r.paymentKey)) { t.lr("Bayar", rp(r.paid)); t.lr("Kembali", rp(r.change)); }
    if (s.footer) { t.skip(3); t.center(s.footer, 8); }
  }, `struk-${r.invoice}.pdf`);
}

// Struk dapur: tanpa harga
export async function downloadKitchenPdf(r: ReceiptData, s: ReceiptSettings = DEFAULT_SETTINGS) {
  await make(s.paper, (t) => {
    t.center("STRUK DAPUR", 11, true);
    t.center(`${s.storeName || r.storeName} - ${r.branchName}`, 8);
    t.skip(2); t.rule();
    if (r.orderNo) { t.center(`#${r.orderNo}`, 20, true); t.skip(2); }
    t.lr("Jenis", orderTypeLabel(r.orderType) || "-", true);
    if (r.tableNo) t.lr("Meja", r.tableNo, true, 11);
    const who = r.customerName || (r.orderNo ? `Customer #${r.orderNo}` : "");
    if (who) t.lr("Customer", who);
    t.lr("Waktu", when(r.createdAt));
    t.lr("Kasir", r.cashierName);
    t.rule();
    r.items.forEach((i) => {
      t.text(`${fmtQty(i.qty)}x ${i.name}`, 10, true);
      if (i.note) t.text(`* ${i.note}`, 9, true, 4);
      t.skip(1.5);
    });
    t.rule();
    t.center(r.invoice, 8);
  }, `dapur-${r.invoice}.pdf`);
}
