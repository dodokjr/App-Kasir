import Link from "next/link";

export default function TutupKasir() {
  return (
    <>
      <h1>Buka dan tutup kasir</h1>
      <p>Penjualan hanya bisa dilakukan saat kasir dibuka. Dengan begitu semua transaksi dari satu shift terkumpul dan bisa dijumlahkan saat kasir ditutup. Satu akun hanya bisa membuka satu kasir pada satu waktu.</p>

      <h2>Membuka kasir</h2>
      <ol>
        <li>Buka halaman <code>Kasir</code>.</li>
        <li>Hitung uang tunai di laci dan isi <code>Modal awal</code>. Boleh 0.</li>
        <li>Kepala toko memilih cabang tempat berjualan. Kasir dan kepala cabang otomatis di cabangnya.</li>
        <li>Klik <code>Buka kasir</code>. Cabang yang dipilih saat ini dipakai untuk seluruh transaksi shift tersebut.</li>
      </ol>
      <p>Selama kasir terbuka, bilah di atas halaman menampilkan cabang, waktu buka, dan total penjualan sementara.</p>

      <h2>Menutup kasir</h2>
      <ol>
        <li>Klik <code>Tutup kasir</code> di bilah atas.</li>
        <li>Periksa ringkasan: jumlah transaksi, item terjual, daftar barang beserta nilainya, total penjualan, dan modal awal.</li>
        <li>Hitung uang tunai di laci dan isikan. Selisih langsung tampil.</li>
        <li>Tambahkan catatan bila perlu (misalnya uang diambil untuk membeli galon), lalu klik <code>Tutup kasir dan cetak laporan</code>.</li>
      </ol>
      <p>Laporan tutup kasir tampil dalam format struk dan bisa dicetak. Laporan lama bisa dibuka lagi dari <Link href="/docs/keuangan">halaman Keuangan</Link>, tab Kasir (shift).</p>

      <h2>Cara menghitung selisih</h2>
      <ul>
        <li><strong>Kas seharusnya</strong> = modal awal + total penjualan sejak kasir dibuka.</li>
        <li><strong>Selisih</strong> = uang yang dihitung − kas seharusnya.</li>
      </ul>
      <p>Selisih 0 berarti pas, positif berarti lebih, negatif berarti kurang. Kembalian sudah ikut diperhitungkan karena yang dijumlahkan adalah nilai penjualan, bukan uang yang diterima dari pembeli. Saat ini semua pembayaran dicatat sebagai tunai.</p>

      <h2>Yang masuk ke total</h2>
      <p>Total shift mencakup transaksi milik akun Anda di cabang shift, dari waktu buka sampai waktu tutup. Transaksi akun lain tidak ikut, karena setiap kasir punya shift sendiri.</p>

      <h2>Lupa menutup kasir</h2>
      <p>Transaksi tidak hilang. Shift tetap terbuka dan muncul sebagai &quot;Masih dibuka&quot; di Keuangan. Saat Anda menutupnya, semua penjualan sejak waktu buka ikut dijumlahkan. Kasir yang masih terbuka harus ditutup sebelum membuka yang baru.</p>
    </>
  );
}
