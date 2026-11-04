export default function JenisUsaha() {
  return (
    <>
      <h1>Jenis usaha, pembayaran, dan pantau kasir</h1>
      <p>Saat mendaftar, kepala toko memilih jenis usaha. Pilihan ini mengatur tampilan kasir dan struk. Kepala toko bisa menggantinya nanti di Pengaturan.</p>

      <h2>Jenis usaha</h2>
      <table>
        <thead><tr><th>Jenis</th><th>Yang berbeda</th></tr></thead>
        <tbody>
          <tr><td>F&amp;B</td><td>Ada pilihan makan di tempat atau bawa pulang, nomor meja, nama customer, nomor pesanan otomatis, catatan per menu, dan dua struk: struk customer dan struk dapur.</td></tr>
          <tr><td>Retail</td><td>Penjualan per buah. Satu struk untuk customer.</td></tr>
          <tr><td>Sembako</td><td>Barang kiloan dan sayuran dijual per kg mulai 0,1 kg (0,1; 0,2; 0,3, dan seterusnya). Harga yang dicatat adalah harga per kg.</td></tr>
          <tr><td>Lainnya</td><td>Berjalan seperti retail.</td></tr>
        </tbody>
      </table>

      <h2>Satuan produk</h2>
      <p>Di halaman Gudang, setiap produk punya satuan: pcs, porsi, pack, kg, atau liter. Untuk kg dan liter, stok dan jumlah di kasir boleh desimal, dengan kelipatan 0,1. Di kasir, ketuk produk untuk menambah 0,1, pakai tombol +0,5 / +1 / +5, atau ketik jumlahnya langsung (boleh pakai koma, misalnya 0,3). Jumlah yang bukan kelipatan 0,1 ditolak. Subtotal dibulatkan ke rupiah utuh.</p>

      <h2>F&amp;B: nomor pesanan dan struk dapur</h2>
      <ul>
        <li>Nomor pesanan (#01, #02, …) dibuat otomatis per cabang dan mulai dari #01 lagi setiap hari.</li>
        <li>Jika nama customer kosong, struk dapur menulis &quot;Customer #nomor&quot;.</li>
        <li>Setelah pembayaran, pilih <code>Cetak struk customer</code>, <code>Cetak struk dapur</code>, atau <code>Cetak keduanya</code>. Struk dapur tidak memuat harga dan menampilkan jumlah serta catatan dengan huruf besar.</li>
        <li>Nomor meja hanya muncul untuk pesanan makan di tempat.</li>
      </ul>

      <h2>Metode pembayaran</h2>
      <p>Cash dan transfer bank selalu ada dan tidak bisa dinonaktifkan. Kepala toko menambah atau mematikan metode lain di Pengaturan: QRIS, ShopeeFood, GoFood, GrabFood, GoSend, Grab Barang, paket, atau nama bebas (misalnya OVO atau Dana). Metode tidak dihapus, hanya dinonaktifkan, agar transaksi lama tetap terbaca.</p>
      <ul>
        <li>Cash: isi uang diterima, kembalian dihitung otomatis.</li>
        <li>Metode lain: dibayar pas sesuai total. Nomor referensi atau nomor pesanan platform boleh diisi.</li>
        <li>Saat tutup kasir, hanya penjualan <strong>tunai</strong> yang masuk hitungan uang di laci. Laporan juga menampilkan total per metode. Halaman Keuangan punya tabel per metode pembayaran.</li>
      </ul>

      <h2>Pantau kasir online atau offline</h2>
      <p>Kepala toko (semua cabang) dan kepala cabang (cabangnya) membuka menu <code>Pantau kasir</code>. Halaman ini menampilkan setiap kasir: online atau offline, kasir sedang dibuka atau ditutup, penjualan hari ini, dan waktu transaksi terakhir. Datanya diperbarui otomatis tiap 20 detik.</p>
      <ul>
        <li>Online berarti aplikasi terbuka di perangkat kasir dan terhubung internet. Kasir dianggap offline bila tidak ada sinyal selama sekitar 2 menit, atau setelah keluar (logout).</li>
        <li>Kasir yang masih dibuka tetapi offline ditandai <strong>Perlu dicek</strong>.</li>
        <li>Saat offline, kasir melihat peringatan dan tombol bayar dinonaktifkan sampai koneksi kembali. Aplikasi belum menyimpan transaksi offline untuk dikirim belakangan.</li>
      </ul>
    </>
  );
}
