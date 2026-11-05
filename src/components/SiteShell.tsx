import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

const NAV = [
  ["/#fitur", "Fitur"],
  ["/#cara-mulai", "Cara mulai"],
  ["/docs", "Panduan"],
  ["/kontak", "Kontak"],
] as const;

export default async function SiteShell({ children }: { children: ReactNode }) {
  const s = await getSession();
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#isi" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow">Langsung ke isi halaman</a>
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Link href="/" aria-label={`${SITE.name}, ke beranda`}><Logo /></Link>

          <nav aria-label="Menu utama" className="ml-6 hidden gap-1 text-[15px] font-medium md:flex">
            {NAV.map(([href, t]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 hover:bg-paper">{t}</Link>)}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 md:flex">
              {s ? <Link href="/dashboard" className="btn-primary">Buka dashboard</Link> : (
                <>
                  <Link href="/login" className="btn-ghost">Masuk</Link>
                  <Link href="/register" className="btn-primary">Daftarkan toko</Link>
                </>
              )}
            </div>

            {/* Menu HP: tanpa JavaScript, memakai <details> */}
            <details className="group relative md:hidden">
              <summary className="btn-ghost cursor-pointer list-none [&::-webkit-details-marker]:hidden" aria-label="Buka menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
                <span className="ml-2">Menu</span>
              </summary>
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-xl">
                {NAV.map(([href, t]) => <Link key={href} href={href} className="block rounded-lg px-4 py-3 text-base font-medium hover:bg-paper">{t}</Link>)}
                <div className="mt-2 grid gap-2 border-t border-line p-2 pt-3">
                  {s ? <Link href="/dashboard" className="btn-primary btn-lg">Buka dashboard</Link> : (
                    <>
                      <Link href="/register" className="btn-primary btn-lg">Daftarkan toko</Link>
                      <Link href="/login" className="btn-ghost btn-lg">Masuk</Link>
                    </>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
      </header>

      <div id="isi" className="flex-1">{children}</div>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[34ch] text-[15px] leading-7 text-muted">Aplikasi kasir untuk warung makan, toko barang, dan toko sembako. Data penjualan tersimpan di Google Sheets milik Anda.</p>
          </div>
          <FooterCol title="Aplikasi" links={[["/register", "Daftarkan toko"], ["/login", "Masuk"], ["/#fitur", "Fitur"], ["/#cara-mulai", "Cara mulai"]]} />
          <FooterCol title="Bantuan" links={[["/docs", "Panduan"], ["/docs/jenis-usaha", "Jenis usaha dan pembayaran"], ["/docs/instalasi", "Instalasi"], ["/kontak", "Hubungi kami"]]} />
          <FooterCol title="Aturan" links={[["/privasi", "Kebijakan privasi"], ["/syarat", "Syarat dan ketentuan"]]} />
        </div>
        <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-muted">
  © {new Date().getFullYear()} {SITE.name}. Dikelola oleh {SITE.operator} & design{" "}
  <a 
    href="https://mfikria.vercel.app" 
    target="_blank" 
    rel="noopener noreferrer" 
    className="text-foreground hover:underline"
  >
    {SITE.desain}
  </a>
.
</p>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: readonly (readonly [string, string])[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-bold">{title}</h2>
      <ul className="mt-4 space-y-3 text-[15px]">
        {links.map(([href, t]) => <li key={href}><Link href={href} className="text-muted hover:text-ink hover:underline">{t}</Link></li>)}
      </ul>
    </nav>
  );
}