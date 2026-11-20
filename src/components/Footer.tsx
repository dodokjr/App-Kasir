import Link from "next/link";
import Logo from "@/components/Logo";
import BackToTop from "@/components/BackToTop";
import { SITE } from "@/lib/site";

type L = readonly (readonly [string, string])[];

const APLIKASI: L = [
  ["/register", "Daftarkan toko"],
  ["/login", "Masuk"],
  ["/#fitur", "Fitur"],
  ["/#cara-mulai", "Cara mulai"],
];
const BANTUAN: L = [
  ["/docs", "Panduan"],
  ["/docs/jenis-usaha", "Jenis usaha dan pembayaran"],
  ["/docs/instalasi", "Instalasi"],
  ["/kontak", "Hubungi kami"],
];
const ATURAN: L = [
  ["/privasi", "Kebijakan privasi"],
  ["/syarat", "Syarat dan ketentuan"],
];

export default function Footer({ loggedIn }: { loggedIn: boolean }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4">
        {/* Ajakan */}
        <div className="flex flex-col gap-5 border-b border-line py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xl font-bold sm:text-2xl">
              {loggedIn ? "Lanjutkan jualan hari ini." : "Siap mencatat penjualan tanpa ribet?"}
            </p>
            <p className="mt-1 text-[15px] text-muted">
              Data penjualan tersimpan di Google Sheets milik Anda sendiri.
            </p>
          </div>
          <Link
            href={loggedIn ? "/dashboard" : "/register"}
            className="btn-primary btn-lg group w-full justify-center sm:w-auto"
          >
            {loggedIn ? "Buka dashboard" : "Daftarkan toko"}
            <span
              aria-hidden="true"
              className="ml-2 inline-block transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
            >
              →
            </span>
          </Link>
        </div>

        {/* Kolom */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label={`${SITE.name}, ke beranda`} className="inline-block transition-transform duration-200 active:scale-95">
              <Logo />
            </Link>
            <p className="mt-4 max-w-[34ch] text-[15px] leading-7 text-muted">
              Aplikasi kasir untuk warung makan, toko barang, dan toko sembako.
            </p>
          </div>
          <Col title="Aplikasi" links={APLIKASI} />
          <Col title="Bantuan" links={BANTUAN} />
          <Col title="Aturan" links={ATURAN} />
        </div>

        {/* Bawah */}
        <div className="flex flex-col gap-2 border-t border-line py-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.name}. Dikelola oleh {SITE.operator}
            <span aria-hidden="true"> · </span>
            Desain oleh{" "}
            <a
              href="https://mfikria.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-link underline-offset-4 hover:underline"
            >
              {SITE.desain}
            </a>
          </p>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}

function Col({ title, links }: { title: string; links: L }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-bold">{title}</h2>
      <ul className="mt-4 space-y-1 text-[15px]">
        {links.map(([href, t]) => (
          <li key={href}>
            <Link
              href={href}
              className="group inline-flex items-center py-1.5 text-muted transition-colors duration-200 hover:text-ink"
            >
              <span
                aria-hidden="true"
                className="mr-0 inline-block w-0 -translate-x-1 overflow-hidden opacity-0 transition-[width,margin,opacity,transform] duration-200 group-hover:mr-1.5 group-hover:w-3 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:mr-1.5 group-focus-visible:w-3 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 motion-reduce:transition-none"
              >
                →
              </span>
              {t}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}