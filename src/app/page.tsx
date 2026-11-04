import Link from "next/link";
import SiteShell from "@/components/SiteShell";

const ROLES = [
  ["Kepala toko", "Mendaftarkan toko, menambah cabang, mengatur seluruh tim, memantau stok, transaksi, dan keuangan semua cabang, serta mengatur tampilan struk."],
  ["Kepala cabang", "Mengelola kasir dan gudang di cabangnya sendiri serta melihat transaksi dan keuangan cabang."],
  ["Kasir", "Membuka kasir, melayani pembeli dan mencetak struk, lalu menutup kasir dengan laporan total penjualan shift."],
  ["Gudang", "Menambah produk, mengubah harga, dan memperbarui stok cabang."],
  ["Admin dan developer", "Melihat semua toko yang terdaftar dan menonaktifkan toko bila diperlukan."],
];

const FAQ = [
  ["Apakah perlu server database?", "Tidak. Semua data disimpan di Google Sheets milik Anda sendiri. Anda cukup membuat spreadsheet dan service account Google."],
  ["Berapa banyak cabang yang bisa dibuat?", "Tidak ada batas di aplikasi. Setiap cabang punya stok sendiri, dibedakan lewat nama cabang dan nama jalan."],
  ["Printer apa yang didukung?", "Struk dirancang untuk printer thermal 58mm atau 80mm lewat tombol Cetak di browser. Pilih lebar kertas di Pengaturan. Tanpa printer, simpan sebagai PDF."],
  ["Apa yang terjadi saat tutup kasir?", "Aplikasi menjumlahkan semua transaksi sejak kasir dibuka: jumlah transaksi, item terjual, dan total penjualan. Anda mengisi uang tunai yang ada di laci, lalu aplikasi menghitung selisihnya dan mencetak laporan."],
  ["Apakah ada mode gelap?", "Ada. Tombol tema di pojok kanan atas bisa memilih terang, gelap, atau mengikuti perangkat. Struk tetap dicetak dengan latar putih."],
  ["Apakah cocok untuk toko besar?", "Aplikasi ini cocok untuk toko kecil sampai menengah. Google Sheets membatasi jumlah permintaan per menit, dan dua kasir yang menjual produk sama di detik yang sama bisa membuat stok meleset."],
];

function Receipt() {
  const Row = ({ a, b, bold }: { a: string; b: string; bold?: boolean }) => (
    <div className={`flex justify-between gap-3 ${bold ? "font-medium" : ""}`}><span>{a}</span><span>{b}</span></div>
  );
  return (
    <div className="receipt-edge mx-auto w-full max-w-[320px] -rotate-1 bg-white px-5 pt-5 text-black font-mono text-[13px] leading-6 shadow-[0_12px_30px_-12px_rgba(22,33,43,0.35)]" aria-label="Contoh struk">
      <div className="text-center">
        <div className="text-sm font-medium">Toko Sumber Rejeki</div>
        <div>Cabang Melati</div>
        <div>Jl. Melati 12</div>
      </div>
      <hr className="my-3 border-dashed border-black/40" />
      <Row a="No" b="INV-20261104-83021" />
      <Row a="Kasir" b="Sari" />
      <hr className="my-3 border-dashed border-black/40" />
      <div>Beras 5 kg</div><Row a="1 x Rp 68.000" b="Rp 68.000" />
      <div>Minyak goreng 2 L</div><Row a="2 x Rp 36.000" b="Rp 72.000" />
      <div>Gula pasir 1 kg</div><Row a="1 x Rp 17.500" b="Rp 17.500" />
      <hr className="my-3 border-dashed border-black/40" />
      <Row a="Total" b="Rp 157.500" bold />
      <Row a="Bayar" b="Rp 160.000" />
      <Row a="Kembali" b="Rp 2.500" />
      <div className="mt-3 text-center">Terima kasih</div>
    </div>
  );
}

export default function Home() {
  return (
    <SiteShell>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1.2fr_1fr] lg:py-20">
        <div>
          <h1 className="max-w-[18ch] text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Satu toko, banyak cabang, satu struk yang rapi.</h1>
          <p className="mt-5 max-w-[56ch] text-lg leading-8 text-muted">
            Kasir berbasis web untuk toko yang punya lebih dari satu cabang. Kepala toko, kasir, dan gudang masing-masing punya akun sendiri, dan semua data tersimpan di Google Sheets milik Anda.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/register" className="btn-primary px-5 py-3 text-base">Daftarkan toko</Link>
            <Link href="/docs" className="btn-ghost px-5 py-3 text-base">Baca panduan</Link>
          </div>
        </div>
        <Receipt />
      </section>

      <section id="fitur" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-semibold">Setiap orang hanya melihat yang perlu dikerjakannya</h2>
            <p className="mt-3 max-w-[48ch] leading-7 text-muted">Hak akses mengikuti peran. Kasir tidak bisa mengubah harga, gudang tidak bisa melihat pengaturan tim, dan kepala cabang hanya bisa mengatur cabangnya.</p>
          </div>
          <dl className="divide-y divide-line border-y border-line">
            {ROLES.map(([t, d]) => (
              <div key={t} className="grid gap-1 py-4 sm:grid-cols-[170px_1fr] sm:gap-6">
                <dt className="font-medium">{t}</dt><dd className="leading-7 text-muted">{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Dari buka kasir sampai laporan keuangan</h2>
        <p className="mt-3 max-w-[60ch] leading-7 text-muted">Semua penjualan dijumlahkan otomatis dari saat kasir dibuka sampai ditutup, lalu masuk ke laporan keuangan toko.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["Buka kasir", "Isi modal awal dari uang di laci. Penjualan hanya bisa dilakukan saat kasir dibuka, jadi tidak ada transaksi yang lolos dari pencatatan."],
            ["Tutup kasir", "Lihat jumlah transaksi, item terjual, daftar barang, dan total penjualan. Isi uang yang dihitung, dan selisih kas langsung terlihat. Laporan bisa dicetak."],
            ["Keuangan", "Rekap harian, item terlaris, laporan per kasir, dan pengeluaran toko per cabang atau seluruh cabang. Semua tabel bisa diunduh sebagai CSV."],
          ].map(([t, d]) => (
            <div key={t} className="card"><h3 className="font-medium">{t}</h3><p className="mt-2 leading-7 text-muted">{d}</p></div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Cabang dibedakan lewat nama jalan</h2>
          <p className="mt-3 max-w-[52ch] leading-7 text-muted">Nama toko tetap satu. Setiap cabang punya nama dan alamat jalan sendiri, lengkap dengan stok, kasir, dan riwayat transaksinya. Nama cabang dan jalan ikut tercetak di struk.</p>
          <ul className="mt-5 space-y-2 text-sm">
            <li className="card py-3"><span className="font-medium">Sumber Rejeki</span>, Cabang Melati, Jl. Melati 12</li>
            <li className="card py-3"><span className="font-medium">Sumber Rejeki</span>, Cabang Anggrek, Jl. Anggrek 3</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Struk sesuai gaya toko Anda</h2>
          <p className="mt-3 max-w-[52ch] leading-7 text-muted">Atur nama toko, alamat, telepon, teks atas dan bawah, serta lebar kertas 58 atau 80mm, dengan pratinjau langsung. Setelah pembayaran, cetak ke printer thermal atau unduh sebagai PDF. Struk lama bisa dicetak ulang dari daftar transaksi.</p>
          <h2 className="mt-10 text-2xl font-semibold">Data ada di spreadsheet Anda</h2>
          <p className="mt-3 max-w-[52ch] leading-7 text-muted">Toko, cabang, akun, produk, transaksi, buka–tutup kasir, dan pengeluaran tersimpan sebagai tab di Google Sheets Anda. Anda bisa melihat, memfilter, atau mengunduhnya kapan saja tanpa menunggu siapa pun.</p>
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-semibold">Mulai dalam tiga langkah</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              ["Daftarkan toko", "Isi nama toko, cabang pertama, dan akun kepala toko di halaman pendaftaran."],
              ["Tambah cabang dan tim", "Buat cabang lain bila perlu, lalu tambahkan kepala cabang, kasir, dan gudang."],
              ["Buka kasir dan berjualan", "Gudang mengisi produk. Kasir membuka kasir, melayani pembeli, mencetak struk, lalu menutup kasir di akhir shift."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-accent font-mono text-sm text-white">{i + 1}</span>
                <div><h3 className="font-medium">{t}</h3><p className="mt-1 leading-7 text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Pertanyaan yang sering muncul</h2>
        <div className="mt-6 divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="cursor-pointer font-medium">{q}</summary>
              <p className="mt-2 leading-7 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-accent text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-10">
          <h2 className="text-2xl font-semibold">Siap mencatat penjualan hari ini?</h2>
          <Link href="/register" className="btn bg-white px-5 py-3 text-base text-accent hover:bg-white/90">Daftarkan toko</Link>
        </div>
      </section>
    </SiteShell>
  );
}
