import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "@/components/Logo";

const ROWS = [
  ["Kopi susu gula aren", "2 × 22.000", "44.000"],
  ["Roti bakar cokelat", "1 × 18.000", "18.000"],
  ["Air mineral", "2 × 5.000", "10.000"],
];

function Receipt() {
  return (
    <div className="w-full max-w-[300px] rotate-[-2deg] drop-shadow-[0_24px_40px_rgba(0,0,0,0.35)]">
      <div className="rounded-t-xl bg-white px-5 pb-4 pt-5 font-mono text-[12px] leading-5 text-[#14201C]">
        <p className="text-center text-sm font-bold">Galaxy Store</p>
        <p className="text-center text-[11px] text-[#5B6B66]">
          Cabang Kemang · Kasir Rina
        </p>

        <div className="my-3 border-t border-dashed border-[#B9C4C0]" />

        {ROWS.map(([name, qty, total]) => (
          <div key={name} className="mb-1.5">
            <div className="flex justify-between gap-3">
              <span>{name}</span>
              <span>{total}</span>
            </div>
            <div className="text-[11px] text-[#5B6B66]">{qty}</div>
          </div>
        ))}

        <div className="my-3 border-t border-dashed border-[#B9C4C0]" />

        <div className="flex justify-between text-[#5B6B66]">
          <span>PPN 11%</span>
          <span>7.920</span>
        </div>

        <div className="mt-1 flex justify-between text-base font-bold">
          <span>Total</span>
          <span>79.920</span>
        </div>

        <p className="mt-3 text-center text-[11px] text-[#5B6B66]">
          QRIS · Lunas
        </p>
      </div>

      <svg className="block w-full" height="8" aria-hidden>
        <defs>
          <pattern
            id="galaxy-receipt-zig"
            width="12"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <path d="M0 0H12L6 8Z" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="8" fill="url(#galaxy-receipt-zig)" />
      </svg>
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Panel kiri */}
      <aside className="relative hidden overflow-hidden bg-[#111827] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-[rgb(var(--accent))]/15 blur-3xl"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-[rgb(var(--accent))]/10 blur-3xl"
        />

        <div className="relative">
          <Logo className="[&_span]:text-white" />
        </div>

        <div className="relative flex flex-col items-center gap-10">
          <Receipt />

          <div className="max-w-sm text-center">
            <p className="text-2xl font-semibold leading-snug tracking-tight">
              Kelola bisnis Anda dalam satu galaksi.
            </p>

            <p className="mt-2 text-sm text-white/65">
              Catat transaksi, pantau stok, dan kelola laporan semua cabang
              dengan lebih mudah.
            </p>
          </div>
        </div>

        <p className="relative text-xs text-white/45">
          Solusi kasir modern untuk bisnis Anda.
        </p>
      </aside>

      {/* Panel kanan */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="lg:hidden">
          <Logo />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight">
            {title}
          </h1>

          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>

        <p className="text-center text-xs text-muted">
          <Link href="/" className="underline underline-offset-2">
            Kembali ke beranda
          </Link>
        </p>
      </main>
    </div>
  );
}