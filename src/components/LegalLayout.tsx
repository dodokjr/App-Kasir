import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import { SITE } from "@/lib/site";

export type LegalSection = { id: string; title: string; body: ReactNode };

// Tata letak bersama untuk Kebijakan Privasi dan Syarat: ringkasan sederhana, daftar isi, lalu isi lengkap
export default function LegalLayout({ title, intro, summary, sections }: { title: string; intro: ReactNode; summary: string[]; sections: LegalSection[] }) {
  const toc = (
    <ol className="space-y-1 text-[15px]">
      {sections.map((s, i) => (
        <li key={s.id}><a href={`#${s.id}`} className="flex gap-2 rounded-lg px-3 py-1.5 text-muted hover:bg-paper hover:text-ink"><span className="w-5 flex-none text-right">{i + 1}.</span><span>{s.title}</span></a></li>
      ))}
    </ol>
  );
  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-base text-muted">Terakhir diperbarui {SITE.updated}</p>
          <p className="mt-5 text-lg leading-8">{intro}</p>
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[260px_1fr] lg:gap-14">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav aria-label="Daftar isi">
              <details className="rounded-xl border border-line bg-surface lg:hidden">
                <summary className="cursor-pointer list-none px-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">Daftar isi</summary>
                <div className="border-t border-line p-2">{toc}</div>
              </details>
              <div className="hidden lg:block">
                <h2 className="mb-2 px-3 text-sm font-bold">Daftar isi</h2>
                {toc}
              </div>
            </nav>
          </aside>

          <div className="min-w-0">
            <section aria-labelledby="ringkasan" className="rounded-3xl bg-sun/20 p-6 sm:p-8">
              <h2 id="ringkasan" className="text-xl font-bold">Ringkasan dengan bahasa sederhana</h2>
              <ul className="mt-4 space-y-3">
                {summary.map((t) => (
                  <li key={t} className="flex gap-3 text-base leading-7">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="mt-1 flex-none text-accent dark:text-link" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{t}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm text-muted">Ringkasan ini hanya membantu memahami. Yang berlaku adalah isi lengkap di bawah.</p>
            </section>

            <div className="doc mt-4">
              {sections.map((s, i) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2>{i + 1}. {s.title}</h2>
                  {s.body}
                </section>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}