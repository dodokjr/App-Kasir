import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import ThemeToggle from "@/components/ThemeToggle";

export default async function SiteShell({ children }: { children: ReactNode }) {
  const s = await getSession();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link href="/" className="font-mono text-base font-medium tracking-tight">{SITE.name}</Link>
          <nav className="flex gap-1 text-sm">
            <Link href="/#fitur" className="rounded-md px-3 py-1.5 hover:bg-paper">Fitur</Link>
            <Link href="/docs" className="rounded-md px-3 py-1.5 hover:bg-paper">Panduan</Link>
            <Link href="/kontak" className="rounded-md px-3 py-1.5 hover:bg-paper">Kontak</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {s ? (
              <Link href="/dashboard" className="btn-primary">Buka dashboard</Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">Masuk</Link>
                <Link href="/register" className="btn-primary">Daftarkan toko</Link>
              </>
            )}
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted">
          <span>© {new Date().getFullYear()} {SITE.name}</span>
          <Link href="/docs" className="hover:text-ink">Panduan</Link>
          <Link href="/privasi" className="hover:text-ink">Kebijakan privasi</Link>
          <Link href="/syarat" className="hover:text-ink">Syarat dan ketentuan</Link>
          <Link href="/kontak" className="hover:text-ink">Kontak</Link>
        </div>
      </footer>
    </div>
  );
}
