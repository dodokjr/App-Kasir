export default function BookingSewa() {
  return (
    <>
      <h1>Booking, sewa, dan rental</h1>
      <p>Menu <code>Booking &amp; sewa</code> dipakai untuk usaha yang menyewakan sesuatu per hari: kamar, lapangan, mobil, motor, kamera, tenda, dan sejenisnya. Setiap unit punya <strong>harga per hari</strong>, dan jadwalnya terlihat di kalender supaya satu unit tidak dipesan dua kali.</p>

      <h2>Tiga jenis</h2>
      <ul>
        <li><strong>Booking:</strong> pesan jadwal di muka. Statusnya Dipesan sampai pelanggan datang dan Anda menekan Mulai.</li>
        <li><strong>Sewa:</strong> sewa ruang atau barang. Jika tanggal mulainya hari ini atau sebelumnya, langsung berstatus Berjalan.</li>
        <li><strong>Rental:</strong> rental kendaraan atau alat. Cara kerjanya sama seperti sewa.</li>
      </ul>

      <h2>Menyiapkan unit dan harga</h2>
      <ol>
        <li>Buka tab <code>Unit &amp; harga</code> (kepala toko atau kepala cabang).</li>
        <li>Isi nama unit, jenis, dan <strong>harga per hari</strong>, lalu tekan Tambah unit.</li>
        <li>Harga bisa diubah kapan saja. Booking yang sudah dibuat memakai harga saat dibuat, jadi tidak ikut berubah.</li>
      </ol>

      <h2>Membuat booking</h2>
      <ol>
        <li>Tekan <code>+ Booking baru</code> (atau pilih tanggal di kalender lalu <code>Booking di tanggal ini</code>).</li>
        <li>Pilih unit, isi nama penyewa, tanggal mulai, dan tanggal selesai.</li>
        <li>Harga per hari terisi dari unit dan boleh diganti untuk booking ini saja (misalnya harga khusus).</li>
        <li>Isi uang muka bila ada. Total dan sisa tagihan dihitung otomatis.</li>
      </ol>
      <blockquote>
        <p><strong>Cara hitung hari:</strong> tanggal mulai dan tanggal selesai sama-sama dihitung. Tanggal 10 sampai 12 berarti 3 hari. Total = jumlah hari × harga per hari.</p>
      </blockquote>

      <h2>Skema keuntungan 15%</h2>
      <p>Setiap unit punya persen keuntungan, bawaannya <strong>15%</strong>. Dari total sewa, 15% dihitung sebagai keuntungan dan sisanya sebagai modal atau biaya. Contoh: sewa 3 hari × Rp 350.000 = Rp 1.050.000, keuntungannya Rp 157.500 dan modalnya Rp 892.500. Harga yang dibayar penyewa tidak berubah.</p>
      <ul>
        <li>Persen bisa diatur saat menambah unit atau lewat tombol <code>Ubah untung</code> (kepala toko dan kepala cabang).</li>
        <li>Persen disalin ke booking saat dibuat, jadi mengubahnya tidak mengubah booking lama. Booking lama sebelum fitur ini dihitung 15%.</li>
        <li>Kartu <strong>Perkiraan keuntungan</strong> menjumlahkan semua booking yang tidak dibatalkan, dan menampilkan bagian dari yang sudah selesai.</li>
      </ul>

      <h2>Status unit: mana yang sudah disewa</h2>
      <p>Di bagian atas tab <code>Jadwal</code> ada papan <strong>Status unit hari ini</strong>. Setiap kamar, mobil, motor, atau barang diberi note:</p>
      <ul>
        <li><strong>Sedang disewa</strong> atau <strong>Sedang dirental</strong>: unit sedang dipakai. Nama penyewa, nomor telepon, dan tanggalnya ikut tampil. Jika sudah lewat tanggal selesai dan belum dikembalikan, muncul tanda <em>Terlambat dikembalikan</em>.</li>
        <li><strong>Sudah dibooking</strong>: ada pemesan untuk hari ini yang belum mengambil.</li>
        <li><strong>Kosong, bisa dipakai</strong>: tidak ada yang memakai hari ini. Booking berikutnya, jika ada, ditampilkan di bawahnya.</li>
      </ul>
      <p>Pilih <strong>tipe unit</strong> (kamar, mobil, motor, barang, atau lainnya) saat menambah unit supaya papan bisa disaring per tipe. Status yang sama juga tampil di tab <code>Unit &amp; harga</code>.</p>

      <h2>Jadwal</h2>
      <ul>
        <li><strong>Kalender:</strong> satu bulan penuh. Pilih tanggal untuk melihat siapa yang memakai apa di hari itu.</li>
        <li><strong>Per unit:</strong> tiap baris adalah satu unit dan tiap kolom satu hari, jadi unit yang kosong langsung terlihat.</li>
        <li>Booking yang sudah selesai tampil pudar, yang dibatalkan disembunyikan dari jadwal tetapi tetap ada di tab Daftar.</li>
        <li>Unit yang sama tidak bisa dipesan di tanggal yang bertabrakan. Hari terakhir satu booking dan hari pertama booking berikutnya tidak boleh sama.</li>
      </ul>

      <h2>Alur status</h2>
      <ol>
        <li><strong>Dipesan</strong> → tekan <em>Mulai (diambil)</em> saat pelanggan mengambil.</li>
        <li><strong>Berjalan</strong> → tekan <em>Selesai (dikembalikan)</em> saat unit kembali. Jadwal unit langsung bebas.</li>
        <li>Kapan saja sebelum selesai: <em>Catat pembayaran</em> (cicilan atau pelunasan), <em>Ubah tanggal selesai</em> (perpanjang atau percepat, total dihitung ulang), atau <em>Batalkan</em>.</li>
        <li>Yang Berjalan lewat tanggal selesai ditandai <strong>Terlambat</strong>.</li>
      </ol>

      <h2>Siapa bisa apa</h2>
      <ul>
        <li>Kasir, kepala cabang, dan kepala toko bisa membuat booking dan mengubah statusnya di cabangnya.</li>
        <li>Kepala toko bisa berpindah cabang dari pemilih cabang.</li>
        <li>Hanya kepala toko dan kepala cabang yang bisa menambah unit, mengubah harga, dan menonaktifkan unit. Unit yang masih punya booking aktif tidak bisa dinonaktifkan.</li>
      </ul>

      <blockquote>
        <p><strong>Catatan:</strong> pembayaran booking dicatat di halaman Booking &amp; sewa dan belum masuk ke laporan Keuangan atau tutup kasir. Tab baru <code>rental_items</code> dan <code>bookings</code> dibuat otomatis di Google Sheets.</p>
      </blockquote>
    </>
  );
}
