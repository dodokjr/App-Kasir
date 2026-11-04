import Link from "next/link";

export default function Memulai() {
  return (
    <>
      <h1>Memulai</h1>
      <p>Panduan ini menjelaskan cara memakai Kasir Toko dari mendaftarkan toko sampai mencetak struk pertama.</p>

      <h2>1. Daftarkan toko</h2>
      <ol>
        <li>Buka halaman <Link href="/register">Daftarkan toko</Link>.</li>
        <li>Isi nama toko, nama cabang pertama (kosongkan untuk memakai nama &quot;Pusat&quot;), dan nama jalan cabang.</li>
        <li>Isi nama, email, dan password untuk akun kepala toko. Password minimal 6 karakter.</li>
      </ol>
      <p>Setelah itu Anda langsung masuk ke dashboard sebagai kepala toko.</p>

      <h2>2. Tambah cabang</h2>
      <p>Di dashboard, buka bagian Cabang, isi nama cabang dan nama jalan, lalu klik <code>Tambah cabang</code>. Satu toko bisa punya banyak cabang. Stok dan transaksi dipisahkan per cabang.</p>

      <h2>3. Tambah tim</h2>
      <p>Di bagian Tim, isi nama, email, password, peran, dan cabang. Kepala toko bisa menambah kepala cabang, kasir, dan gudang. Kepala cabang bisa menambah kasir dan gudang di cabangnya. Bagikan email dan password itu ke orang yang bersangkutan.</p>

      <h2>4. Isi produk, buka kasir, lalu berjualan</h2>
      <p>Bagian gudang menambahkan produk di halaman Gudang. Setelah produk ada, kasir membuka kasir dengan memasukkan modal awal, lalu melayani pembeli. Lanjut ke <Link href="/docs/tutup-kasir">Buka dan tutup kasir</Link> dan <Link href="/docs/penjualan">Penjualan, stok, dan struk</Link>.</p>

      <h2>5. Tutup kasir dan lihat keuangan</h2>
      <p>Di akhir shift kasir menutup kasir untuk melihat total penjualan dan selisih uang di laci. Kepala toko dan kepala cabang bisa melihat rekap di <Link href="/docs/keuangan">halaman Keuangan</Link> dan mengatur isi struk di <Link href="/docs/struk-tema">Pengaturan</Link>.</p>

      <h2>Lupa password?</h2>
      <p>Fitur reset password belum tersedia. Hubungi kepala toko atau <Link href="/kontak">pengelola layanan</Link> untuk dibuatkan akun baru.</p>
    </>
  );
}
