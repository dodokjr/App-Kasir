import type { ReactNode } from "react";
import { SkyLayers } from "@/components/PageParts";

export const Row = ({ a, b, bold }: { a: ReactNode; b: ReactNode; bold?: boolean }) => (
  <div className={`flex justify-between gap-3 ${bold ? "font-semibold" : ""}`}>
    <span>{a}</span>
    <span className="text-right">{b}</span>
  </div>
);

export const Dash = () => <hr className="my-2.5 border-dashed border-black/40" />;

/**
 * Kertas struk selalu putih dan hitam, sama seperti hasil cetak.
 * Saat di-hover atau difokus, kertas meluruskan diri dan terangkat sedikit.
 * Dipakai bersama oleh HeroDemo dan PosDemo supaya tampilannya identik.
 */
export function Paper({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <div
      role="img"
      aria-label={label}
      tabIndex={0}
      className={`receipt-edge w-[230px] shrink-0 bg-white px-4 pt-4 font-mono text-[11.5px] leading-5 text-black shadow-[0_18px_34px_-14px_rgba(10,30,20,0.45)] outline-none transition-[transform,box-shadow] duration-300 ease-out hover:z-10 hover:-translate-y-2 hover:rotate-0 hover:shadow-[0_26px_40px_-16px_rgba(10,30,20,0.5)] focus-visible:-translate-y-2 focus-visible:rotate-0 focus-visible:ring-2 focus-visible:ring-accent motion-reduce:transition-none sm:w-[250px] sm:text-xs ${className}`}
    >
      {children}
    </div>
  );
}

/* Latar panel nota: langit yang mengikuti jam di dunia nyata,
   lengkap dengan matahari, bulan, bintang, dan deretan toko di bawah struk. */
export function ReceiptBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
      <SkyLayers solid />
    </div>
  );
}