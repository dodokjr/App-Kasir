# Kasir Toko (Next.js + TypeScript + Tailwind + Google Sheets)

## Peran
| Peran | Bisa apa |
|---|---|
| developer | Membuat akun admin, melihat/menonaktifkan semua toko |
| admin | Melihat/menonaktifkan semua toko |
| kepala_toko | Daftar sendiri lewat /register dan memilih jenis usaha. Tambah cabang (nama + jalan), tambah kepala cabang/kasir/gudang, kelola stok semua cabang, lihat transaksi dan keuangan, atur struk dan metode pembayaran, pantau kasir semua cabang |
| kepala_cabang | Tambah kasir/gudang di cabangnya, kasir, stok, transaksi dan keuangan cabang, pantau kasir cabangnya (online/offline) |
| kasir | Buka kasir, transaksi, cetak struk / PDF, tutup kasir |
| gudang | Tambah produk, ubah stok & harga |

## Setup Google Sheets
1. Buka https://console.cloud.google.com → buat project → aktifkan **Google Sheets API**.
2. IAM & Admin → Service Accounts → buat akun → Keys → Add key → JSON.
3. Buat spreadsheet kosong di Google Sheets, klik **Share**, beri akses **Editor** ke `client_email` dari file JSON.
4. Salin `.env.example` menjadi `.env.local`, isi `GOOGLE_SHEET_ID`, `GOOGLE_CLIENT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `JWT_SECRET`, `DEVELOPER_EMAIL`, `DEVELOPER_PASSWORD`.
5. Tab (stores, branches, users, products, transactions, transaction_items, messages, shifts, expenses, receipt_settings, payment_methods, presence, deposits) dibuat otomatis. Jika memperbarui dari versi lama, tab baru dan kolom baru ditambahkan otomatis saat pertama kali dipakai; data lama tidak diubah. Jangan mengubah urutan kolom di Google Sheets.

## Jalankan
Butuh Node.js 20.9 atau lebih baru. Project ini memakai Next.js 16 (React 19).

```
npm install
npm run dev
```
Buka http://localhost:3000. Login pertama dengan akun developer dari `.env.local`; toko baru daftar di `/register`.

## Jenis usaha, pembayaran, dan pantau kasir
- **Jenis usaha** dipilih saat registrasi (F&B, Retail, Sembako, Lainnya) dan bisa diganti kepala toko di Pengaturan. Toko versi lama dianggap Retail.
- **F&B**: jenis pesanan (makan di tempat / bawa pulang), nomor meja, nama customer, nomor pesanan otomatis per cabang per hari (#01, #02, …), catatan per menu, **struk customer** dan **struk dapur** (tanpa harga).
- **Sembako**: satuan kg/liter, jumlah mulai 0,1 dengan kelipatan 0,1. Satuan produk diatur di halaman Gudang.
- **ShopeeFood/GoFood/GrabFood** hanya untuk F&B: di jenis usaha lain tidak muncul (UI dan ditolak server). Di F&B, pesanan lewat ketiganya otomatis dibungkus tanpa nomor meja, dan struk dapur menampilkan asal pesanan. Jika jenis usaha diganti dari F&B, metode ini disembunyikan tetapi riwayat transaksinya tetap utuh.
- **Pembayaran**: Cash dan transfer bank selalu ada; kepala toko menambah QRIS, ShopeeFood, GoFood, GrabFood, GoSend, Grab Barang, paket, atau nama bebas. Hanya penjualan tunai yang dihitung sebagai uang di laci saat tutup kasir.
- **PPN**: kepala toko mengaktifkan/menonaktifkan di Pengaturan, mengisi tarif (default 12%, ada pilihan cepat 11% dan 12%), dan memilih ditambahkan di atas harga (exclusive) atau sudah termasuk harga (inclusive). Tarif dan cara hitung disimpan per transaksi, jadi transaksi lama tidak berubah. Toko lama otomatis PPN nonaktif.
- **Pesan Kontak** (`/pesan`): developer dan admin membaca pesan dari halaman Kontak, menandai sudah/belum dibaca, dan membalas lewat email. Tab `messages` mendapat kolom `readAt` dan `readBy` otomatis.
- **Saldo terakhir dan Buku saldo** (halaman Keuangan, API `/api/balance`): saldo = pemasukan (penjualan) − pengeluaran − pencairan ke rekening, dihitung dari catatan paling awal (tidak terpengaruh rentang tanggal). Tab Buku saldo menampilkan tiap baris dengan saldo berjalan dan bisa diunduh CSV. Saldo memakai data yang ada di aplikasi saja; belum ada fitur saldo awal.
- **Pencairan ke rekening** (tab di halaman Keuangan, tab sheet `deposits`): kepala toko/cabang mencatat hasil penjualan yang dicairkan/disetor ke rekening (bank, 4 digit rekening, nominal, catatan). Hanya pencatatan, tidak ada transfer uang sungguhan. Dibatalkan, bukan dihapus. Tab baru `deposits` dibuat otomatis.
- **Pantau kasir** (`/monitor`): kepala toko dan kepala cabang melihat kasir online/offline. Browser kasir mengirim detak tiap 40 detik; offline bila tidak ada detak ±2 menit. Detak disimpan di memori server dan hanya ditulis ke Sheets tiap 4 menit per orang (menjaga kuota API). Paling akurat di server tunggal (VPS / `next start`); di hosting serverless dengan banyak instance, status bisa terlambat beberapa menit.
- Transaksi offline (disimpan lalu dikirim saat online) belum didukung. Saat offline kasir diberi peringatan dan tombol bayar dinonaktifkan.

## Batas kuota Google Sheets
Google Sheets membatasi sekitar 60 permintaan baca per menit. Aplikasi menjaganya dengan: hasil baca disimpan di memori 10 detik (`SHEETS_CACHE_MS`), tab yang dibaca bersamaan digabung jadi satu permintaan, cache dibuang begitu ada penulisan, dan data lama (maks. 5 menit) dipakai bila kuota habis. Keputusan penting (stok saat bayar, cek email, buka kasir) selalu membaca data terbaru. Jika memakai hosting dengan banyak instance, data dari instance lain bisa terlambat sampai 10 detik. Jika tetap sering kena batas, pertimbangkan pindah ke database sungguhan.

## Catatan
- Google Sheets bukan database transaksional: jika dua kasir checkout bersamaan produk yang sama, stok bisa tidak akurat, dan API Google dibatasi ±60 request/menit per user. Cocok untuk toko kecil. Untuk skala lebih besar, pindahkan `src/lib/sheets.ts` ke Postgres/Supabase tanpa mengubah halaman.
- Cetak struk: lebar 58mm atau 80mm dipilih di halaman Pengaturan (tidak perlu mengubah kode).
- Buka–tutup kasir: penjualan hanya bisa saat kasir dibuka. Total shift = transaksi milik kasir itu di cabang shift antara waktu buka dan tutup. Kas seharusnya = modal awal + penjualan.
- Keuangan (`/keuangan`): rekap harian, per item, shift, dan pengeluaran. "Penjualan − pengeluaran" adalah arus kas, bukan laba, karena belum ada harga modal (HPP).
- Dark mode: tombol tema (terang/gelap/otomatis). Warna memakai CSS variable di `globals.css`; kertas struk tetap putih.

## Halaman publik
`/` pengenalan, `/docs` panduan, `/privasi`, `/syarat`, `/kontak`. Isi `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_OPERATOR_NAME`, dan `NEXT_PUBLIC_OPERATOR_ADDRESS` di `.env.local`. Pesan dari halaman Kontak masuk ke tab `messages`. Teks privasi dan syarat adalah template; minta ahli hukum meninjaunya sebelum dipakai untuk bisnis nyata.