import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kontak | Kasir Toko" };

export default function Kontak() {
  return (
    <SiteShell>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-10 md:grid-cols-[1fr_1.3fr]">
        <div>
          <h1 className="text-2xl font-semibold">Hubungi kami</h1>
          <p className="mt-3 max-w-[44ch] leading-7 text-muted">Ada pertanyaan, kendala, atau permintaan penghapusan data? Kirim pesan dan kami balas lewat email.</p>
          <dl className="mt-6 space-y-4 text-sm">
            <div><dt className="font-medium">Email</dt><dd className="mt-0.5"><a className="text-link underline underline-offset-2" href={`mailto:${SITE.email}`}>{SITE.email}</a></dd></div>
            <div><dt className="font-medium">Pengelola</dt><dd className="mt-0.5 text-muted">{SITE.operator}<br />{SITE.address}</dd></div>
          </dl>
        </div>
        <ContactForm />
      </div>
    </SiteShell>
  );
}
