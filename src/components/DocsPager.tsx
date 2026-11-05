"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOC_FLAT } from "@/components/DocsNav";

// Tombol "sebelumnya" dan "berikutnya" di akhir setiap halaman panduan
export default function DocsPager() {
  const path = usePathname();
  const i = DOC_FLAT.findIndex(([h]) => h === path);
  if (i < 0) return null;
  const prev = DOC_FLAT[i - 1], next = DOC_FLAT[i + 1];
  return (
    <nav aria-label="Halaman panduan lainnya" className="mt-14 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
      {prev ? <Link href={prev[0]} className="rounded-2xl border border-line bg-surface p-4 transition hover:border-accent"><span className="block text-sm text-muted">Sebelumnya</span><span className="font-bold">{prev[1]}</span></Link> : <span />}
      {next ? <Link href={next[0]} className="rounded-2xl border border-line bg-surface p-4 text-right transition hover:border-accent sm:col-start-2"><span className="block text-sm text-muted">Berikutnya</span><span className="font-bold">{next[1]}</span></Link> : <span />}
    </nav>
  );
}