"use client";
import { useEffect, useState } from "react";
import { api, rp, tgl } from "@/lib/client";
import type { ShiftOut } from "@/lib/shiftTypes";
import { Center, Dash, Frame, Row } from "@/components/Receipt";
import { fmtQty } from "@/lib/business";
import { DEFAULT_SETTINGS, type ReceiptSettings } from "@/lib/receiptSettings";

export default function ShiftReportModal({ shift, onClose }: { shift: ShiftOut; onClose: () => void }) {
  const [st, setSt] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  useEffect(() => { api<ReceiptSettings>("/api/receipt-settings").then(setSt).catch(() => {}); }, []);
  useEffect(() => { document.body.dataset.print = "customer"; return () => { delete document.body.dataset.print; }; }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const d = shift.difference;
  const verdict = d === null ? "-" : d === 0 ? "Pas" : d > 0 ? `Lebih ${rp(d)}` : `Kurang ${rp(-d)}`;

  return (
    <div className="print-reset fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Laporan tutup kasir">
      <div className="print-reset card flex max-h-full w-full max-w-sm flex-col gap-3 overflow-y-auto">
        <div className="print-area"><Frame paper={st.paper}>
          <Center bold>{st.storeName || "Nama Toko"}</Center>
          <Center>{shift.branchName}</Center>
          <Center bold>LAPORAN TUTUP KASIR</Center>
          <Dash />
          <Row a="Kasir" b={shift.cashierName} />
          <Row a="Buka" b={tgl(shift.openedAt)} />
          <Row a="Tutup" b={shift.closedAt ? tgl(shift.closedAt) : "Belum ditutup"} />
          <Dash />
          <div className="font-medium">Barang terjual</div>
          {shift.items.map((i) => (
            <div key={i.productId || i.name} className="mb-1">
              <div>{i.name}</div>
              <Row a={`${fmtQty(i.qty)} ${i.unit || "pcs"}`} b={rp(i.subtotal)} />
            </div>
          ))}
          {!shift.items.length && <div>Tidak ada penjualan</div>}
          <Dash />
          <Row a="Jumlah transaksi" b={shift.txCount} />
          <Row a="Total item" b={shift.itemsSold} />
          <Row a="Total penjualan" b={rp(shift.totalSales)} bold />
          {shift.payments.length > 0 && (
            <>
              <Dash />
              <div className="font-medium">Per metode pembayaran</div>
              {shift.payments.map((p) => <Row key={p.key} a={`${p.label} (${p.count})`} b={rp(p.total)} />)}
            </>
          )}
          <Dash />
          <Row a="Modal awal" b={rp(shift.openingCash)} />
          <Row a="Penjualan tunai" b={rp(shift.cashSales)} />
          <Row a="Kas seharusnya" b={rp(shift.expectedCash)} bold />
          <Row a="Kas dihitung" b={shift.countedCash === null ? "-" : rp(shift.countedCash)} />
          <Row a="Selisih" b={verdict} bold />
          {shift.note && <><Dash /><div>Catatan: {shift.note}</div></>}
          <Dash />
          <Center>Dicetak {tgl(new Date().toISOString())}</Center>
        </Frame></div>
        <div className="no-print flex gap-2">
          <button className="btn-primary flex-1" onClick={() => window.print()}>Cetak laporan</button>
          <button className="btn-ghost flex-1" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
