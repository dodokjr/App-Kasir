"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/docs", "Memulai"],
  ["/docs/peran", "Peran dan hak akses"],
  ["/docs/penjualan", "Penjualan, stok, dan struk"],
  ["/docs/jenis-usaha", "Jenis usaha, pembayaran, pantau kasir"],
  ["/docs/tutup-kasir", "Buka dan tutup kasir"],
  ["/docs/keuangan", "Keuangan"],
  ["/docs/struk-tema", "Struk kustom dan mode gelap"],
  ["/docs/instalasi", "Instalasi dan Google Sheets"],
];

export default function DocsNav() {
  const path = usePathname();
  return (
    <nav aria-label="Daftar panduan" className="flex gap-1 overflow-x-auto md:flex-col">
      {LINKS.map(([href, t]) => (
        <Link key={href} href={href} aria-current={path === href ? "page" : undefined}
          className={`whitespace-nowrap rounded-md px-3 py-2 text-sm ${path === href ? "bg-accent text-white" : "hover:bg-paper"}`}>{t}</Link>
      ))}
    </nav>
  );
}
