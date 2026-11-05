import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import DocsNav from "@/components/DocsNav";
import DocsPager from "@/components/DocsPager";

export const metadata: Metadata = { title: "Panduan | Kasir Toko" };

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[250px_1fr] md:gap-12 md:py-14">
        <aside className="md:sticky md:top-24 md:max-h-[calc(100vh-7rem)] md:self-start md:overflow-y-auto"><DocsNav /></aside>
        <div className="min-w-0">
          <article className="doc">{children}</article>
          <DocsPager />
          <p className="mt-8 rounded-2xl bg-sun/20 p-5 text-base leading-7">
            Masih bingung? <Link href="/kontak" className="font-bold text-link underline underline-offset-4">Tulis pesan ke kami</Link> dan sebutkan halaman panduan yang sedang Anda baca.
          </p>
        </div>
      </div>
    </SiteShell>
  );
}