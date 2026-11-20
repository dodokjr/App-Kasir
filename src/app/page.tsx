import Link from "next/link";
import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import SiteShell from "@/components/SiteShell";
import HeroDemo from "@/components/HeroDemo";
import PosDemo from "@/components/PosDemo";
import { Faq, HeroSky, MobileCta, RevealTitle } from "@/components/PageParts";
import {
  Reveal,
  ScrollProgress,
  LiveMonitor,
  PaymentChips,
  PpnDemo,
  TutupKasirDemo,
  RoleExplorer,
  Steps,
} from "@/components/Interactive";

/*
  Keyframes pop / flash / fill / flow dan kelas .reveal tetap ada karena dipakai komponen Interactive.
*/
const CSS = `
.reveal{opacity:0;transform:translateY(22px);transition:opacity .65s cubic-bezier(.2,.7,.2,1),transform .65s cubic-bezier(.2,.7,.2,1)}
.reveal-in{opacity:1;transform:none}

/* Pembuka hero: judul naik baris demi baris, sisanya menyusul */
@keyframes rise{to{transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.line{display:block;overflow:hidden;padding-bottom:.12em;margin-bottom:-.12em}
.line>span{display:block;transform:translateY(110%);animation:rise .85s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:var(--d,0ms)}
.fade-up{opacity:0;animation:fadeUp .7s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:var(--d,0ms)}

/* Judul section: naik dari balik garis saat masuk layar */
.rt{overflow:hidden;padding-bottom:.12em;margin-bottom:-.12em}
.rt>span{display:block;transform:translateY(110%);transition:transform .8s cubic-bezier(.2,.7,.2,1)}
.rt[data-in]>span{transform:none}

/* Centang tergambar */
@keyframes draw{to{stroke-dashoffset:0}}
.tick path{stroke-dasharray:24;stroke-dashoffset:24;animation:draw .5s ease forwards;animation-delay:var(--d,0ms)}

/* Ganti isi panel: naik tipis sambil muncul */
@keyframes swap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.anim-swap{animation:swap .35s cubic-bezier(.2,.7,.2,1) both}

/* Latar hero, badge melayang, dan pita jenis usaha */
@keyframes blob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-50px) scale(1.12)}66%{transform:translate(-30px,30px) scale(.94)}}
.anim-blob{animation:blob 14s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-12px) rotate(1deg)}}
.anim-float{animation:float 5s ease-in-out infinite}
@keyframes marquee{to{transform:translateX(-50%)}}
.anim-marquee{animation:marquee 30s linear infinite}

/* Bintang */
@keyframes twinkle{0%,100%{opacity:.15;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}
.star{opacity:.15;animation:twinkle var(--t,4s) ease-in-out infinite}
@keyframes shoot{0%{transform:translate3d(0,0,0) rotate(32deg);opacity:0}4%{opacity:1}18%{transform:translate3d(300px,187px,0) rotate(32deg);opacity:0}100%{transform:translate3d(300px,187px,0) rotate(32deg);opacity:0}}
.shoot{opacity:0;transform-origin:left center;animation:shoot var(--t,10s) linear infinite}
[data-paused="true"] .star,[data-paused="true"] .shoot{animation-play-state:paused}

/* Struk dicetak: turun per langkah seperti mesin thermal */
@keyframes print{from{transform:translateY(-101%)}to{transform:none}}
.paper-print{animation:print 1.6s steps(20,end) both}

/* Garis atas kartu tumbuh dari kiri saat disentuh */
.card-line{position:relative;overflow:hidden}
.card-line::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:rgb(var(--accent));transform:scaleX(0);transform-origin:left;transition:transform .45s cubic-bezier(.2,.7,.2,1)}
.card-line:hover::before,.card-line:focus-within::before{transform:scaleX(1)}

/* Dipakai komponen Interactive */
@keyframes flow{0%{background-position:0% 50%}100%{background-position:100% 50%}}
.bg-flow{background-size:200% 100%;animation:flow 7s ease-in-out infinite alternate}
@keyframes pop{0%{transform:scale(.92);opacity:.3}60%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
.anim-pop{animation:pop .4s cubic-bezier(.2,.8,.2,1) both}
@keyframes flash{0%{background-color:rgb(var(--accent) / .35)}100%{background-color:transparent}}
.anim-flash{animation:flash 1.2s ease-out}
@keyframes fill{from{width:0}to{width:100%}}
.anim-fill{animation:fill linear forwards}

@media (prefers-reduced-motion:reduce){
  .reveal{opacity:1;transform:none;transition:none}
  .line>span{transform:none;animation:none}
  .fade-up{opacity:1;animation:none}
  .rt>span{transform:none;transition:none}
  .tick path{stroke-dashoffset:0;animation:none}
  .card-line::before{transition:none}
  .paper-print{animation:none}
  .star{animation:none;opacity:.6}
  .shoot{display:none}
  .anim-blob,.anim-float,.anim-marquee{animation:none!important}
  .bg-flow,.anim-pop,.anim-flash,.anim-fill,.anim-swap{animation:none!important}
}
`;

const Check = ({ d = 0 }: { d?: number }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="tick mt-0.5 flex-none text-accent dark:text-link" style={{ ["--d" as string]: `${d}ms` }} aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);

const Icon = ({ children }: { children: ReactNode }) => (
  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110 dark:text-link">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  </span>
);

const CARD = "card-line group h-full border border-line bg-paper p-6 transition-colors duration-200 hover:border-accent/60 sm:p-8";

const GRAD = "bg-gradient-to-r from-accent via-[rgb(var(--accent-2))] to-sun bg-flow bg-clip-text text-transparent";

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
] as const;

const d = (ms: number) => ({ ["--d" as string]: `${ms}ms` });

export default async function Home() {
  const s = await getSession();

  return (
    <SiteShell>
      <style>{CSS}</style>
      <ScrollProgress />

      {/* Hero */}
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="bg-aurora absolute inset-0" />
          <div className="bg-dots absolute inset-0" />
          <div className="anim-blob absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent/25 blur-3xl" />
          <div className="anim-blob absolute right-0 top-24 h-96 w-96 rounded-full bg-sun/30 blur-3xl [animation-delay:-5s]" />
          <div className="anim-blob absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[rgb(var(--accent-2)/0.25)] blur-3xl [animation-delay:-9s]" />
        </div>
        <HeroSky />

        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div>
            <h1 className="text-[clamp(2.35rem,7.5vw,4.1rem)] font-extrabold leading-[1.05] tracking-tight">
              <span className="line"><span style={d(0)}>Kasir yang <span className={GRAD}>paham</span></span></span>
              <span className="line"><span style={d(110)}><span className={GRAD}>jenis usaha Anda.</span></span></span>
            </h1>

            <p className="fade-up mt-6 max-w-[48ch] text-lg leading-8 text-muted sm:text-xl sm:leading-9" style={d(420)}>
              Untuk warung makan, toko barang, dan toko sembako. Catat penjualan, cetak struk, dan pantau semua cabang dari browser, tanpa pasang aplikasi.
            </p>

            <div className="fade-up mt-8 flex flex-col gap-3 sm:flex-row" style={d(540)}>
              <Link href="/register" className="btn-primary btn-lg justify-center transition-transform duration-150 active:scale-[0.98]">Daftarkan toko</Link>
              <Link href="/docs" className="btn-ghost btn-lg justify-center transition-transform duration-150 active:scale-[0.98]">Lihat cara pakainya</Link>
            </div>

            <ul className="mt-9 space-y-3 text-base">
              {["Data tersimpan di Google Sheets milik Anda sendiri", "Cetak ke printer thermal, atau simpan sebagai PDF", "Satu toko bisa punya banyak cabang dan banyak kasir"].map((t, i) => (
                <li key={t} className="fade-up flex gap-3" style={d(680 + i * 130)}>
                  <Check d={780 + i * 130} />{t}
                </li>
              ))}
            </ul>
          </div>

          <div className="fade-up" style={d(300)}>
            <HeroDemo />
          </div>
        </section>
      </div>

      {/* Pita bergerak, berhenti saat di-hover */}
      <div className="overflow-hidden border-y border-line bg-surface py-4" aria-hidden="true">
        <div className="anim-marquee flex w-max gap-10 pr-10 hover:[animation-play-state:paused]">
          {[...MARQUEE, ...MARQUEE].map(([t, c], i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap text-lg font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${c}`} />{t}
            </span>
          ))}
        </div>
      </div>

      {/* Coba kasir */}
      <section className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
        <div className="max-w-[56ch]">
          <RevealTitle className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Coba melayani satu pembeli</RevealTitle>
          <Reveal delay={120}>
            <p className="mt-4 text-lg leading-8 text-muted">Ketuk menu untuk menambah pesanan, lihat struk bertambah, lalu bayar. Ini simulasi, tidak ada data yang disimpan.</p>
          </Reveal>
        </div>
        <div className="mt-10"><PosDemo /></div>
      </section>

      {/* Fitur */}
      <section id="fitur" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <div className="max-w-[60ch]">
            <RevealTitle className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Dibuat untuk pekerjaan kasir sehari-hari</RevealTitle>
            <Reveal delay={120}>
              <p className="mt-4 text-lg leading-8 text-muted">Dari melayani pembeli sampai menutup kasir di malam hari, semua langkah dibuat singkat dan jelas. Semua contoh di bawah bisa Anda coba.</p>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-6 lg:gap-5">
            <Reveal className="md:col-span-2 lg:col-span-4">
              <div className={`${CARD} rounded-3xl`}>
                <h3 className="text-2xl font-bold tracking-tight">Pantau kasir semua cabang dari mana saja</h3>
                <p className="mt-2 max-w-[52ch] leading-7 text-muted">Kepala toko dan kepala cabang bisa melihat siapa yang sedang online, kasir mana yang masih dibuka, dan berapa penjualannya hari ini. Kasir yang terbuka tetapi terputus ditandai agar cepat dicek.</p>
                <LiveMonitor />
              </div>
            </Reveal>

            <Reveal delay={90} className="md:col-span-2 lg:col-span-2">
              <div className="h-full rounded-3xl bg-accent-dark p-6 text-white sm:p-8">
                <h3 className="text-2xl font-bold tracking-tight">Terima pembayaran dengan cara apa pun</h3>
                <p className="mt-2 leading-7 text-white/85">Cash dan transfer bank selalu ada. Kepala toko menambah sisanya sendiri.</p>
                <PaymentChips />
              </div>
            </Reveal>

            <Reveal delay={0} className="lg:col-span-2">
              <div className={`${CARD} rounded-2xl`}>
                <Icon><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /><path d="M19 5 5 19" /></Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">PPN sesuai aturan toko</h3>
                <p className="mt-2 leading-7 text-muted">Nyalakan atau matikan kapan saja. Pilih 11%, 12%, atau tarif lain, dan tentukan harga sudah termasuk PPN atau belum. Struk lama tidak berubah.</p>
                <PpnDemo />
              </div>
            </Reveal>

            <Reveal delay={90} className="lg:col-span-2">
              <div className={`${CARD} rounded-2xl`}>
                <Icon><path d="M6 3v12" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">Banyak cabang, stok sendiri-sendiri</h3>
                <p className="mt-2 leading-7 text-muted">Setiap cabang punya produk, kasir, dan riwayat transaksinya sendiri. Nama cabang dan jalan ikut tercetak di struk.</p>
                <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
                  {["Melati", "Pasar Baru", "Anggrek"].map((n) => (
                    <span key={n} className="rounded-full border border-line px-3 py-1 transition-[transform,border-color,color] duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-accent dark:hover:text-link">Cabang {n}</span>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={180} className="md:col-span-2 lg:col-span-2">
              <div className={`${CARD} rounded-2xl`}>
                <Icon><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">Tutup kasir tanpa pusing</h3>
                <p className="mt-2 leading-7 text-muted">Isi uang yang Anda hitung di laci, dan selisihnya langsung terlihat. Hanya uang tunai yang dihitung, pembayaran lain dipisah.</p>
                <TutupKasirDemo />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Peran */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.5fr] lg:gap-14 lg:py-24">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <RevealTitle className="max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Setiap orang hanya melihat yang perlu ia kerjakan</RevealTitle>
          <Reveal delay={120}>
            <p className="mt-4 max-w-[44ch] text-lg leading-8 text-muted">Kasir tidak bisa mengubah harga, gudang tidak bisa melihat keuangan, dan kepala cabang hanya mengatur cabangnya sendiri. Klik peran untuk melihat bedanya.</p>
          </Reveal>
        </div>
        <Reveal delay={150}><RoleExplorer /></Reveal>
      </section>

      {/* Cara mulai */}
      <section id="cara-mulai" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <RevealTitle className="text-3xl font-extrabold tracking-tight sm:text-4xl">Mulai dalam tiga langkah</RevealTitle>
          <Steps />
          <div className="mt-10">
            <Link href="/register" className="btn-primary btn-lg w-full justify-center transition-transform duration-150 active:scale-[0.98] sm:w-auto">Daftarkan toko</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
        <RevealTitle className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pertanyaan yang sering muncul</RevealTitle>
        <div className="mt-8">
          <Faq items={FAQ} />
        </div>
        <p className="mt-6 text-base text-muted">
          Belum terjawab?{" "}
          <Link href="/kontak" className="font-semibold text-link underline underline-offset-4">Tanya langsung ke kami</Link>.
        </p>
      </section>

      <MobileCta loggedIn={!!s} />
    </SiteShell>
  );
}