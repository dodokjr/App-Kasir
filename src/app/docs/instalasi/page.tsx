export default function Instalasi() {
  return (
    <>
      <h1>Instalasi dan Google Sheets</h1>
      <p>Bagian ini untuk pemilik atau pengembang yang memasang aplikasi sendiri. Butuh Node.js 20.9 atau lebih baru.</p>

      <h2>1. Siapkan Google Sheets</h2>
      <ol>
        <li>Buka Google Cloud Console, buat project, lalu aktifkan <strong>Google Sheets API</strong>.</li>
        <li>Buat service account, lalu buat key berformat JSON.</li>
        <li>Buat spreadsheet kosong di Google Sheets dan bagikan ke <code>client_email</code> dari file JSON dengan akses Editor.</li>
        <li>Salin ID spreadsheet dari URL, yaitu bagian di antara <code>/d/</code> dan <code>/edit</code>.</li>
      </ol>

      <h2>2. Isi file lingkungan</h2>
      <p>Salin <code>.env.example</code> menjadi <code>.env.local</code>, lalu isi:</p>
      <pre>{`GOOGLE_SHEET_ID=...
GOOGLE_CLIENT_EMAIL=...@...iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
JWT_SECRET=string-acak-minimal-32-karakter
DEVELOPER_EMAIL=dev@contoh.com
DEVELOPER_PASSWORD=password-awal
NEXT_PUBLIC_CONTACT_EMAIL=halo@contoh.com
NEXT_PUBLIC_OPERATOR_NAME=Nama Pengelola
NEXT_PUBLIC_OPERATOR_ADDRESS=Alamat Pengelola`}</pre>
      <p>Jangan pernah memasukkan <code>.env.local</code> ke Git. Isinya rahasia.</p>

      <h2>3. Jalankan</h2>
      <pre>{`npm install
npm run dev`}</pre>
      <p>Buka <code>http://localhost:3000</code>. Login pertama memakai akun developer dari file lingkungan. Tab di spreadsheet dibuat otomatis saat aplikasi pertama kali mengaksesnya.</p>

      <h2>Tab yang dibuat</h2>
      <ul>
        <li><code>stores</code>, <code>branches</code>, <code>users</code></li>
        <li><code>products</code>, <code>transactions</code>, <code>transaction_items</code></li>
        <li><code>messages</code> (pesan dari halaman Kontak)</li>
        <li><code>shifts</code> (buka–tutup kasir), <code>expenses</code> (pengeluaran), dan <code>receipt_settings</code> (pengaturan struk)</li>
      </ul>
      <p>Jangan mengubah nama tab atau urutan kolom. Jika Anda memperbarui dari versi lama, tab baru dibuat otomatis saat pertama kali dipakai dan data lama tidak terpengaruh.</p>

      <h2>Deploy</h2>
      <p>Saat deploy ke layanan hosting, masukkan semua variabel di atas lewat pengaturan environment layanan tersebut. Untuk <code>GOOGLE_PRIVATE_KEY</code>, pertahankan karakter <code>\n</code> apa adanya.</p>
    </>
  );
}
