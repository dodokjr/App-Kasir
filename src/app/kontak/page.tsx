import type { Metadata } from "next";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kontak | Kasir Toko" };

export default function Kontak() {
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_1.35fr] lg:gap-16 lg:py-16">
        <div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Ada yang bisa kami bantu?</h1>
          <p className="mt-5 max-w-[42ch] text-lg leading-8 text-muted">Tulis kendala, pertanyaan, atau permintaan penghapusan data Anda. Kami membalas lewat email.</p>

          <Link href="/docs" className="mt-8 block rounded-2xl border border-line bg-surface p-5 transition hover:border-accent">
            <span className="block text-lg font-bold">Cari jawabannya dulu di Panduan</span>
            <span className="mt-1 block leading-7 text-muted">Cara membuka kasir, mengatur PPN, menambah metode pembayaran, dan lainnya dijelaskan langkah demi langkah.</span>
          </Link>

          <dl className="mt-8 space-y-5 text-base">
            <div><dt className="font-bold">Email</dt><dd className="mt-1"><a className="font-semibold text-link underline underline-offset-4" href={`mailto:${SITE.email}`}>{SITE.email}</a></dd></div>
            <div><dt className="font-bold">Dikelola oleh</dt><dd className="mt-1 leading-7 text-muted">{SITE.operator}<br />{SITE.address}</dd></div>
          </dl>
        </div>
        <ContactForm />
      </div>
    </SiteShell>
  );
}