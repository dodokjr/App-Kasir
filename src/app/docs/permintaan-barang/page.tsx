export default function PermintaanBarang() {
    return (
      <>
        <h1>Permintaan barang ke kepala toko</h1>
        <p>Gudang dan kepala cabang bisa meminta barang ke kepala toko (gudang pusat) lewat menu <code>Permintaan barang</code>. Kepala toko mengirim sesuai stok yang ada, mengisi nomor resi, dan stok kedua cabang diperbarui otomatis.</p>
  
        <h2>Alurnya</h2>
        <ol>
          <li><strong>Diajukan.</strong> Gudang atau kepala cabang membuat permintaan: pilih barang dari daftar produk cabang atau ketik nama barang baru, lalu isi jumlah. Satu permintaan bisa berisi banyak barang. Setiap permintaan mendapat nomor, misalnya <code>REQ-20261105-001</code>.</li>
          <li><strong>Dikirim.</strong> Kepala toko memilih cabang asal barang (biasanya cabang Pusat). Aplikasi mencocokkan barang lewat SKU atau nama dan menampilkan stok yang tersedia, lalu mengisi jumlah kirim otomatis. Jumlah boleh <strong>lebih sedikit</strong> dari permintaan: diminta 10 pcs, stok hanya 9, maka kirim 9. Kepala toko mengisi <strong>nomor resi atau nomor pengiriman</strong> dan catatan. Saat tombol Kirim ditekan, stok cabang asal berkurang.</li>
          <li><strong>Diterima.</strong> Peminta menghitung barang yang datang, mengisi jumlah yang benar-benar diterima (kurang atau rusak boleh dicatat), lalu menekan Konfirmasi diterima. Stok cabang peminta bertambah sesuai jumlah yang diterima. Barang yang belum ada di daftar produk cabang dibuat otomatis, dengan harga dari barang sumber (bisa diubah di Gudang).</li>
        </ol>
  
        <h2>Menolak dan membatalkan</h2>
        <ul>
          <li>Kepala toko bisa <strong>menolak</strong> permintaan dengan menulis alasan, misalnya stok habis.</li>
          <li>Peminta bisa <strong>membatalkan</strong> selama permintaan belum diproses kepala toko.</li>
          <li>Setelah dikirim, permintaan tidak bisa dibatalkan. Selesaikan dengan konfirmasi penerimaan dan catat selisihnya.</li>
        </ul>
  
        <h2>Berbalas catatan</h2>
        <p>Di setiap permintaan ada kolom <strong>Catatan dan balasan</strong>. Peminta dan kepala toko bisa saling bertanya kapan saja, misalnya &quot;Apel bisa ditambah?&quot; atau &quot;Stok pusat tinggal 9, sisanya minggu depan&quot;. Halaman diperbarui otomatis tiap 30 detik.</p>
  
        <h2>Siapa melihat apa</h2>
        <ul>
          <li>Kepala toko melihat semua permintaan dari semua cabang.</li>
          <li>Gudang dan kepala cabang hanya melihat permintaan cabangnya sendiri.</li>
          <li>Kasir tidak punya akses ke halaman ini.</li>
        </ul>
  
        <blockquote>
          <p><strong>Catatan:</strong> jika jumlah diterima lebih sedikit dari yang dikirim, selisihnya hanya dicatat dan tidak dikembalikan otomatis ke stok cabang asal. Sesuaikan stok lewat halaman Gudang bila perlu. Jumlah kg dan liter dihitung dengan kelipatan 0,1.</p>
        </blockquote>
      </>
    );
  }