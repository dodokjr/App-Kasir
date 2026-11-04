export default function Penjualan() {
  return (
    <>
      <h1>Penjualan, stok, dan struk</h1>

      <h2>Membuat transaksi</h2>
      <p>Buka kasir dulu (lihat <a href="/docs/tutup-kasir">Buka dan tutup kasir</a>). Tanpa kasir yang dibuka, transaksi ditolak.</p>
      <ol>
        <li>Di halaman <code>Kasir</code>, cari produk lewat kolom pencarian atau klik kartu produk untuk menambahkannya ke keranjang.</li>
        <li>Ubah jumlah dengan tombol tambah dan kurang. Jumlah tidak bisa melebihi stok.</li>
        <li>Isi uang diterima, atau klik <code>Uang pas</code> atau nominal cepat.</li>
        <li>Klik <code>Bayar dan cetak struk</code>. Stok berkurang otomatis.</li>
      </ol>
      <p>Harga dan stok selalu dicek ulang di server, jadi harga di browser tidak bisa diubah-ubah.</p>

      <h2>Mencetak struk</h2>
      <p>Setelah pembayaran, jendela struk muncul dengan tiga tombol:</p>
      <ul>
        <li><strong>Cetak</strong> membuka dialog cetak browser. Struk dirancang untuk kertas thermal lebar 58mm atau 80mm sesuai Pengaturan. Pilih printer thermal Anda dan matikan header dan footer browser bila perlu.</li>
        <li><strong>PDF</strong> mengunduh struk sebagai file PDF dengan lebar yang sama yang bisa dikirim ke pelanggan.</li>
        <li><strong>Tutup</strong> kembali ke kasir.</li>
      </ul>
      <p>Untuk mencetak ulang struk lama, buka dashboard, cari transaksinya di tabel Transaksi terakhir, lalu klik <code>Struk</code>.</p>

      <h2>Mengelola produk dan stok</h2>
      <ul>
        <li>Halaman <code>Gudang</code> berisi form tambah produk (SKU boleh kosong, nama, harga, stok awal) dan daftar produk.</li>
        <li><code>+10 stok</code> menambah stok cepat. <code>Ubah stok</code> dan <code>Ubah harga</code> mengganti nilainya langsung.</li>
        <li>Stok di bawah 5 ditandai merah.</li>
        <li>Kepala toko bisa memilih cabang di bagian atas untuk melihat dan mengubah stok cabang lain. Pilihan cabang diingat di browser.</li>
      </ul>

      <h2>Batasan yang perlu diketahui</h2>
      <p>Data disimpan di Google Sheets. Jika dua kasir menjual produk yang sama pada detik yang sama, stok bisa tidak akurat. Cek stok berkala dan sesuaikan lewat halaman Gudang.</p>
    </>
  );
}
