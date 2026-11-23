import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import { SITE } from "@/lib/site";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function SiteShell({ children }: { children: ReactNode }) {
  const s = await getSession();
  return (
    <div className="relative isolate flex min-h-screen flex-col">
      <a
        href="#isi"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow"
      >
        Langsung ke isi halaman
      </a>

      {/* Cahaya aksen halus; ikut warna yang dipilih */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(60%_70%_at_50%_0%,rgb(var(--accent)/0.12),transparent)]"
      />

      <Navbar loggedIn={!!s} siteName={SITE.name} />

      <div id="isi" className="page-in flex-1">
        {children}
      </div>

      <Footer loggedIn={!!s} />
    </div>
  );
}