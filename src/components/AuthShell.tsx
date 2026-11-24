"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

/* ---------- Posisi form: kiri / tengah / kanan (disimpan di browser) ---------- */
export type AuthPos = "kiri" | "tengah" | "kanan";
const KEY = "kt-auth-pos";

function useAuthPos() {
  const [pos, setPos] = useState<AuthPos>("kanan"); // sama dengan tampilan bawaan, supaya hydration cocok
  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "kiri" || v === "tengah" || v === "kanan") setPos(v);
    } catch {}
  }, []);
  const set = (p: AuthPos) => {
    setPos(p);
    try { localStorage.setItem(KEY, p); } catch {}
  };
  return [pos, set] as const;
}

const OPTS: { k: AuthPos; label: string; icon: ReactNode }[] = [
  { k: "kiri", label: "Form di kiri", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M10 4v16" /></> },
  { k: "tengah", label: "Form di tengah", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><rect x="8" y="8" width="8" height="8" rx="1.5" /></> },
  { k: "kanan", label: "Form di kanan", icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M14 4v16" /></> },
];

function PosSwitch({ pos, onChange }: { pos: AuthPos; onChange: (p: AuthPos) => void }) {
  return (
    <div role="radiogroup" aria-label="Posisi form" className="hidden items-center gap-0.5 rounded-xl border border-line bg-surface p-0.5 lg:inline-flex">
      {OPTS.map((o) => (
        <button
          key={o.k}
          type="button"
          role="radio"
          suppressHydrationWarning
          aria-checked={pos === o.k}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.k)}
          className={`rounded-lg p-1.5 transition duration-200 ${pos === o.k ? "bg-accent text-white shadow-sm" : "text-muted hover:text-ink"}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{o.icon}</svg>
        </button>
      ))}
    </div>
  );
}

/* ---------- Panel merek ---------- */
const ROWS = [
  ["Kopi susu gula aren", "2 × 22.000", "44.000"],
  ["Roti bakar cokelat", "1 × 18.000", "18.000"],
  ["Air mineral", "2 × 5.000", "10.000"],
];

const POINTS = ["Banyak cabang, stok sendiri-sendiri", "Kasir tetap jalan tanpa internet", "Data tersimpan di Google Sheets Anda"];

function Receipt() {
  return (
    <div className="anim-float w-full max-w-[290px] rotate-[-2deg] drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]">
      <div className="rounded-t-xl bg-white px-5 pb-4 pt-5 font-mono text-[12px] leading-5 text-[#14201C]">
        <p className="text-center text-sm font-bold">Galaxy Store</p>
        <p className="text-center text-[11px] text-[#5B6B66]">Cabang Kemang · Kasir Rina</p>
        <div className="my-3 border-t border-dashed border-[#B9C4C0]" />
        {ROWS.map(([name, qty, total]) => (
          <div key={name} className="mb-1.5">
            <div className="flex justify-between gap-3"><span>{name}</span><span>{total}</span></div>
            <div className="text-[11px] text-[#5B6B66]">{qty}</div>
          </div>
        ))}
        <div className="my-3 border-t border-dashed border-[#B9C4C0]" />
        <div className="flex justify-between text-[#5B6B66]"><span>PPN 11%</span><span>7.920</span></div>
        <div className="mt-1 flex justify-between text-base font-bold"><span>Total</span><span>79.920</span></div>
        <p className="mt-3 text-center text-[11px] text-[#5B6B66]">QRIS · Lunas</p>
      </div>
      <svg className="block w-full" height="8" aria-hidden>
        <defs>
          <pattern id="galaxy-receipt-zig" width="12" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H12L6 8Z" fill="white" /></pattern>
        </defs>
        <rect width="100%" height="8" fill="url(#galaxy-receipt-zig)" />
      </svg>
    </div>
  );
}

const Blobs = ({ className = "" }: { className?: string }) => (
  <>
    <div aria-hidden className={`pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--accent-2)/0.30)] blur-3xl anim-blob ${className}`} />
    <div aria-hidden className={`pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[rgb(var(--sun)/0.18)] blur-3xl anim-blob [animation-delay:-6s] ${className}`} />
  </>
);

/* ---------- Penunjuk langkah ---------- */
function Steps({ at, of }: { at: number; of: number }) {
  return (
    <div className="mb-5" role="group" aria-label={`Langkah ${at} dari ${of}`}>
      <div className="flex gap-1.5">
        {Array.from({ length: of }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i < at ? "bg-accent" : "bg-current opacity-10"}`} />
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted">Langkah {at} dari {of}</p>
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  /** Opsional: tampilkan penunjuk langkah (mis. {at: 2, of: 4}) */
  step?: { at: number; of: number };
}

export default function AuthShell({ title, subtitle, children, footer, step }: AuthShellProps) {
  const [pos, setPos] = useAuthPos();
  const center = pos === "tengah";
  const formLeft = pos === "kiri";

  // Catatan: kelas Tailwind ditulis utuh (bukan disusun) supaya ikut terbaca saat build
  const root = center
    ? "relative min-h-screen lg:overflow-hidden lg:bg-gradient-to-br lg:from-accent-dark lg:via-[#111827] lg:to-[#0b1220]"
    : `relative min-h-screen lg:grid ${formLeft ? "lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]"}`;

  const card = center
    ? "mx-auto w-full max-w-sm lg:max-w-[440px] lg:rounded-3xl lg:border lg:border-line lg:bg-surface lg:p-9 lg:shadow-2xl lg:shadow-black/30"
    : "mx-auto w-full max-w-sm";

  return (
    <div className={root}>
      {center && <Blobs className="hidden lg:block" />}

      {/* Panel merek (kiri atau kanan, hilang di mode tengah dan di HP) */}
      {!center && (
        <aside className={`relative hidden overflow-hidden bg-gradient-to-br from-accent-dark via-[#111827] to-[#0b1220] p-12 text-white lg:flex lg:flex-col lg:justify-between ${formLeft ? "lg:order-2" : "lg:order-1"}`}>
          <Blobs />
          <div className="relative"><Logo className="[&_span]:text-white" /></div>

          <div className="relative flex flex-col items-center gap-9">
            <Receipt />
            <div className="max-w-sm text-center">
              <p className="text-2xl font-semibold leading-snug tracking-tight">Kelola bisnis Anda dalam satu galaksi.</p>
              <p className="mt-2 text-sm text-white/65">Catat transaksi, pantau stok, dan kelola laporan semua cabang dengan lebih mudah.</p>
            </div>
            <ul className="space-y-2 text-sm text-white/80">
              {POINTS.map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-[rgb(var(--accent-2))]" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-white/45">Solusi kasir modern untuk bisnis Anda.</p>
        </aside>
      )}

      {/* Panel form */}
      <main className={`page-in relative z-10 flex min-h-screen flex-col px-5 py-6 sm:px-10 ${formLeft ? "lg:order-1" : "lg:order-2"}`}>
        <div className="flex items-center justify-between gap-3">
          <div className={center ? "lg:[&_span]:text-white" : "lg:hidden"}><Logo /></div>
          <div className="ml-auto flex items-center gap-2">
            <PosSwitch pos={pos} onChange={setPos} />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          <div className={`${card} auth-rise`}>
            {step && <Steps at={step.at} of={step.of} />}
            <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{title}</h1>
            <p className="mt-1.5 text-sm leading-6 text-muted">{subtitle}</p>

            <div className="auth-form mt-7">{children}</div>

            <div className="mt-6 text-center text-sm text-muted">{footer}</div>
          </div>
        </div>

        <p className={`text-center text-xs text-muted ${center ? "lg:text-white/70" : ""}`}>
          <Link href="/" className="underline underline-offset-2">Kembali ke beranda</Link>
        </p>
      </main>
    </div>
  );
}