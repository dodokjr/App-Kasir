"use client";

import { useEffect, useRef, useState } from "react";
import { Rolling } from "@/components/Interactive";
import { SkyClock } from "@/components/PageParts";
import { Dash, Paper, ReceiptBackdrop, Row } from "@/components/Receipt_page";

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
const PPN = 0.12; // sama dengan struk di HeroDemo
type Method = "Cash" | "QRIS";

/**
 * Urutan setelah bayar:
 * print  : struk dicetak
 * insert : kantong naik, struk dan pesanan masuk ke kantong
 * seal   : lipatan atas kantong menutup
 * done   : "Pesanan dibungkus"
 */
type Phase = "idle" | "print" | "insert" | "seal" | "done";

export default function PosDemo() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [method, setMethod] = useState<Method>("Cash");
  const [phase, setPhase] = useState<Phase>("idle");
  const [run, setRun] = useState(0); // naik setiap bayar atau reset, supaya animasi cetak diputar ulang
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const done = phase !== "idle";
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

  const pay = () => {
    clearTimers();
    setRun((n) => n + 1);
    setPhase("print");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const at = (ms: number, p: Phase) => timers.current.push(setTimeout(() => setPhase(p), ms));
    if (calm) {
      at(900, "done");
    } else {
      at(1400, "insert"); // setelah struk selesai dicetak
      at(2800, "seal");
      at(3400, "done");
    }
  };

  const reset = () => {
    clearTimers();
    setCart({});
    setPhase("idle");
    setRun((n) => n + 1);
  };

  const bagUp = phase === "insert" || phase === "seal" || phase === "done";
  const bagMove = `transition-transform duration-700 ease-out motion-reduce:transition-none ${
    bagUp ? "translate-y-0" : "translate-y-full"
  }`;

  const status =
    phase === "idle"
      ? `Total ${rp(total)}`
      : phase === "print"
        ? "Struk tercetak."
        : phase === "done"
          ? "Pesanan sudah dibungkus."
          : "Pesanan sedang dibungkus.";

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
                  onClick={pay}
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
          {status}
        </p>
      </div>

      {/* Struk: panel, kertas, dan animasi cetak sama dengan HeroDemo */}
      <div className="relative isolate overflow-hidden rounded-[2rem] px-4 pb-0 pt-14 sm:px-8 lg:sticky lg:top-24">
        <ReceiptBackdrop />
        <SkyClock className="absolute right-3 top-3 z-10 sm:right-5 sm:top-4" />

        {/* Bagian belakang kantong: terlihat sebagai bagian dalam yang gelap di atas muka kantong */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-1/2 z-[5] -ml-[115px] h-[230px] w-[230px] rounded-t-md bg-[#8a5a2b] ${bagMove}`}
        />

        {/* key mengulang animasi cetak setiap kali pembayaran dilakukan */}
        <div key={run} className="print-in relative z-10 flex min-h-[420px] justify-center">
          {/* Lapisan ini yang turun ke dalam kantong, dipisah dari animasi cetak di atasnya */}
          <div
            className={`origin-bottom transition-[transform,opacity] duration-[1100ms] ease-in-out motion-reduce:transition-none ${
              bagUp ? "translate-y-[60%] scale-[.7]" : "translate-y-0 scale-100"
            } ${phase === "seal" || phase === "done" ? "opacity-0" : "opacity-100"}`}
          >
            <Paper label="Struk pesanan" className="-rotate-2">
              <div className="text-center">
                <div className="text-[13px] font-bold">Warung Bu Sari</div>
                <div>Cabang Melati</div>
              </div>
              <Dash />
              <Row a="Pesanan" b="#08" />
              <Row a="Meja" b="5" />
              <Row a="Customer" b="Budi" />
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
              <Row a={`PPN ${Math.round(PPN * 100)}%`} b={<Rolling value={ppn} format={num} />} />
              <Row a="Total" b={<Rolling value={total} format={(n) => "Rp " + num(n)} />} bold />
              <Row a="Pembayaran" b={method} />
              {done && method === "Cash" && (
                <div className="anim-swap">
                  <Row a="Tunai" b={num(tunai)} />
                  <Row a="Kembali" b={num(tunai - total)} />
                </div>
              )}
              <div className="mt-2 text-center">Terima kasih</div>
            </Paper>
          </div>
        </div>

        {/* Muka kantong: menutupi struk yang turun, lalu lipatan atasnya menutup */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-0 left-1/2 z-20 -ml-[115px] h-[204px] w-[230px] ${bagMove}`}
        >
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-b-md bg-gradient-to-b from-[#d6a468] to-[#c08a4c] pt-4 font-mono text-[11px] text-[#5a3a17] shadow-[0_-6px_18px_-6px_rgba(0,0,0,0.35)]">
            <span className="text-[13px] font-bold">Warung Bu Sari</span>
            <span>Terima kasih</span>
          </div>
          <div
            className={`absolute inset-x-0 -top-[26px] h-[44px] origin-top rounded-t-md bg-[#e2b67c] shadow-md transition-transform duration-500 ease-out motion-reduce:transition-none ${
              phase === "seal" || phase === "done" ? "scale-y-100" : "scale-y-0"
            }`}
          />
        </div>

        {phase === "done" && (
          <div className="anim-pop pointer-events-none absolute inset-x-0 top-[26%] z-30 flex justify-center px-4">
            <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-lg">
              <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Pesanan dibungkus
            </span>
          </div>
        )}
      </div>
    </div>
  );
}