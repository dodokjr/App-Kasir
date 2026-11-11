import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kebijakan Privasi | Kasir Toko" };

export default function Privasi() {
  return (
    <LegalLayout
      title="Kebijakan Privasi"
      intro={<>Kebijakan ini menjelaskan data apa yang dikumpulkan {SITE.name}, untuk apa dipakai, dan bagaimana Anda bisa mengendalikannya. Layanan ini dikelola oleh {SITE.operator}.</>}
      summary={[
        "Kami menyimpan data akun, toko, dan penjualan Anda supaya aplikasi bisa berjalan.",
        "Kami tidak menjual data Anda dan tidak memakainya untuk iklan.",
        "Password disimpan dalam bentuk acak (hash), bukan teks asli.",
        "Anda bisa meminta melihat, memperbaiki, atau menghapus data lewat halaman Kontak.",
      ]}
      sections={[
        { id: "data-yang-dikumpulkan", title: "Data yang kami kumpulkan", body: (
          <>
            <ul>
              <li><strong>Data akun:</strong> nama, alamat email, peran, dan password. Password disimpan hanya dalam bentuk hash (bcrypt), bukan teks asli.</li>
              <li><strong>Data toko:</strong> nama toko, jenis usaha, nama cabang, dan nama jalan cabang.</li>
              <li><strong>Data usaha:</strong> produk (termasuk foto produk berukuran kecil yang Anda unggah), satuan, harga, stok, transaksi beserta nama kasir, waktu, metode pembayaran, nomor referensi pembayaran yang diisi kasir, PPN, dan jumlah pembayaran, catatan buka dan tutup kasir (modal awal, uang yang dihitung, selisih, dan catatan), pengeluaran toko, catatan pencairan (setoran) hasil penjualan ke rekening (tanggal, nama bank, keterangan rekening yang Anda isi, dan nominal; sebaiknya tidak memuat nomor rekening lengkap), serta pengaturan struk dan PPN (nama, alamat, telepon toko, tarif).</li>
              <li><strong>Permintaan barang antar cabang:</strong> nama barang, jumlah diminta, dikirim, dan diterima, nomor resi atau nomor pengiriman, nama pengaju dan pengirim, serta catatan dan balasan di tiap permintaan.</li>
              <li><strong>Data pesanan (toko F&amp;B):</strong> nomor meja, nomor pesanan, nama customer, dan catatan menu, jika diisi oleh kasir.</li>
              <li><strong>Status aktivitas akun:</strong> waktu terakhir akun terhubung dan halaman aplikasi yang sedang dibuka, supaya kepala toko dan kepala cabang bisa melihat kasir online atau offline.</li>
              <li><strong>Pesan kontak:</strong> nama, email, subjek, dan isi pesan yang Anda kirim lewat halaman Kontak.</li>
            </ul>
            <p>Kami tidak meminta data pembeli. Nama customer di toko F&amp;B bersifat opsional untuk menandai pesanan, dan sebaiknya tidak diisi data yang sensitif. Struk berisi nama toko, cabang, kasir, dan rincian belanja.</p>
          </>
        ) },
        { id: "cara-data-dipakai", title: "Cara data dipakai", body: (
          <p>Data dipakai untuk menjalankan layanan: memverifikasi login, membatasi akses sesuai peran, menghitung stok, transaksi, dan PPN, membuat struk dan laporan, menampilkan status kasir, dan membalas pesan Anda. Kami tidak memakai data Anda untuk iklan.</p>
        ) },
        { id: "tempat-penyimpanan", title: "Tempat penyimpanan", body: (
          <p>Data disimpan di Google Sheets milik pengelola layanan dan diakses lewat Google Sheets API. Karena itu data juga tunduk pada kebijakan privasi Google sebagai penyedia infrastruktur penyimpanan.</p>
        ) },
        { id: "cookie", title: "Cookie dan penyimpanan di browser", body: (
          <p>Kami memakai satu cookie bernama <code>sid</code> untuk menjaga Anda tetap login. Cookie ini bersifat httpOnly, berlaku 12 jam, dan dihapus saat Anda keluar. Kami juga menyimpan dua preferensi di penyimpanan lokal browser Anda: cabang yang terakhir dipilih (<code>branch</code>) dan tema terang atau gelap (<code>theme</code>). Keduanya hanya untuk kenyamanan tampilan, tidak dikirim ke server, dan bisa dihapus lewat pengaturan browser. Kami tidak memakai cookie iklan atau alat pelacak pihak ketiga.</p>
        ) },
        { id: "berbagi-data", title: "Berbagi data", body: (
          <p>Kami tidak menjual data Anda. Data bisa dibuka kepada pengelola layanan dan pengembang yang menjalankan sistem, kepada penyedia infrastruktur seperti Google, atau jika diwajibkan oleh hukum yang berlaku. Dalam satu toko, data dibagikan antar akun sesuai peran, misalnya kepala toko dapat melihat akun, transaksi, dan keuangan seluruh cabangnya, sedangkan kasir hanya melihat laporan kasirnya sendiri.</p>
        ) },
        { id: "keamanan", title: "Keamanan", body: (
          <p>Kami menyimpan password dalam bentuk hash, memakai sesi login terenkripsi dengan masa berlaku terbatas, dan membatasi akses data sesuai peran. Tidak ada sistem yang sepenuhnya bebas risiko, jadi gunakan password yang kuat dan jangan membagikannya.</p>
        ) },
        { id: "penyimpanan-dan-penghapusan", title: "Penyimpanan dan penghapusan", body: (
          <p>Data disimpan selama akun atau toko aktif. Anda dapat meminta penghapusan akun atau data toko lewat <a href="/kontak">halaman Kontak</a>. Data transaksi, laporan kasir, dan pengeluaran dapat kami simpan lebih lama bila diperlukan untuk kewajiban hukum atau pembukuan. Pengeluaran yang dibatalkan tetap tersimpan dengan penanda batal agar jejak audit terjaga.</p>
        ) },
        { id: "hak-anda", title: "Hak Anda", body: (
          <p>Sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi, Anda berhak mengakses, memperbaiki, dan meminta penghapusan data pribadi Anda, serta menarik persetujuan pemrosesan. Kirim permintaan ke {SITE.email}.</p>
        ) },
        { id: "anak-anak", title: "Anak-anak", body: <p>Layanan ini ditujukan untuk pelaku usaha dan karyawannya, bukan untuk anak di bawah umur.</p> },
        { id: "perubahan-kebijakan", title: "Perubahan kebijakan", body: <p>Jika kebijakan ini berubah, tanggal pembaruan di atas akan diganti. Perubahan penting akan diumumkan di halaman ini.</p> },
        { id: "hubungi-kami", title: "Hubungi kami", body: <p>{SITE.operator}<br />{SITE.address}<br />Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p> },
      ]}
    />
  );
}