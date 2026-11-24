import Link from "next/link";
import AuthLink from "@/components/AuthLink";
import { SITE } from "@/lib/site";

export default function Keamanan() {
  return (
    <>
      <h1>Keamanan akun dan password</h1>
      <p>Halaman ini menjelaskan bagaimana akun Anda dilindungi, cara mengganti atau memulihkan password, dan aturan satu akun satu perangkat.</p>

      <h2>Empat langkah masuk</h2>
      <ol>
        <li>Email akun.</li>
        <li>Password.</li>
        <li>Verifikasi &quot;Saya bukan robot&quot;.</li>
        <li>PIN 6 digit.</li>
      </ol>
      <p>Salah memasukkan email, password, atau PIN dihitung bersama. Setelah 3 kali salah, akun dibekukan 8 menit. Setelah itu tersisa 2 kesempatan. Bila salah lagi, akun dibekukan 8 menit dan pemilik akun menerima email peringatan berisi alamat IP, lokasi, dan perangkat yang mencoba masuk.</p>

      <h2 id="satu-perangkat">Satu akun, satu perangkat</h2>
      <p>Selama akun Anda masih masuk di satu perangkat, perangkat lain <strong>tidak bisa masuk</strong> ke akun yang sama. Mereka akan melihat pesan bahwa akun sedang dipakai, dan baru bisa masuk setelah Anda keluar.</p>
      <ul>
        <li>Untuk membebaskan akun, klik <code>Keluar</code> di menu samping pada perangkat yang sedang masuk.</li>
        <li>Perangkat yang sama boleh masuk lagi kapan saja, misalnya setelah browser ditutup.</li>
        <li>Bila Anda tidak lagi memegang perangkat itu, pakai <AuthLink href="/lupa-password">Lupa password</AuthLink> dari perangkat lain (saat belum masuk). Mengganti password lewat email mengeluarkan semua perangkat sekaligus.</li>
        <li>Kepala toko dan kepala cabang juga bisa menekan <code>Keluarkan</code> pada anggota timnya di halaman Tim.</li>
        <li>Bila lupa keluar, sesi berakhir sendiri setelah 12 jam.</li>
      </ul>

      <h2 id="lupa-password">Lupa password</h2>
      <ol>
        <li>Di halaman <AuthLink href="/login">Masuk</AuthLink>, klik <code>Lupa password?</code> (atau buka <AuthLink href="/lupa-password">halaman ini</AuthLink>). Halaman ini hanya bisa dibuka saat Anda belum masuk. Kalau Anda sudah masuk, pakai Ganti password di Pengaturan.</li>
        <li>Masukkan email akun. Kode 6 digit dikirim ke email itu dan berlaku 10 menit.</li>
        <li>Masukkan kode, lalu buat password baru (minimal 8 karakter).</li>
        <li>Masuk lagi dengan password baru dan PIN Anda.</li>
      </ol>
      <p>Demi keamanan, aplikasi menampilkan pesan yang sama baik email terdaftar atau tidak. Kode hanya bisa dicoba 5 kali dan sekali pakai. Lupa PIN? Minta kepala toko atau kepala cabang mengatur ulang PIN Anda di halaman Tim.</p>

      <h2 id="ganti-password">Ganti password</h2>
      <p>Buka <Link href="/pengaturan">Pengaturan</Link>, bagian <code>Keamanan: password</code>. Isi password saat ini, lalu password baru dua kali. Password saat ini yang salah dihitung seperti salah saat masuk.</p>

      <h2 id="tips">Tips aman</h2>
      <ul>
        <li>Pakai password yang panjang dan hanya untuk aplikasi ini.</li>
        <li>Jangan bagikan password dan PIN, bahkan ke rekan kerja. Minta kepala toko membuatkan akun sendiri.</li>
        <li>Selalu keluar bila memakai perangkat bersama atau milik orang lain.</li>
        <li>Isi nomor telepon di Pengaturan agar tim Anda punya jalur kontak yang jelas.</li>
        <li>Curiga ada yang membobol akun? Ganti password sekarang, lalu <Link href="/kontak">hubungi kami</Link>.</li>
      </ul>

      <h2 id="kontak">Hubungi kami</h2>
      <p>
        Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        {SITE.phone && <> atau telepon / WhatsApp <a href={`tel:${SITE.phone.replace(/[^\d+]/g, "")}`}>{SITE.phone}</a></>}.
        {" "}Untuk laporan celah keamanan, tulis subjek &quot;Keamanan&quot; di <Link href="/kontak">halaman Kontak</Link>.
      </p>
    </>
  );
}