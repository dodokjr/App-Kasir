export default function DiskonOffline() {
    return (
      <>
        <h1>Diskon dan mode offline</h1>
  
        <h2>Diskon</h2>
        <p>Diskon dihitung dari subtotal, <strong>sebelum PPN</strong>. Contoh: belanja Rp100.000, diskon 10% (Rp10.000), jadi Rp90.000. Jika PPN 12% ditambahkan di atas harga, PPN dihitung dari Rp90.000 sehingga total Rp100.800. Struk menampilkan Subtotal, Diskon, PPN, lalu Total.</p>
        <h3>Diskon siap pakai (diatur kepala toko)</h3>
        <p>Di <code>Pengaturan</code> kepala toko membuat diskon dengan nama, jenis (persen atau rupiah), nilai, minimal belanja, dan tanggal berlaku (semuanya opsional kecuali nama dan nilai). Di kasir, diskon yang berlaku untuk belanja saat itu muncul di pilihan <code>Diskon</code>. Diskon tidak dihapus, hanya dinonaktifkan.</p>
        <h3>Diskon manual</h3>
        <ul>
          <li>Kepala toko menentukan <strong>batas diskon manual kasir</strong> dalam persen dari subtotal. Isi 0 bila kasir tidak boleh memberi diskon manual.</li>
          <li>Kepala toko dan kepala cabang tidak dibatasi.</li>
          <li><strong>Alasan wajib diisi</strong> pada setiap diskon manual, dan tercatat di transaksi.</li>
        </ul>
        <p>Total diskon yang diberikan tampil di halaman Keuangan. Angka di tab <code>Per item</code> dihitung dari harga barang sebelum diskon dan PPN.</p>
  
        <h2>Mode offline</h2>
        <p>Saat internet mati, <strong>halaman Kasir tetap bisa dipakai</strong>. Kasir menjual seperti biasa, struk tetap bisa dicetak, dan transaksi dikirim otomatis begitu internet kembali.</p>
        <h3>Syarat agar bisa offline</h3>
        <ul>
          <li>Buka halaman <strong>Kasir sekali saat online</strong> di perangkat itu. Saat itulah daftar produk, harga, stok, metode pembayaran, PPN, dan diskon disimpan di perangkat.</li>
          <li>Kasir sudah dibuka (buka kasir butuh internet).</li>
          <li>Mode offline untuk halaman Kasir saja. Halaman lain (Gudang, Keuangan, dan seterusnya) tetap butuh internet.</li>
          <li>Agar halaman Kasir bisa dimuat ulang saat offline, aplikasi harus sudah dibuka online minimal satu kali di versi produksi (alamat https). Selama halaman tidak ditutup atau dimuat ulang, mode offline tetap berjalan.</li>
        </ul>
        <h3>Yang terjadi saat offline</h3>
        <ul>
          <li>Muncul spanduk &quot;Mode offline&quot;. Harga dan stok memakai data tersimpan terakhir.</li>
          <li>Struk memakai nomor khusus <code>OFF-tanggal-kode-urut</code>, dan nomor pesanan F&amp;B berhuruf (misalnya A01). Nomor ini dipertahankan saat transaksi terkirim, jadi struk pembeli cocok dengan catatan.</li>
          <li>Stok di layar ikut berkurang, sehingga barang yang sama tidak terjual melebihi stok yang diketahui perangkat.</li>
          <li>Pembayaran non-tunai (QRIS, transfer, dan lainnya) tidak bisa diperiksa dari aplikasi. Pastikan uangnya sudah masuk sebelum menyerahkan barang.</li>
          <li><strong>Buka kasir dan tutup kasir butuh internet.</strong> Tutup kasir hanya bisa setelah semua transaksi offline terkirim.</li>
        </ul>
        <h3>Saat internet kembali</h3>
        <ul>
          <li>Transaksi dikirim otomatis berurutan. Spanduk di atas menunjukkan jumlah yang masih menunggu. Pengiriman ulang aman: sistem mengenali kode transaksi, jadi tidak pernah tercatat dua kali.</li>
          <li>Penjualan offline <strong>tetap dicatat</strong> sesuai struk yang sudah diberikan ke pembeli. Jika ada yang berbeda dari data saat ini (harga sudah berubah, stok kurang, diskon sudah tidak berlaku, PPN diganti), transaksi diberi tanda <strong>Perlu ditinjau</strong> beserta alasannya di Dashboard kepala toko dan kepala cabang. Stok tidak pernah menjadi minus.</li>
          <li>Transaksi yang ditolak sistem (misalnya kasir sudah ditutup di perangkat lain) tampil di panel <code>Transaksi offline</code> di halaman Kasir. Anda bisa mencoba kirim lagi, menyalin datanya, atau membuangnya. Membuang berarti penjualan itu tidak tercatat.</li>
        </ul>
        <blockquote>
          <p><strong>Penting:</strong> data offline disimpan di browser perangkat itu. Jangan menghapus data browser, memakai mode penyamaran, atau berganti perangkat sebelum semua transaksi terkirim. Jika keluar dari akun saat masih ada transaksi tertunda, transaksi itu baru terkirim setelah akun yang sama masuk lagi di perangkat tersebut.</p>
        </blockquote>
      </>
    );
  }