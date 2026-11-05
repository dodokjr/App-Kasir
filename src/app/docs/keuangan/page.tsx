export default function Keuangan() {
  return (
    <>
      <h1>Keuangan</h1>
      <p>Halaman <code>Keuangan</code> tersedia untuk kepala toko dan kepala cabang. Kepala toko bisa memilih satu cabang atau semua cabang. Kepala cabang otomatis melihat cabangnya.</p>

      <h2>Memilih periode</h2>
      <p>Gunakan tombol cepat (hari ini, kemarin, 7 hari, 30 hari, bulan ini) atau isi tanggal sendiri. Rentang maksimal 366 hari. Tanggal mengikuti waktu Indonesia Barat (WIB).</p>

      <h2>Kartu ringkasan</h2>
      <ul>
        <li><strong>Penjualan</strong>, <strong>Transaksi</strong>, <strong>Item terjual</strong>, dan <strong>Rata-rata per transaksi</strong>.</li>
        <li><strong>Pengeluaran</strong> yang Anda catat di tab Pengeluaran.</li>
        <li><strong>Penjualan − pengeluaran</strong>, yaitu arus kas. Ini bukan laba bersih karena harga modal (HPP) produk belum dicatat.</li>
        <li><strong>Selisih kas</strong>, jumlah selisih dari kasir yang sudah ditutup pada periode itu.</li>
      </ul>

      <h2>Saldo terakhir dan buku saldo</h2>
      <p>Di bagian atas halaman ada kartu <strong>Saldo terakhir</strong>. Rumusnya: <strong>pemasukan (penjualan) − pengeluaran − pencairan ke rekening</strong>. Saldo dihitung dari catatan paling awal di aplikasi, jadi angkanya tidak berubah ketika Anda mengganti tanggal. Kepala toko bisa memilih satu cabang untuk melihat saldo cabang itu.</p>
      <p>Tab <strong>Buku saldo</strong> menampilkan setiap baris pemasukan, pengeluaran, dan pencairan beserta saldo setelahnya, dengan saldo awal dan akhir periode yang dipilih. Penjualan dijumlahkan per hari per cabang. Tabelnya bisa diunduh sebagai CSV.</p>
      <blockquote><p><strong>Catatan:</strong> saldo hanya memakai data yang tercatat di aplikasi. Jika toko sudah punya uang atau penjualan sebelum memakai aplikasi, saldo bisa lebih kecil dari kenyataan, dan bisa minus. Saldo minus ditandai merah.</p></blockquote>

      <h2>Tab</h2>
      <ul>
        <li><strong>Harian</strong>: penjualan, jumlah transaksi, dan pengeluaran per tanggal.</li>
        <li><strong>Per item</strong>: produk terjual berurutan menurut nilai.</li>
        <li><strong>Kasir (shift)</strong>: daftar buka–tutup kasir beserta selisihnya. Tombol <code>Laporan</code> membuka dan mencetak ulang laporan tutup kasir.</li>
        <li><strong>Pengeluaran</strong>: catat belanja stok, gaji, sewa, listrik/air/internet, dan lainnya. Pengeluaran yang salah dibatalkan, bukan dihapus, agar jejaknya tetap tersimpan.</li>
        <li><strong>Pencairan ke rekening</strong>: catat hasil penjualan yang Anda cairkan, setor, atau transfer ke rekening bank (tanggal, bank tujuan, nominal, dan catatan). Aplikasi hanya mencatat, tidak memindahkan uang. Cukup tulis nama bank dan 4 digit terakhir rekening, jangan nomor lengkap. Catatan yang salah dibatalkan, bukan dihapus.</li>
      </ul>
      <p>Di kartu ringkasan, <strong>Penjualan tunai</strong>, <strong>Sudah dicairkan ke rekening</strong>, dan <strong>Tunai belum dicairkan (perkiraan)</strong> membantu mencocokkan uang di tangan dengan yang masuk rekening. Angka terakhir hanya perkiraan: penjualan tunai dikurangi pencairan, tanpa pengeluaran yang dibayar dari kas.</p>
      <p>Setiap tabel punya tombol <code>Unduh CSV</code> yang bisa dibuka di Excel atau Google Sheets.</p>

      <h2>Catatan</h2>
      <p>Penjualan dari kasir yang masih dibuka sudah masuk ke angka penjualan, tetapi selisih kasnya baru tersedia setelah kasir ditutup. Data tersimpan di Google Sheets pada tab <code>shifts</code>, <code>expenses</code>, <code>deposits</code> (pencairan), dan <code>transactions</code>.</p>
    </>
  );
}