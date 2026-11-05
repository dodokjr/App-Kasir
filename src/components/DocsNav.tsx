"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const DOC_GROUPS: { title: string; items: [string, string][] }[] = [
  { title: "Mulai", items: [["/docs", "Memulai"], ["/docs/peran", "Peran dan hak akses"]] },
  { title: "Berjualan", items: [["/docs/penjualan", "Penjualan, stok, dan struk"], ["/docs/jenis-usaha", "Jenis usaha, pembayaran, PPN, pantau kasir"], ["/docs/tutup-kasir", "Buka dan tutup kasir"]] },
  { title: "Laporan dan pengaturan", items: [["/docs/keuangan", "Keuangan"], ["/docs/struk-tema", "Struk kustom dan mode gelap"], ["/docs/instalasi", "Instalasi dan Google Sheets"]] },
];
export const DOC_FLAT = DOC_GROUPS.flatMap((g) => g.items);

export default function DocsNav() {
  const path = usePathname();
  const current = DOC_FLAT.find(([h]) => h === path)?.[1] ?? "Daftar panduan";
  const list = (
    <div className="space-y-5">
      {DOC_GROUPS.map((g) => (
        <div key={g.title}>
          <h2 className="mb-1.5 px-3 text-sm font-bold">{g.title}</h2>
          <ul className="space-y-0.5">
            {g.items.map(([href, t]) => (
              <li key={href}>
                <Link href={href} aria-current={path === href ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2 text-[15px] leading-snug ${path === href ? "bg-accent font-semibold text-white" : "text-muted hover:bg-surface hover:text-ink"}`}>{t}</Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
  return (
    <nav aria-label="Daftar panduan">
      {/* HP: daftar dilipat, judul halaman yang sedang dibuka terlihat */}
      <details className="rounded-xl border border-line bg-surface md:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
          <span><span className="block text-xs font-medium text-muted">Panduan</span>{current}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div className="border-t border-line p-3">{list}</div>
      </details>
      <div className="hidden md:block">{list}</div>
    </nav>
  );
}