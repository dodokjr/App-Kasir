export default function PetaTarget() {
    return (
      <>
        <h1>Peta toko, target, dan pencapaian</h1>
        <p>Kepala toko dan kepala cabang bisa melihat letak cabang di peta, menetapkan target penjualan bulanan, dan memantau pencapaiannya.</p>
  
        <h2>Peta toko</h2>
        <p>Buka menu <code>Peta toko</code>. Semua cabang yang sudah diberi lokasi tampil sebagai penanda di peta. Warna penanda mengikuti pencapaian target bulan ini: hijau untuk tercapai atau sesuai jalur, merah untuk tertinggal, dan abu-abu bila belum ada target. Ketuk penanda untuk melihat alamat, penjualan bulan ini, dan tautan rute ke Google Maps.</p>
        <h3>Mengatur lokasi cabang</h3>
        <ol>
          <li>Tekan <code>Atur lokasi</code> pada cabang (kepala toko untuk semua cabang, kepala cabang untuk cabangnya).</li>
          <li>Tentukan titik dengan salah satu cara: ketik alamat lalu tekan <code>Cari</code>, tekan <code>Gunakan lokasi saya</code> bila Anda sedang berada di toko, atau klik langsung di peta.</li>
          <li>Geser penanda bila kurang tepat, lalu tekan <code>Simpan lokasi</code>. Lokasi bisa diubah atau dihapus kapan saja.</li>
        </ol>
  
        <h2>Target bulanan</h2>
        <p>Buka menu <code>Target</code>. Kepala toko mengisi target penjualan per cabang untuk bulan yang dipilih. Target seluruh toko adalah jumlah target semua cabang. Jika perlu, kepala toko bisa mengisi target seluruh toko tersendiri. Tombol <code>Salin target bulan lalu</code> menyalin target bulan sebelumnya ke bulan ini, tanpa menimpa target yang sudah diisi. Kepala cabang hanya bisa melihat target cabangnya.</p>
        <p>Penjualan dihitung dari total transaksi (termasuk PPN bila aktif), sama dengan angka Penjualan di halaman Keuangan.</p>
  
        <h2>Pencapaian</h2>
        <ul>
          <li><strong>Persentase dan sisa target</strong>, dengan batang kemajuan yang bertanda 25%, 50%, dan 75%.</li>
          <li><strong>Status</strong>: Target tercapai, Sesuai jalur, Tertinggal dari jalur, atau Tidak tercapai (untuk bulan yang sudah lewat). Status &quot;sesuai jalur&quot; berarti perkiraan akhir bulan (penjualan rata-rata per hari dikali jumlah hari sebulan) sudah mencapai target.</li>
          <li><strong>Kebutuhan harian</strong>: rata-rata penjualan per hari yang diperlukan selama sisa hari (termasuk hari ini) agar target tercapai.</li>
          <li><strong>Peringkat cabang</strong> berdasarkan persentase pencapaian.</li>
          <li><strong>Lencana pencapaian</strong>: target bulan tercapai, melewati 25/50/75% target, hari terbaik bulan ini, rekor penjualan harian, cabang terbaik, jumlah transaksi (100, 500, 1.000, dan seterusnya), dan beberapa bulan berturut-turut mencapai target.</li>
          <li><strong>Grafik enam bulan terakhir</strong>: batang penjualan dengan garis target.</li>
        </ul>
        <p>Di Dashboard kepala toko dan kepala cabang juga ada kartu <strong>Target bulan ini</strong>. Jika Anda memilih satu cabang di Dashboard, kartu menampilkan target cabang itu.</p>
  
        <blockquote>
          <p><strong>Catatan:</strong> peta berasal dari OpenStreetMap, dan pencarian alamat memakai layanan Nominatim milik OpenStreetMap. Keduanya gratis untuk pemakaian wajar. Lokasi perangkat hanya dibaca saat Anda menekan <code>Gunakan lokasi saya</code>, dan baru disimpan bila Anda menekan <code>Simpan lokasi</code>.</p>
        </blockquote>
      </>
    );
  }