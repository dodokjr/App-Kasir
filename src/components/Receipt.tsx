import type { ReactNode } from "react";
import type { ReceiptData } from "@/lib/types";
import { rp, tgl } from "@/lib/client";
import { DEFAULT_SETTINGS, type ReceiptSettings } from "@/lib/receiptSettings";
import { fmtQty, isCash, orderTypeLabel } from "@/lib/business";

// Kertas struk selalu putih (juga di mode gelap) agar sama dengan hasil cetak.
// `kind` dipakai CSS cetak untuk memilih struk customer / dapur.
export function Frame({ paper, children, kind = "customer" }: { paper: "58" | "80"; children: ReactNode; kind?: "customer" | "kitchen" }) {
  const w = paper === "58" ? "58mm" : "80mm";
  return (
    <>
      <style>{`@media print{@page{size:${w} auto;margin:0}}`}</style>
      <div style={{ width: w }}
        className={`ticket ticket-${kind} mx-auto max-w-full rounded border border-line bg-white p-4 font-mono leading-5 text-black ${paper === "58" ? "text-[11px]" : "text-xs"}`}>
        {children}
      </div>
    </>
  );
}
export const Dash = () => <hr className="my-2 border-dashed border-black/50" />;
export function Row({ a, b, bold }: { a: ReactNode; b: ReactNode; bold?: boolean }) {
  return <div className={`flex justify-between gap-2 ${bold ? "font-medium" : ""}`}><span>{a}</span><span className="text-right">{b}</span></div>;
}
export const Center = ({ children, bold }: { children: ReactNode; bold?: boolean }) =>
  <div className={`whitespace-pre-wrap text-center ${bold ? "text-sm font-medium" : ""}`}>{children}</div>;

// "Customer #01" bila nama kosong, "Budi" bila diisi
export const customerLabel = (r: Pick<ReceiptData, "customerName" | "orderNo">) =>
  r.customerName || (r.orderNo ? `Customer #${r.orderNo}` : "");

/** Struk untuk customer */
export default function Receipt({ r, settings = DEFAULT_SETTINGS }: { r: ReceiptData; settings?: ReceiptSettings }) {
  const s = settings;
  const fnb = r.businessType === "fnb";
  return (
    <Frame paper={s.paper} kind="customer">
      <Center bold>{s.storeName || r.storeName}</Center>
      <Center>Cabang {r.branchName}</Center>
      <Center>{r.street}</Center>
      {s.address && <Center>{s.address}</Center>}
      {s.phone && <Center>Telp {s.phone}</Center>}
      {s.header && <><Dash /><Center>{s.header}</Center></>}
      <Dash />
      {s.showInvoice && <Row a="No" b={r.invoice} />}
      <Row a="Tanggal" b={tgl(r.createdAt)} />
      {s.showCashier && <Row a="Kasir" b={r.cashierName} />}
      {fnb && r.orderNo && <Row a="Pesanan" b={`#${r.orderNo}`} />}
      {fnb && r.customerName && <Row a="Customer" b={r.customerName} />}
      {fnb && r.orderType && <Row a="Jenis" b={orderTypeLabel(r.orderType)} />}
      {fnb && r.tableNo && <Row a="Meja" b={r.tableNo} />}
      <Dash />
      {r.items.map((i, n) => (
        <div key={n} className="mb-1">
          <div>{i.name}</div>
          {i.note && <div className="pl-2 text-[0.9em]">* {i.note}</div>}
          <Row a={`${fmtQty(i.qty)} ${i.unit === "pcs" ? "x" : i.unit + " x"} ${rp(i.price)}`} b={rp(i.subtotal)} />
        </div>
      ))}
      <Dash />
      <Row a="Total" b={rp(r.total)} bold />
      <Row a="Pembayaran" b={r.paymentLabel} />
      {r.paymentRef && <Row a="Ref" b={r.paymentRef} />}
      {s.showPayment && isCash(r.paymentKey) && <><Row a="Bayar" b={rp(r.paid)} /><Row a="Kembali" b={rp(r.change)} /></>}
      {s.footer && <div className="mt-3"><Center>{s.footer}</Center></div>}
    </Frame>
  );
}

/** Struk untuk dapur: tanpa harga, jumlah dan catatan dibuat besar agar mudah dibaca */
export function KitchenTicket({ r, settings = DEFAULT_SETTINGS }: { r: ReceiptData; settings?: ReceiptSettings }) {
  return (
    <Frame paper={settings.paper} kind="kitchen">
      <Center bold>STRUK DAPUR</Center>
      <Center>{settings.storeName || r.storeName} · {r.branchName}</Center>
      <Dash />
      {r.orderNo && <div className="text-center text-2xl font-bold leading-8">#{r.orderNo}</div>}
      <Row a="Jenis" b={orderTypeLabel(r.orderType) || "-"} bold />
      {r.tableNo && <Row a="Meja" b={<span className="text-base font-bold">{r.tableNo}</span>} bold />}
      {customerLabel(r) && <Row a="Customer" b={customerLabel(r)} />}
      <Row a="Waktu" b={tgl(r.createdAt)} />
      <Row a="Kasir" b={r.cashierName} />
      <Dash />
      {r.items.map((i, n) => (
        <div key={n} className="mb-2">
          <div className="flex gap-2 text-sm font-bold"><span className="min-w-[3ch]">{fmtQty(i.qty)}x</span><span>{i.name}</span></div>
          {i.note && <div className="pl-[4ch] font-medium">* {i.note}</div>}
        </div>
      ))}
      <Dash />
      <Center>{r.invoice}</Center>
    </Frame>
  );
}
