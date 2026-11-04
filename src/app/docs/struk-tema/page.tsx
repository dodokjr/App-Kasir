export default function StrukTema() {
  return (
    <>
      <h1>Struk kustom dan mode gelap</h1>

      <h2>Mengatur struk</h2>
      <p>Kepala toko membuka <code>Pengaturan</code> lalu mengubah:</p>
      <ul>
        <li>Nama toko, alamat, dan nomor telepon yang tampil di bagian atas.</li>
        <li>Teks atas (misalnya jam buka) dan teks penutup (misalnya kebijakan tukar barang).</li>
        <li>Lebar kertas: 58mm atau 80mm.</li>
        <li>Apakah nomor invoice, nama kasir, serta uang diterima dan kembalian ikut tercetak.</li>
        <li>Cetak otomatis: dialog cetak terbuka sendiri setelah pembayaran.</li>
      </ul>
      <p>Pratinjau di samping formulir berubah langsung. Klik <code>Simpan pengaturan struk</code> agar berlaku. Pengaturan berlaku untuk seluruh cabang, sementara nama cabang dan jalan tetap tercetak otomatis. Pengaturan yang sama dipakai untuk cetak, PDF, dan cetak ulang struk lama.</p>

      <h2>Tips printer thermal</h2>
      <ul>
        <li>Pilih printer thermal di dialog cetak browser dan atur margin ke &quot;Tidak ada&quot;.</li>
        <li>Matikan header dan footer browser.</li>
        <li>Pilih lebar kertas di Pengaturan yang sama dengan kertas di printer.</li>
      </ul>

      <h2>Mode gelap</h2>
      <p>Tombol tema di pojok kanan atas bergantian antara <strong>Terang</strong>, <strong>Gelap</strong>, dan <strong>Otomatis</strong> (mengikuti pengaturan perangkat). Pilihan bisa juga diubah di halaman Pengaturan. Pilihan disimpan di browser yang Anda pakai, jadi perangkat lain tidak ikut berubah. Struk tetap berlatar putih agar hasil cetak sama dengan tampilan.</p>
    </>
  );
}
