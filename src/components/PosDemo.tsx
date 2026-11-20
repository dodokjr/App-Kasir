"use client";

import { useState, type ReactNode } from "react";
import { Rolling } from "@/components/Interactive";

const rp = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);
const num = (n: number) => new Intl.NumberFormat("id-ID").format(n);

const MENU = [
  { id: "nasi", name: "Nasi goreng", price: 25000 },
  { id: "mie", name: "Mie ayam", price: 20000 },
  { id: "geprek", name: "Ayam geprek", price: 22000 },
  { id: "teh", name: "Es teh manis", price: 6000 },
  { id: "kopi", name: "Kopi susu", price: 15000 },
  { id: "kerupuk", name: "Kerupuk", price: 3000 },
];
const PPN = 0.11;
type Method = "Cash" | "QRIS";

const Row = ({ a, b, bold }: { a: ReactNode; b: ReactNode; bold?: boolean }) => (
  <div className={`flex justify-between gap-3 ${bold ? "font-semibold" : ""}`}>
    <span>{a}</span>
    <span className="text-right">{b}</span>
  </div>
);
const Dash = () => <hr className="my-2.5 border-dashed border-black/40" />;

export default function PosDemo() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<Method>("Cash");
  const [paid, setPaid] = useState(0); // naik setiap bayar, supaya struk dicetak

  const done = paid > 0;
  const lines = MENU.filter((m) => cart[m.id]);
  const sub = lines.reduce((s, m) => s + m.price * cart[m.id], 0);
  const ppn = Math.round(sub * PPN);
  const total = sub + ppn;
  const tunai = Math.ceil(total / 10000) * 10000;
  const count = lines.reduce((s, m) => s + cart[m.id], 0);

  const add = (id: string) => !done && setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const less = (id: string) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1;
      const rest = { ...c };
      if (n > 0) rest[id] = n;
      else delete rest[id];
      return rest;
    });
  const reset = () => {
    setCart({});
    setPaid(0);
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
      {/* Menu dan pembayaran */}
      <div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Menu">
          {MENU.map((m) => {
            const q = cart[m.id] || 0;
            return (
              <li key={m.id} className="relative">
                <button
                  type="button"
                  disabled={done}
                  onClick={() => add(m.id)}
                  className={`w-full rounded-2xl border bg-surface p-4 text-left transition-[transform,border-color,background-color] duration-150 active:scale-[0.96] disabled:cursor-default disabled:active:scale-100 ${
                    q > 0 ? "border-accent bg-accent/5" : "border-line hover:border-accent"
                  }`}
                >
                  <span className="block pr-6 font-semibold leading-snug">{m.name}</span>
                  <span className="mt-2 block font-mono text-sm text-muted">{rp(m.price)}</span>
                </button>
                {q > 0 && (
                  <span
                    key={q}
                    className="anim-pop pointer-events-none absolute right-2.5 top-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-accent px-1.5 text-xs font-bold text-white"
                    aria-hidden="true"
                  >
                    {q}
                  </span>
                )}
                {q > 0 && !done && (
                  <button
                    type="button"
                    onClick={() => less(m.id)}
                    aria-label={`Kurangi ${m.name}`}
                    className="absolute bottom-2.5 right-2.5 grid h-7 w-7 place-items-center rounded-full border border-line bg-paper text-base font-bold transition-[transform,border-color] hover:border-accent active:scale-90"
                  >
                    −
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold">Pembayaran</span>
            <div role="group" aria-label="Metode pembayaran" className="flex gap-2">
              {(["Cash", "QRIS"] as Method[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={done}
                  aria-pressed={method === m}
                  onClick={() => setMethod(m)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-200 active:scale-95 disabled:cursor-default ${
                    method === m ? "border-accent bg-accent text-white" : "border-line hover:border-accent"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-muted">Total ({count} item)</span>
            <Rolling value={total} className="font-mono text-2xl font-extrabold text-accent dark:text-link" />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {done ? (
              <button type="button" onClick={reset} className="btn-ghost btn-lg w-full justify-center transition-transform active:scale-[0.98]">
                Transaksi baru
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={sub === 0}
                  onClick={() => setPaid((n) => n + 1)}
                  className="btn-primary btn-lg w-full justify-center transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                >
                  Bayar dan cetak struk
                </button>
                {sub > 0 && (
                  <button type="button" onClick={reset} className="btn-ghost btn-lg justify-center transition-transform active:scale-[0.98]">
                    Kosongkan
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {done ? "Struk tercetak." : `Total ${rp(total)}`}
        </p>
      </div>

      {/* Struk */}
      <div className="overflow-hidden rounded-[2rem] bg-sun/25 px-4 pb-0 pt-6 sm:px-8 lg:sticky lg:top-24">
        <div className="relative z-10 mx-auto h-3 w-[250px] max-w-full rounded-full bg-black/80" aria-hidden="true" />
        <div className="-mt-1.5 overflow-hidden">
          <div
            key={paid}
            role="img"
            aria-label="Struk pesanan"
            className={`${done ? "paper-print" : ""} receipt-edge mx-auto w-[250px] max-w-full bg-white px-4 pt-4 font-mono text-xs leading-5 text-black shadow-[0_18px_34px_-14px_rgba(10,30,20,0.45)]`}
          >
            <div className="text-center">
              <div className="text-[13px] font-bold">Warung Bu Sari</div>
              <div>Cabang Melati</div>
            </div>
            <Dash />
            {lines.length === 0 ? (
              <p className="py-8 text-center text-neutral-500">Ketuk menu untuk mulai</p>
            ) : (
              lines.map((m) => (
                <div key={m.id} className="anim-swap">
                  <div>{m.name}</div>
                  <Row a={`${cart[m.id]} x ${num(m.price)}`} b={num(m.price * cart[m.id])} />
                </div>
              ))
            )}
            <Dash />
            <Row a="Subtotal" b={<Rolling value={sub} format={num} />} />
            <Row a="PPN 11%" b={<Rolling value={ppn} format={num} />} />
            <Row a="Total" b={<Rolling value={total} format={(n) => "Rp " + num(n)} />} bold />
            {done && (
              <div className="anim-swap">
                <Row a="Pembayaran" b={method} />
                {method === "Cash" && (
                  <>
                    <Row a="Tunai" b={num(tunai)} />
                    <Row a="Kembali" b={num(tunai - total)} />
                  </>
                )}
              </div>
            )}
            <div className="mt-2 text-center">Terima kasih</div>
          </div>
        </div>
      </div>
    </div>
  );
}