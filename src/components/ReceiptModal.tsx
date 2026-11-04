"use client";
import { useEffect, useRef, useState } from "react";
import Receipt, { KitchenTicket } from "./Receipt";
import type { ReceiptData } from "@/lib/types";
import { api } from "@/lib/client";
import { downloadReceiptPdf, downloadKitchenPdf } from "@/lib/pdf";
import { DEFAULT_SETTINGS, type ReceiptSettings } from "@/lib/receiptSettings";

type Which = "customer" | "kitchen" | "both";

// `fresh` = struk dari transaksi yang baru saja dibayar. Hanya itu yang boleh cetak otomatis,
// supaya membuka struk lama dari riwayat tidak langsung memunculkan dialog cetak.
export default function ReceiptModal({ receipt, onClose, fresh = false }: { receipt: ReceiptData; onClose: () => void; fresh?: boolean }) {
  const fnb = receipt.businessType === "fnb";
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<ReceiptSettings | null>(null);
  const [view, setView] = useState<"customer" | "kitchen">("customer");
  const printed = useRef(false);

  const print = (w: Which) => {
    document.body.dataset.print = w;
    const clear = () => { delete document.body.dataset.print; window.removeEventListener("afterprint", clear); };
    window.addEventListener("afterprint", clear);
    window.print();
  };

  useEffect(() => { api<ReceiptSettings>("/api/receipt-settings").then(setSettings).catch(() => setSettings(DEFAULT_SETTINGS)); }, []);
  useEffect(() => {
    if (fresh && settings?.autoPrint && !printed.current) { printed.current = true; setTimeout(() => print(fnb ? "both" : "customer"), 300); }
  }, [settings, fresh, fnb]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const st = settings ?? DEFAULT_SETTINGS;
  return (
    <div className="print-reset fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Struk">
      <div className="print-reset max-h-full w-full max-w-sm overflow-auto rounded-lg bg-paper p-4">
        {fnb && (
          <div className="no-print mb-3 flex gap-2" role="tablist" aria-label="Pilih struk">
            <button role="tab" aria-selected={view === "customer"} className={`flex-1 ${view === "customer" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("customer")}>Struk customer</button>
            <button role="tab" aria-selected={view === "kitchen"} className={`flex-1 ${view === "kitchen" ? "btn-primary" : "btn-ghost"}`} onClick={() => setView("kitchen")}>Struk dapur</button>
          </div>
        )}
        {settings ? (
          <div className="print-area">
            {/* Kedua struk selalu ada di halaman; yang tidak dipilih disembunyikan di layar, dan CSS cetak memilih yang dicetak */}
            <div className={view === "customer" || !fnb ? "" : "hidden print:block"}><Receipt r={receipt} settings={st} /></div>
            {fnb && <div className={view === "kitchen" ? "" : "hidden print:block"}><KitchenTicket r={receipt} settings={st} /></div>}
          </div>
        ) : <p className="text-sm text-muted">Memuat struk…</p>}

        <div className="no-print mt-4 space-y-2">
          {fnb ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn-primary" disabled={!settings} onClick={() => print("customer")}>Cetak struk customer</button>
                <button className="btn-primary" disabled={!settings} onClick={() => print("kitchen")}>Cetak struk dapur</button>
              </div>
              <button className="btn-ghost w-full" disabled={!settings} onClick={() => print("both")}>Cetak keduanya</button>
            </>
          ) : (
            <button className="btn-primary w-full" disabled={!settings} onClick={() => print("customer")}>Cetak</button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={busy || !settings}
              onClick={async () => { setBusy(true); await downloadReceiptPdf(receipt, st); setBusy(false); }}>{busy ? "Membuat…" : "PDF customer"}</button>
            {fnb
              ? <button className="btn-ghost" disabled={busy || !settings}
                  onClick={async () => { setBusy(true); await downloadKitchenPdf(receipt, st); setBusy(false); }}>PDF dapur</button>
              : <button className="btn-ghost" onClick={onClose}>Tutup</button>}
          </div>
          {fnb && <button className="btn-ghost w-full" onClick={onClose}>Tutup</button>}
        </div>
      </div>
    </div>
  );
}
