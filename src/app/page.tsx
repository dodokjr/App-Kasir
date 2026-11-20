import Link from "next/link";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import HeroDemo from "@/components/HeroDemo";
import {
  Reveal,
  ScrollProgress,
  LiveMonitor,
  PaymentChips,
  PpnDemo,
  TutupKasirDemo,
  RoleExplorer,
  Steps,
} from "@/components/Interactive"; // sesuaikan path, misalnya "@/components/Interactive"

const CSS = `
.reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.reveal-in{opacity:1;transform:none}

@keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.12)}66%{transform:translate(-30px,30px) scale(.94)}}
.anim-blob{animation:blob 14s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-12px) rotate(1deg)}}
.anim-float{animation:float 5s ease-in-out infinite}
@keyframes flow{0%{background-position:0% 50%}100%{background-position:100% 50%}}
.bg-flow{background-size:200% 100%;animation:flow 7s ease-in-out infinite alternate}
@keyframes marquee{to{transform:translateX(-50%)}}
.anim-marquee{animation:marquee 30s linear infinite}
@keyframes pop{0%{transform:scale(.92);opacity:.3}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
.anim-pop{animation:pop .4s cubic-bezier(.2,.8,.2,1) both}
@keyframes flash{0%{background-color:rgb(var(--accent) / .35)}100%{background-color:transparent}}
.anim-flash{animation:flash 1.2s ease-out}
@keyframes fill{from{width:0}to{width:100%}}
.anim-fill{animation:fill linear forwards}
@keyframes shine{0%,55%{transform:translateX(-130%)}100%{transform:translateX(130%)}}
.btn-shine{position:relative;overflow:hidden}
.btn-shine::after{content:"";position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgb(255 255 255 / .38) 50%,transparent 70%);transform:translateX(-130%);animation:shine 3.6s ease-in-out infinite}
.btn-lift{transition:transform .2s ease,box-shadow .2s ease}
.btn-lift:hover{transform:translateY(-3px) scale(1.03);box-shadow:0 14px 28px -12px rgb(0 0 0 / .35)}
.btn-lift:active{transform:scale(.98)}
.card-hover{transition:transform .3s ease,box-shadow .3s ease,border-color .3s ease}
.card-hover:hover{transform:translateY(-6px);box-shadow:0 22px 44px -22px rgb(0 0 0 / .35)}
.icon-wiggle{transition:transform .35s ease}
.card-hover:hover .icon-wiggle{transform:rotate(-8deg) scale(1.12)}
@keyframes faqIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
details.faq[open]>p{animation:faqIn .35s ease}
details.faq{transition:background-color .2s ease}
details.faq:hover{background-color:rgb(var(--accent) / .08)}

@media (prefers-reduced-motion:reduce){
  .reveal{opacity:1;transform:none;transition:none}
  .anim-blob,.anim-float,.bg-flow,.anim-marquee,.anim-pop,.anim-flash,.anim-fill,.btn-shine::after{animation:none!important}
  .btn-lift:hover,.card-hover:hover{transform:none}
}
`;

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none text-accent dark:text-link" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

const TONES = {
  sky: "bg-sky-500/15 text-sky-600 dark:text-sky-300",
  violet: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
  amber: "bg-amber-500/20 text-amber-600 dark:text-amber-300",
} as const;

const Icon = ({ children, tone }: { children: ReactNode; tone: keyof typeof TONES }) => (
  <span className={`icon-wiggle flex h-12 w-12 items-center justify-center rounded-2xl ${TONES[tone]}`}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  </span>
);

const Eyebrow = ({ children }: { children: ReactNode }) => (
  <span className="mb-4 inline-block rounded-full bg-sun px-3.5 py-1 text-sm font-bold text-sun-ink">{children}</span>
);

const MARQUEE: [string, string][] = [
  ["Warung makan", "bg-rose-500"],
  ["Toko barang", "bg-sky-500"],
  ["Toko sembako", "bg-amber-500"],
  ["Banyak cabang", "bg-violet-500"],
  ["Cetak struk", "bg-accent"],
  ["Tutup kasir", "bg-fuchsia-500"],
  ["Kasir tetap jalan tanpa internet", "bg-teal-500"],
  ["PPN fleksibel", "bg-orange-500"],
];

const FAQ = [
  ["Apakah perlu server atau database?", "Tidak. Semua data disimpan di Google Sheets milik Anda sendiri, jadi Anda bisa melihat dan mengunduhnya kapan saja. Anda hanya perlu membuat spreadsheet dan akun layanan Google."],
  ["Apakah bisa dipakai tanpa internet?", "Halaman Kasir bisa. Jika internet mati, kasir tetap menjual dan mencetak struk, dan transaksinya dikirim otomatis saat internet kembali. Syaratnya, halaman Kasir pernah dibuka saat online di perangkat itu dan kasir sudah dibuka. Membuka dan menutup kasir, serta halaman lain, tetap butuh internet."],
  ["Bagaimana dengan PPN?", "Kepala toko yang menentukan. PPN bisa dinyalakan atau dimatikan, tarifnya bisa 11%, 12%, atau angka lain, dan bisa ditambahkan di atas harga atau sudah termasuk di harga. Soal kewajiban pajak, tanyakan ke konsultan pajak."],
  ["Printer apa yang didukung?", "Printer thermal 58 mm atau 80 mm lewat tombol Cetak di browser. Tanpa printer, struk bisa disimpan sebagai PDF."],
  ["Berapa banyak cabang yang bisa dibuat?", "Tidak ada batas di aplikasi. Setiap cabang punya stok, kasir, dan riwayat transaksinya sendiri."],
  ["Apakah cocok untuk toko besar?", "Cocok untuk toko kecil sampai menengah. Google Sheets membatasi jumlah permintaan per menit, dan dua kasir yang menjual produk yang sama di detik yang sama bisa membuat stok meleset."],
];

export default function Home() {
  return (
    <SiteShell>
      <style>{CSS}</style>
      <ScrollProgress />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="bg-aurora absolute inset-0" />
          <div className="bg-dots absolute inset-0" />
          <div className="anim-blob absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
          <div className="anim-blob absolute right-0 top-24 h-96 w-96 rounded-full bg-sun/30 blur-3xl [animation-delay:-5s]" />
          <div className="anim-blob absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[rgb(var(--accent-2)/0.25)] blur-3xl [animation-delay:-9s]" />
        </div>

        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-24 lg:pt-16">
          <div>
            <Reveal>
              <h1 className="max-w-[16ch] text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                Kasir yang{" "}
                <span className="bg-gradient-to-r from-accent via-[rgb(var(--accent-2))] to-sun bg-flow bg-clip-text text-transparent">
                  paham jenis usaha Anda.
                </span>
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-6 max-w-[48ch] text-lg leading-8 text-muted sm:text-xl sm:leading-9">
                Untuk warung makan, toko barang, dan toko sembako. Catat penjualan, cetak struk, dan pantau semua cabang dari browser, tanpa pasang aplikasi.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/register" className="btn-primary btn-lg btn-shine btn-lift">Daftarkan toko</Link>
                <Link href="/docs" className="btn-ghost btn-lg btn-lift">Lihat cara pakainya</Link>
              </div>
            </Reveal>
            <ul className="mt-9 space-y-3 text-base">
              {["Data tersimpan di Google Sheets milik Anda sendiri", "Cetak ke printer thermal, atau simpan sebagai PDF", "Satu toko bisa punya banyak cabang dan banyak kasir"].map((t, i) => (
                <li key={t}>
                  <Reveal delay={360 + i * 120} className="flex gap-3"><Check />{t}</Reveal>
                </li>
              ))}
            </ul>
          </div>

          <Reveal delay={200}>
            <div className="relative">
              <div className="anim-float"><HeroDemo /></div>
              <div className="anim-float absolute -left-6 top-10 hidden items-center gap-2 rounded-2xl bg-accent px-4 py-2 text-sm font-bold text-white shadow-xl lg:flex [animation-delay:-2s]">
                <Check /> Struk tercetak
              </div>
              <div className="anim-float absolute -right-3 bottom-10 hidden rounded-2xl bg-sun px-4 py-2 text-sm font-bold text-sun-ink shadow-xl lg:block [animation-delay:-3.5s]">
                Stok diperbarui
              </div>
            </div>
          </Reveal>
        </section>
      </div>

      {/* Pita bergerak */}
      <div className="overflow-hidden border-y border-line bg-surface py-4" aria-hidden="true">
        <div className="anim-marquee flex w-max gap-10 pr-10 hover:[animation-play-state:paused]">
          {[...MARQUEE, ...MARQUEE].map(([t, c], i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-lg font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${c}`} />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Fitur */}
      <section id="fitur" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <Reveal>
            <Eyebrow>Fitur</Eyebrow>
            <h2 className="max-w-[24ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Dibuat untuk pekerjaan kasir sehari-hari</h2>
            <p className="mt-4 max-w-[58ch] text-lg leading-8 text-muted">Dari melayani pembeli sampai menutup kasir di malam hari, semua langkah dibuat singkat dan jelas. Semua contoh di bawah bisa Anda coba.</p>
          </Reveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-6">
            {/* Pantau kasir */}
            <Reveal className="lg:col-span-4">
              <div className="card-hover glow-border h-full rounded-3xl border border-line border-t-4 border-t-accent bg-paper p-6 sm:p-8">
                <h3 className="text-2xl font-bold tracking-tight">Pantau kasir semua cabang dari mana saja</h3>
                <p className="mt-2 max-w-[52ch] leading-7 text-muted">Kepala toko dan kepala cabang bisa melihat siapa yang sedang online, kasir mana yang masih dibuka, dan berapa penjualannya hari ini. Kasir yang terbuka tetapi terputus ditandai agar cepat dicek.</p>
                <LiveMonitor />
              </div>
            </Reveal>

            {/* Pembayaran */}
            <Reveal delay={120} className="lg:col-span-2">
              <div className="card-hover glow-border h-full rounded-3xl bg-gradient-to-br from-accent via-[rgb(var(--accent-2))] to-accent-dark bg-flow p-6 text-white sm:p-8">
                <h3 className="text-2xl font-bold tracking-tight">Terima pembayaran dengan cara apa pun</h3>
                <p className="mt-2 leading-7 text-white/85">Cash dan transfer bank selalu ada. Kepala toko menambah sisanya sendiri.</p>
                <PaymentChips />
              </div>
            </Reveal>

            {/* PPN */}
            <Reveal delay={0} className="lg:col-span-2">
              <div className="card-hover glow-border h-full rounded-3xl border border-line border-t-4 border-t-violet-500 bg-paper p-6">
                <Icon tone="violet"><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /><path d="M19 5 5 19" /></Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">PPN sesuai aturan toko</h3>
                <p className="mt-2 leading-7 text-muted">Nyalakan atau matikan kapan saja. Pilih 11%, 12%, atau tarif lain, dan tentukan harga sudah termasuk PPN atau belum. Struk lama tidak berubah.</p>
                <PpnDemo />
              </div>
            </Reveal>

            {/* Cabang */}
            <Reveal delay={120} className="lg:col-span-2">
              <div className="card-hover glow-border h-full rounded-3xl border border-line border-t-4 border-t-sky-500 bg-paper p-6">
                <Icon tone="sky"><path d="M6 3v12" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">Banyak cabang, stok sendiri-sendiri</h3>
                <p className="mt-2 leading-7 text-muted">Setiap cabang punya produk, kasir, dan riwayat transaksinya sendiri. Nama cabang dan jalan ikut tercetak di struk.</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                  {[["Melati", "bg-rose-500/15 text-rose-700 dark:text-rose-300"], ["Pasar Baru", "bg-amber-500/20 text-amber-700 dark:text-amber-300"], ["Anggrek", "bg-sky-500/15 text-sky-700 dark:text-sky-300"]].map(([n, c]) => (
                    <span key={n} className={`rounded-full px-3 py-1 transition-transform hover:-translate-y-1 hover:scale-105 ${c}`}>Cabang {n}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Tutup kasir */}
            <Reveal delay={240} className="lg:col-span-2">
              <div className="card-hover glow-border h-full rounded-3xl border border-line border-t-4 border-t-amber-500 bg-paper p-6">
                <Icon tone="amber"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">Tutup kasir tanpa pusing</h3>
                <p className="mt-2 leading-7 text-muted">Isi uang yang Anda hitung di laci, dan selisihnya langsung terlihat. Hanya uang tunai yang dihitung, pembayaran lain dipisah.</p>
                <TutupKasirDemo />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Peran */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.5fr] lg:py-24">
        <Reveal>
          <Eyebrow>Peran</Eyebrow>
          <h2 className="max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Setiap orang hanya melihat yang perlu ia kerjakan</h2>
          <p className="mt-4 max-w-[44ch] text-lg leading-8 text-muted">Kasir tidak bisa mengubah harga, gudang tidak bisa melihat keuangan, dan kepala cabang hanya mengatur cabangnya sendiri. Klik peran untuk melihat bedanya.</p>
        </Reveal>
        <Reveal delay={150}>
          <RoleExplorer />
        </Reveal>
      </section>

      {/* Cara mulai */}
      <section id="cara-mulai" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <Reveal>
            <Eyebrow>Cara mulai</Eyebrow>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Mulai dalam tiga langkah</h2>
          </Reveal>
          <Steps />
          <Reveal className="mt-10"><Link href="/register" className="btn-primary btn-lg btn-shine btn-lift">Daftarkan toko</Link></Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
        <Reveal>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pertanyaan yang sering muncul</h2>
        </Reveal>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a], i) => (
            <Reveal key={q} delay={i * 60}>
              <details className="faq">
                <summary>{q}</summary>
                <p className="-mt-1 pb-5 text-base leading-8 text-muted">{a}</p>
              </details>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-base text-muted">Belum terjawab? <Link href="/kontak" className="font-semibold text-link underline underline-offset-4">Tanya langsung ke kami</Link>.</p>
      </section>

      {/* Ajakan */}
      <section className="mx-auto max-w-6xl px-4 pb-16 lg:pb-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-accent via-[rgb(var(--accent-2))] to-accent-dark bg-flow px-6 py-10 text-white sm:px-12 sm:py-14">
            <div className="anim-blob pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-sun/30 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-wrap items-center justify-between gap-6">
              <div>
                <h2 className="max-w-[22ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Siap mencatat penjualan hari ini?</h2>
                <p className="mt-3 max-w-[44ch] text-lg text-white/85">Daftar dan buka kasir pertama Anda dalam beberapa menit.</p>
              </div>
              <Link href="/register" className="btn btn-lg btn-shine btn-lift bg-sun text-sun-ink hover:brightness-95">Daftarkan toko</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </SiteShell>
  );
}