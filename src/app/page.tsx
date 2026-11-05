import Link from "next/link";
import type { ReactNode } from "react";
import SiteShell from "@/components/SiteShell";
import HeroDemo from "@/components/HeroDemo";

const Check = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none text-accent dark:text-link" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
);
const Icon = ({ children }: { children: ReactNode }) => (
  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:text-link">
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
  </span>
);

const ROLES = [
  ["Kepala toko", "Mendaftarkan toko, menambah cabang dan tim, mengatur jenis usaha, PPN, dan metode pembayaran, serta melihat stok, transaksi, dan keuangan semua cabang."],
  ["Kepala cabang", "Mengelola kasir dan gudang di cabangnya, memantau kasir yang sedang online, dan melihat keuangan cabang."],
  ["Kasir", "Membuka kasir, melayani pembeli, mencetak struk, lalu menutup kasir dengan laporan penjualan shift."],
  ["Gudang", "Menambah produk, mengubah harga, dan memperbarui stok cabang."],
];

const FAQ = [
  ["Apakah perlu server atau database?", "Tidak. Semua data disimpan di Google Sheets milik Anda sendiri, jadi Anda bisa melihat dan mengunduhnya kapan saja. Anda hanya perlu membuat spreadsheet dan akun layanan Google."],
  ["Apakah bisa dipakai tanpa internet?", "Belum. Aplikasi membutuhkan internet. Jika koneksi kasir putus, kasir diberi peringatan, tombol bayar dinonaktifkan, dan kepala cabang melihat kasir itu offline. Transaksi offline yang dikirim belakangan belum didukung."],
  ["Bagaimana dengan PPN?", "Kepala toko yang menentukan. PPN bisa dinyalakan atau dimatikan, tarifnya bisa 11%, 12%, atau angka lain, dan bisa ditambahkan di atas harga atau sudah termasuk di harga. Soal kewajiban pajak, tanyakan ke konsultan pajak."],
  ["Printer apa yang didukung?", "Printer thermal 58 mm atau 80 mm lewat tombol Cetak di browser. Tanpa printer, struk bisa disimpan sebagai PDF."],
  ["Berapa banyak cabang yang bisa dibuat?", "Tidak ada batas di aplikasi. Setiap cabang punya stok, kasir, dan riwayat transaksinya sendiri."],
  ["Apakah cocok untuk toko besar?", "Cocok untuk toko kecil sampai menengah. Google Sheets membatasi jumlah permintaan per menit, dan dua kasir yang menjual produk yang sama di detik yang sama bisa membuat stok meleset."],
];

export default function Home() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 lg:grid-cols-[1fr_1.05fr] lg:gap-14 lg:pb-24 lg:pt-16">
        <div>
          <h1 className="max-w-[16ch] text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">Kasir yang paham jenis usaha Anda.</h1>
          <p className="mt-6 max-w-[48ch] text-lg leading-8 text-muted sm:text-xl sm:leading-9">
            Untuk warung makan, toko barang, dan toko sembako. Catat penjualan, cetak struk, dan pantau semua cabang dari browser, tanpa pasang aplikasi.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary btn-lg">Daftarkan toko</Link>
            <Link href="/docs" className="btn-ghost btn-lg">Lihat cara pakainya</Link>
          </div>
          <ul className="mt-9 space-y-3 text-base">
            {["Data tersimpan di Google Sheets milik Anda sendiri", "Cetak ke printer thermal, atau simpan sebagai PDF", "Satu toko bisa punya banyak cabang dan banyak kasir"].map((t) => (
              <li key={t} className="flex gap-3"><Check />{t}</li>
            ))}
          </ul>
        </div>
        <HeroDemo />
      </section>

      {/* Fitur */}
      <section id="fitur" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <h2 className="max-w-[24ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Dibuat untuk pekerjaan kasir sehari-hari</h2>
          <p className="mt-4 max-w-[58ch] text-lg leading-8 text-muted">Dari melayani pembeli sampai menutup kasir di malam hari, semua langkah dibuat singkat dan jelas.</p>

          <div className="mt-10 grid gap-5 lg:grid-cols-6">
            {/* Pantau kasir */}
            <div className="rounded-3xl border border-line bg-paper p-6 sm:p-8 lg:col-span-4">
              <h3 className="text-2xl font-bold tracking-tight">Pantau kasir semua cabang dari mana saja</h3>
              <p className="mt-2 max-w-[52ch] leading-7 text-muted">Kepala toko dan kepala cabang bisa melihat siapa yang sedang online, kasir mana yang masih dibuka, dan berapa penjualannya hari ini. Kasir yang terbuka tetapi terputus ditandai agar cepat dicek.</p>
              <div className="mt-6 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface text-[15px]" aria-hidden="true">
                {[
                  ["Sari", "Cabang Melati", "Online", "Rp 1.240.000", "ok"],
                  ["Dimas", "Cabang Pasar Baru", "Offline, kasir masih dibuka", "Rp 860.000", "warn"],
                  ["Rina", "Cabang Anggrek", "Online", "Rp 2.015.500", "ok"],
                ].map(([n, b, st, v, k]) => (
                  <div key={n} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5">
                    <div className="min-w-[120px] flex-1"><div className="font-semibold">{n}</div><div className="text-sm text-muted">{b}</div></div>
                    <div className={`flex items-center gap-2 font-medium ${k === "warn" ? "text-danger" : ""}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${k === "warn" ? "bg-danger" : "bg-accent"}`} />{st}
                    </div>
                    <div className="w-32 text-right font-mono text-sm">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pembayaran */}
            <div className="rounded-3xl bg-accent p-6 text-white sm:p-8 lg:col-span-2">
              <h3 className="text-2xl font-bold tracking-tight">Terima pembayaran dengan cara apa pun</h3>
              <p className="mt-2 leading-7 text-white/85">Cash dan transfer bank selalu ada. Kepala toko menambah sisanya sendiri.</p>
              <ul className="mt-6 flex flex-wrap gap-2 text-sm font-semibold" aria-label="Contoh metode pembayaran">
                {["Cash", "Transfer bank"].map((t) => <li key={t} className="rounded-full bg-sun px-3.5 py-1.5 text-sun-ink">{t}</li>)}
                {["QRIS", "GoFood", "GrabFood", "ShopeeFood", "GoSend", "Grab Barang", "Paket", "OVO atau Dana"].map((t) => <li key={t} className="rounded-full border border-white/40 px-3.5 py-1.5">{t}</li>)}
              </ul>
            </div>

            {[
              [<><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="17" r="2.5" /><path d="M19 5 5 19" /></>, "PPN sesuai aturan toko", "Nyalakan atau matikan kapan saja. Pilih 11%, 12%, atau tarif lain, dan tentukan harga sudah termasuk PPN atau belum. Struk lama tidak berubah."],
              [<><path d="M6 3v12" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="6" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></>, "Banyak cabang, stok sendiri-sendiri", "Setiap cabang punya produk, kasir, dan riwayat transaksinya sendiri. Nama cabang dan jalan ikut tercetak di struk."],
              [<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" /><path d="M12 17.5v-11" /></>, "Tutup kasir tanpa pusing", "Isi uang yang Anda hitung di laci, dan selisihnya langsung terlihat. Hanya uang tunai yang dihitung, pembayaran lain dipisah."],
            ].map(([ic, t, d], i) => (
              <div key={i} className="rounded-3xl border border-line bg-paper p-6 lg:col-span-2">
                <Icon>{ic as ReactNode}</Icon>
                <h3 className="mt-4 text-xl font-bold tracking-tight">{t as string}</h3>
                <p className="mt-2 leading-7 text-muted">{d as string}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Peran */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1fr_1.5fr] lg:py-24">
        <div>
          <h2 className="max-w-[20ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Setiap orang hanya melihat yang perlu ia kerjakan</h2>
          <p className="mt-4 max-w-[44ch] text-lg leading-8 text-muted">Kasir tidak bisa mengubah harga, gudang tidak bisa melihat keuangan, dan kepala cabang hanya mengatur cabangnya sendiri.</p>
        </div>
        <dl className="divide-y divide-line border-y border-line">
          {ROLES.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-5 sm:grid-cols-[150px_1fr] sm:gap-6">
              <dt className="text-lg font-bold">{t}</dt><dd className="leading-7 text-muted">{d}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Cara mulai */}
      <section id="cara-mulai" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:py-24">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Mulai dalam tiga langkah</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              ["Daftarkan toko", "Isi nama toko, pilih jenis usaha, lalu buat akun kepala toko. Cabang pertama langsung jadi."],
              ["Tambah cabang dan tim", "Buat cabang lain bila perlu, lalu tambahkan kepala cabang, kasir, dan gudang. Atur PPN dan metode pembayaran di Pengaturan."],
              ["Isi produk dan mulai jualan", "Gudang mengisi produk. Kasir membuka kasir, melayani pembeli, mencetak struk, dan menutup kasir di akhir shift."],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sun text-lg font-extrabold text-sun-ink" aria-hidden="true">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold tracking-tight">{t}</h3>
                <p className="mt-2 leading-7 text-muted">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10"><Link href="/register" className="btn-primary btn-lg">Daftarkan toko</Link></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Pertanyaan yang sering muncul</h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="faq">
              <summary>{q}</summary>
              <p className="-mt-1 pb-5 text-base leading-8 text-muted">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-base text-muted">Belum terjawab? <Link href="/kontak" className="font-semibold text-link underline underline-offset-4">Tanya langsung ke kami</Link>.</p>
      </section>

      {/* Ajakan */}
      <section className="mx-auto max-w-6xl px-4 pb-16 lg:pb-24">
        <div className="flex flex-wrap items-center justify-between gap-6 rounded-[2rem] bg-accent px-6 py-10 text-white sm:px-12 sm:py-14">
          <div>
            <h2 className="max-w-[22ch] text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Siap mencatat penjualan hari ini?</h2>
            <p className="mt-3 max-w-[44ch] text-lg text-white/85">Daftar dan buka kasir pertama Anda dalam beberapa menit.</p>
          </div>
          <Link href="/register" className="btn btn-lg bg-sun text-sun-ink hover:brightness-95">Daftarkan toko</Link>
        </div>
      </section>
    </SiteShell>
  );
}