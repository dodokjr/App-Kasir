import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kebijakan Privasi | Kasir Toko" };

export default function Privasi() {
  return (
    <SiteShell>
      <article className="doc mx-auto max-w-3xl px-4 py-10">
        <h1>Kebijakan Privasi</h1>
        <p>Terakhir diperbarui: {SITE.updated}</p>
        <p>Kebijakan ini menjelaskan data apa yang dikumpulkan {SITE.name}, untuk apa dipakai, dan bagaimana Anda bisa mengendalikannya. Layanan ini dikelola oleh {SITE.operator}.</p>

        <h2>1. Data yang kami kumpulkan</h2>
        <ul>
          <li><strong>Data akun:</strong> nama, alamat email, peran, dan password. Password disimpan hanya dalam bentuk hash (bcrypt), bukan teks asli.</li>
          <li><strong>Data toko:</strong> nama toko, nama cabang, dan nama jalan cabang.</li>
          <li><strong>Data usaha:</strong> produk, harga, stok, transaksi beserta nama kasir, waktu, dan jumlah pembayaran, catatan buka dan tutup kasir (modal awal, uang yang dihitung, selisih, dan catatan), pengeluaran toko, serta pengaturan struk (nama, alamat, dan telepon toko).</li>
          <li><strong>Pesan kontak:</strong> nama, email, subjek, dan isi pesan yang Anda kirim lewat halaman Kontak.</li>
        </ul>
        <p>Kami tidak mengumpulkan data pembeli. Struk hanya berisi nama toko, cabang, kasir, dan rincian belanja.</p>

        <h2>2. Cara data dipakai</h2>
        <p>Data dipakai untuk menjalankan layanan: memverifikasi login, membatasi akses sesuai peran, menghitung stok dan transaksi, membuat struk, dan membalas pesan Anda. Kami tidak memakai data Anda untuk iklan.</p>

        <h2>3. Tempat penyimpanan</h2>
        <p>Data disimpan di Google Sheets milik pengelola layanan dan diakses lewat Google Sheets API. Karena itu data juga tunduk pada kebijakan privasi Google sebagai penyedia infrastruktur penyimpanan.</p>

        <h2>4. Cookie dan penyimpanan di browser</h2>
        <p>Kami memakai satu cookie bernama <code>sid</code> untuk menjaga Anda tetap login. Cookie ini bersifat httpOnly, berlaku 12 jam, dan dihapus saat Anda keluar. Kami juga menyimpan dua preferensi di penyimpanan lokal browser Anda: cabang yang terakhir dipilih (<code>branch</code>) dan tema terang atau gelap (<code>theme</code>). Keduanya hanya untuk kenyamanan tampilan, tidak dikirim ke server, dan bisa dihapus lewat pengaturan browser. Kami tidak memakai cookie iklan atau alat pelacak pihak ketiga.</p>

        <h2>5. Berbagi data</h2>
        <p>Kami tidak menjual data Anda. Data bisa dibuka kepada pengelola layanan dan pengembang yang menjalankan sistem, kepada penyedia infrastruktur seperti Google, atau jika diwajibkan oleh hukum yang berlaku. Dalam satu toko, data dibagikan antar akun sesuai peran, misalnya kepala toko dapat melihat akun, transaksi, dan keuangan seluruh cabangnya, sedangkan kasir hanya melihat laporan kasirnya sendiri.</p>

        <h2>6. Keamanan</h2>
        <p>Kami menyimpan password dalam bentuk hash, memakai sesi login terenkripsi dengan masa berlaku terbatas, dan membatasi akses data sesuai peran. Tidak ada sistem yang sepenuhnya bebas risiko, jadi gunakan password yang kuat dan jangan membagikannya.</p>

        <h2>7. Penyimpanan dan penghapusan</h2>
        <p>Data disimpan selama akun atau toko aktif. Anda dapat meminta penghapusan akun atau data toko lewat <a href="/kontak">halaman Kontak</a>. Data transaksi, laporan kasir, dan pengeluaran dapat kami simpan lebih lama bila diperlukan untuk kewajiban hukum atau pembukuan. Pengeluaran yang dibatalkan tetap tersimpan dengan penanda batal agar jejak audit terjaga.</p>

        <h2>8. Hak Anda</h2>
        <p>Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda berhak mengakses, memperbaiki, dan meminta penghapusan data pribadi Anda, serta menarik persetujuan pemrosesan. Kirim permintaan ke {SITE.email}.</p>

        <h2>9. Anak-anak</h2>
        <p>Layanan ini ditujukan untuk pelaku usaha dan karyawannya, bukan untuk anak di bawah umur.</p>

        <h2>10. Perubahan kebijakan</h2>
        <p>Jika kebijakan ini berubah, tanggal pembaruan di atas akan diganti. Perubahan penting akan diumumkan di halaman ini.</p>

        <h2>11. Hubungi kami</h2>
        <p>{SITE.operator}<br />{SITE.address}<br />Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      </article>
    </SiteShell>
  );
}
