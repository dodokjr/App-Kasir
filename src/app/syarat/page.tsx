import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Syarat dan Ketentuan | Kasir Toko" };

export default function Syarat() {
  return (
    <LegalLayout
      title="Syarat dan Ketentuan"
      intro={<>Dengan mendaftar atau memakai {SITE.name}, Anda setuju pada syarat berikut. Layanan ini dikelola oleh {SITE.operator}.</>}
      summary={[
        "Aplikasi ini alat bantu pencatatan penjualan. Struk dan laporannya bukan faktur pajak dan bukan pembukuan resmi.",
        "Data usaha, termasuk pengaturan PPN, adalah tanggung jawab toko Anda.",
        "Jaga password Anda. Kepala toko juga menjaga akun karyawannya.",
        "Layanan butuh internet dan bergantung pada Google Sheets, jadi cadangkan data secara berkala.",
      ]}
      sections={[
        { id: "layanan", title: "Layanan", body: (
          <p>{SITE.name} adalah aplikasi kasir berbasis web untuk mencatat penjualan, stok, buka dan tutup kasir, pengeluaran, cabang, dan tim toko, menyajikan laporan keuangan sederhana, serta mencetak struk. Fitur dapat berubah atau ditambah dari waktu ke waktu.</p>
        ) },
        { id: "akun", title: "Akun", body: (
          <ul>
            <li>Anda wajib memberi data yang benar saat mendaftar.</li>
            <li>Anda bertanggung jawab atas keamanan password dan semua aktivitas di akun Anda.</li>
            <li>Kepala toko bertanggung jawab atas akun kasir, gudang, dan kepala cabang yang ia buat, termasuk mencabut akses karyawan yang sudah tidak bekerja.</li>
          </ul>
        ) },
        { id: "data-usaha", title: "Data usaha Anda", body: (
          <>
            <p>Data produk, stok, transaksi, laporan kasir, dan pengeluaran adalah milik toko Anda. Anda bertanggung jawab atas keakuratan data itu, termasuk harga, modal awal, uang yang dihitung saat tutup kasir, dan pengeluaran yang dicatat. Struk dari aplikasi ini adalah bukti transaksi internal toko dan bukan faktur pajak.</p>
            <p>Laporan keuangan di aplikasi adalah alat bantu pencatatan, bukan pembukuan resmi, laporan laba rugi, atau nasihat akuntansi dan pajak. Angka &quot;penjualan dikurangi pengeluaran&quot; menggambarkan arus kas dan bukan laba bersih. Konsultasikan kewajiban pembukuan dan pajak Anda dengan akuntan.</p>
            <h3>PPN</h3>
            <p>Kepala toko menentukan apakah PPN dipungut, berapa tarifnya, dan apakah harga sudah termasuk PPN. Aplikasi hanya menghitung sesuai pengaturan itu. Kewajiban memungut dan menyetor pajak, serta tarif yang berlaku, adalah tanggung jawab pemilik usaha.</p>
            <h3>Isi struk dan laporan kasir</h3>
            <p>Kepala toko menentukan isi struk (nama, alamat, telepon, teks tambahan) dan bertanggung jawab atas kebenarannya. Transaksi dan laporan tutup kasir yang sudah tercatat tidak dapat diubah dari aplikasi.</p>
          </>
        ) },
        { id: "larangan", title: "Larangan", body: (
          <>
            <ul>
              <li>Mengakses data toko lain atau mencoba melewati pembatasan hak akses.</li>
              <li>Mengganggu, membebani, atau merusak layanan.</li>
              <li>Memakai layanan untuk kegiatan yang melanggar hukum.</li>
            </ul>
            <p>Pelanggaran dapat membuat toko atau akun dinonaktifkan.</p>
          </>
        ) },
        { id: "ketersediaan-layanan", title: "Ketersediaan layanan", body: (
          <p>Kami berusaha menjaga layanan tetap berjalan, tetapi tidak menjamin layanan selalu tersedia tanpa gangguan. Layanan membutuhkan koneksi internet: saat koneksi kasir putus, pembayaran tidak dapat diproses dan transaksi offline belum disimpan. Layanan bergantung pada Google Sheets, yang membatasi jumlah permintaan per menit. Pada transaksi bersamaan di produk yang sama, stok dapat tidak akurat. Cek stok secara berkala.</p>
        ) },
        { id: "batasan-tanggung-jawab", title: "Batasan tanggung jawab", body: (
          <p>Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, atau selisih stok dan pembukuan yang timbul dari pemakaian layanan. Lakukan pencadangan data secara berkala, misalnya dengan mengunduh spreadsheet atau mengekspor CSV dari halaman Keuangan. Kami juga tidak bertanggung jawab atas selisih kas yang timbul dari kesalahan input atau pemakaian akun oleh pihak lain akibat kelalaian pengguna.</p>
        ) },
        { id: "penghentian", title: "Penghentian", body: <p>Anda dapat berhenti memakai layanan kapan saja dan meminta penghapusan data lewat halaman Kontak. Kami dapat menonaktifkan akun yang melanggar syarat ini.</p> },
        { id: "perubahan-syarat", title: "Perubahan syarat", body: <p>Syarat ini dapat diperbarui. Jika Anda terus memakai layanan setelah perubahan, Anda dianggap menyetujuinya.</p> },
        { id: "hukum-yang-berlaku", title: "Hukum yang berlaku", body: <p>Syarat ini tunduk pada hukum Republik Indonesia.</p> },
        { id: "kontak", title: "Kontak", body: <p>Pertanyaan tentang syarat ini dapat dikirim ke <a href={`mailto:${SITE.email}`}>{SITE.email}</a> atau lewat <a href="/kontak">halaman Kontak</a>.</p> },
      ]}
    />
  );
}