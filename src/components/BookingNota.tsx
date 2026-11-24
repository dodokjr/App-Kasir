"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Frame, Dash, Row, Center } from "./Receipt";
import { api, rp, tgl } from "@/lib/client";
import { downloadBookingPdf } from "@/lib/pdf";
import { DEFAULT_SETTINGS, type ReceiptSettings } from "@/lib/receiptSettings";
import { loadReceiptSettings, saveReceiptSettings } from "@/lib/offline";
import { fmtDate, kindLabel, notaNo, notaPayLine, statusLabel, type Booking, type NotaInfo } from "@/lib/rental";

/** Nota untuk pelanggan. Sengaja tanpa keuntungan dan modal, karena itu hanya untuk pengelola */
export function BookingNota({ b, info, settings = DEFAULT_SETTINGS }: { b: Booking; info: NotaInfo; settings?: ReceiptSettings }) {
  const s = settings;
  const { left, state } = notaPayLine(b);
  return (
    <Frame paper={s.paper} kind="customer">
      <Center bold>{s.storeName || info.storeName}</Center>
      {info.branchName && <Center>Cabang {info.branchName}</Center>}
      {info.street && <Center>{info.street}</Center>}
      {s.address && <Center>{s.address}</Center>}
      {s.phone && <Center>Telp {s.phone}</Center>}
      {s.header && <><Dash /><Center>{s.header}</Center></>}
      <Dash />
      <Center bold>NOTA {kindLabel(b.kind).toUpperCase()}</Center>
      <Dash />
      <Row a="No" b={notaNo(b)} />
      <Row a="Dibuat" b={tgl(b.createdAt)} />
      {b.createdByName && <Row a="Kasir" b={b.createdByName} />}
      <Row a="Status" b={statusLabel(b.status)} />
      <Dash />
      <Row a="Pelanggan" b={b.customerName} />
      {b.phone && <Row a="Telepon" b={b.phone} />}
      <Dash />
      <div className="font-medium">{b.itemName}</div>
      <Row a="Mulai" b={fmtDate(b.startDate)} />
      <Row a="Selesai" b={fmtDate(b.endDate)} />
      <Row a={`${b.days} hari x ${rp(b.pricePerDay)}`} b={rp(b.total)} />
      {b.note && <div className="mt-1 whitespace-pre-wrap">Catatan: {b.note}</div>}
      <Dash />
      <Row a="Total" b={rp(b.total)} bold />
      <Row a="Dibayar" b={rp(b.paid)} />
      <Row a={state === "lunas" ? "Status bayar" : "Sisa tagihan"} b={state === "lunas" ? "LUNAS" : rp(left)} bold />
      {s.footer && <div className="mt-3"><Center>{s.footer}</Center></div>}
    </Frame>
  );
}

export default function BookingNotaModal({ b, info, onClose }: { b: Booking; info: NotaInfo; onClose: () => void }) {
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [busy, setBusy] = useState(false);

  // Pengaturan struk (nama toko, alamat, footer, lebar kertas) sama dengan struk penjualan
  useEffect(() => {
    api<ReceiptSettings>("/api/receipt-settings").then((r) => { saveReceiptSettings(r); setSettings(r); })
      .catch(() => setSettings(loadReceiptSettings<ReceiptSettings>() ?? DEFAULT_SETTINGS));
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const print = () => {
    document.body.dataset.print = "customer";
    const clear = () => { delete document.body.dataset.print; window.removeEventListener("afterprint", clear); };
    window.addEventListener("afterprint", clear);
    window.print();
  };
  const st = settings ?? DEFAULT_SETTINGS;

  // Dipasang di <body> agar posisi cetak tidak terpengaruh kartu booking di sekitarnya
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="print-reset fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Nota">
      <div className="print-reset max-h-full w-full max-w-sm overflow-auto rounded-lg bg-paper p-4">
        {settings ? <div className="print-area"><BookingNota b={b} info={info} settings={st} /></div> : <p className="text-sm text-muted">Memuat nota…</p>}
        <div className="no-print mt-4 space-y-2">
          <button className="btn-primary w-full" disabled={!settings} onClick={print}>Cetak nota</button>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={busy || !settings} onClick={async () => { setBusy(true); await downloadBookingPdf(b, info, st); setBusy(false); }}>{busy ? "Membuat…" : "Unduh PDF"}</button>
            <button className="btn-ghost" onClick={onClose}>Tutup</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}