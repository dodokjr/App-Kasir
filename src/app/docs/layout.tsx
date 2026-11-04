import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import DocsNav from "@/components/DocsNav";

export const metadata: Metadata = { title: "Panduan | Kasir Toko" };

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[220px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start"><DocsNav /></aside>
        <article className="doc min-w-0">{children}</article>
      </div>
    </SiteShell>
  );
}
