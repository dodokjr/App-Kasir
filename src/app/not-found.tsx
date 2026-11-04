import Link from "next/link";
import SiteShell from "@/components/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="mt-3 text-muted">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">Ke beranda</Link>
          <Link href="/docs" className="btn-ghost">Baca panduan</Link>
        </div>
      </div>
    </SiteShell>
  );
}
