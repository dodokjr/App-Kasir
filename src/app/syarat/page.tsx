import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Syarat dan Ketentuan | Kasir Toko" };

export default function Syarat() {
  return (
    <SiteShell>
      <article className="doc mx-auto max-w-3xl px-4 py-10">
        <h1>Syarat dan Ketentuan</h1>
        <p>Terakhir diperbarui: {SITE.updated}</p>
        <p>Dengan mendaftar atau memakai {SITE.name}, Anda setuju pada syarat berikut. Layanan ini dikelola oleh {SITE.operator}.</p>

        <h2>1. Layanan</h2>
        <p>{SITE.name} adalah aplikasi kasir berbasis web untuk mencatat penjualan, stok, buka dan tutup kasir, pengeluaran, cabang, dan tim toko, menyajikan laporan keuangan sederhana, serta mencetak struk. Fitur dapat berubah atau ditambah dari waktu ke waktu.</p>

        <h2>2. Akun</h2>
        <ul>
          <li>Anda wajib memberi data yang benar saat mendaftar.</li>
          <li>Anda bertanggung jawab atas keamanan password dan semua aktivitas di akun Anda.</li>
          <li>Kepala toko bertanggung jawab atas akun kasir, gudang, dan kepala cabang yang ia buat, termasuk mencabut akses karyawan yang sudah tidak bekerja.</li>
        </ul>

        <h2>3. Data usaha Anda</h2>
        <p>Data produk, stok, transaksi, laporan kasir, dan pengeluaran adalah milik toko Anda. Anda bertanggung jawab atas keakuratan data itu, termasuk harga, modal awal, uang yang dihitung saat tutup kasir, dan pengeluaran yang dicatat. Struk dari aplikasi ini adalah bukti transaksi internal toko dan bukan faktur pajak.</p>
        <p>Laporan keuangan di aplikasi adalah alat bantu pencatatan, bukan pembukuan resmi, laporan laba rugi, atau nasihat akuntansi dan pajak. Angka &quot;penjualan dikurangi pengeluaran&quot; menggambarkan arus kas dan bukan laba bersih. Konsultasikan kewajiban pembukuan dan pajak Anda dengan akuntan.</p>

        <h3>Isi struk dan laporan kasir</h3>
        <p>Kepala toko menentukan isi struk (nama, alamat, telepon, teks tambahan) dan bertanggung jawab atas kebenarannya. Transaksi dan laporan tutup kasir yang sudah tercatat tidak dapat diubah dari aplikasi.</p>

        <h2>4. Larangan</h2>
        <ul>
          <li>Mengakses data toko lain atau mencoba melewati pembatasan hak akses.</li>
          <li>Mengganggu, membebani, atau merusak layanan.</li>
          <li>Memakai layanan untuk kegiatan yang melanggar hukum.</li>
        </ul>
        <p>Pelanggaran dapat membuat toko atau akun dinonaktifkan.</p>

        <h2>5. Ketersediaan layanan</h2>
        <p>Kami berusaha menjaga layanan tetap berjalan, tetapi tidak menjamin layanan selalu tersedia tanpa gangguan. Layanan bergantung pada Google Sheets, yang membatasi jumlah permintaan per menit. Pada transaksi bersamaan di produk yang sama, stok dapat tidak akurat. Cek stok secara berkala.</p>

        <h2>6. Batasan tanggung jawab</h2>
        <p>Sejauh diizinkan hukum, kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, atau selisih stok dan pembukuan yang timbul dari pemakaian layanan. Lakukan pencadangan data secara berkala, misalnya dengan mengunduh spreadsheet atau mengekspor CSV dari halaman Keuangan. Kami juga tidak bertanggung jawab atas selisih kas yang timbul dari kesalahan input atau pemakaian akun oleh pihak lain akibat kelalaian pengguna.</p>

        <h2>7. Penghentian</h2>
        <p>Anda dapat berhenti memakai layanan kapan saja dan meminta penghapusan data lewat halaman Kontak. Kami dapat menonaktifkan akun yang melanggar syarat ini.</p>

        <h2>8. Perubahan syarat</h2>
        <p>Syarat ini dapat diperbarui. Jika Anda terus memakai layanan setelah perubahan, Anda dianggap menyetujuinya.</p>

        <h2>9. Hukum yang berlaku</h2>
        <p>Syarat ini tunduk pada hukum Republik Indonesia.</p>

        <h2>10. Kontak</h2>
        <p>Pertanyaan tentang syarat ini dapat dikirim ke <a href={`mailto:${SITE.email}`}>{SITE.email}</a> atau lewat <a href="/kontak">halaman Kontak</a>.</p>
      </article>
    </SiteShell>
  );
}
