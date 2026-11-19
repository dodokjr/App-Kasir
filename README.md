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
5. Tab (stores, branches, users, products, transactions, transaction_items, messages, shifts, expenses, receipt_settings, payment_methods, presence, deposits, product_images, stock_requests, stock_request_items, stock_request_notes, targets, discounts) dibuat otomatis. Jika memperbarui dari versi lama, tab baru dan kolom baru ditambahkan otomatis saat pertama kali dipakai; data lama tidak diubah. Jangan mengubah urutan kolom di Google Sheets.

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
- **Foto produk**: dikecilkan di browser menjadi JPEG persegi ±240 px (maks. ±40 KB) dan disimpan sebagai teks base64 di tab `product_images` (tab `products` hanya menyimpan penanda versi `imageVer`, jadi daftar produk tetap ringan). Ditampilkan lewat `/api/product-images?id=&v=` (wajib login, isi file diperiksa, di-cache browser). Cocok untuk puluhan sampai ratusan produk; untuk ribuan foto pindahkan ke penyimpanan file (mis. Google Drive atau S3).
- **Pencarian produk**: di Gudang dan Kasir, tidak membedakan huruf besar/kecil dan semua kata harus cocok. Kasir mendukung pemindai barcode (ketik SKU + Enter).
- **Permintaan barang** (`/permintaan`, API `/api/stock-requests`): gudang dan kepala cabang meminta barang ke kepala toko; kepala toko memilih cabang asal, melihat stok, mengirim sesuai stok (boleh kurang dari permintaan) dengan nomor resi, lalu peminta mengonfirmasi penerimaan. Stok asal berkurang saat dikirim, stok peminta bertambah saat diterima (barang baru dibuat otomatis). Ada percakapan catatan di tiap permintaan. Tab baru: `stock_requests`, `stock_request_items`, `stock_request_notes`. Selisih kirim/terima hanya dicatat, tidak dikembalikan otomatis.
- **Peta toko** (`/peta`): letak cabang di peta (Leaflet + OpenStreetMap, tanpa kunci API). Lokasi diatur dengan cari alamat (Nominatim), "Gunakan lokasi saya", atau klik/geser penanda; disimpan di kolom `lat`/`lng` tab `branches`. Warna penanda mengikuti pencapaian target. **Perlu `npm install`** (dependensi baru: `leaflet`, `@types/leaflet`). Tile dan Nominatim OpenStreetMap hanya untuk pemakaian wajar; untuk lalu lintas besar pakai penyedia tile sendiri.
- **Target dan pencapaian** (`/target`, API `/api/targets`): target penjualan bulanan per cabang (opsional per toko), persentase, sisa, kebutuhan per hari, perkiraan akhir bulan, status, peringkat cabang, lencana, dan riwayat 6 bulan. Hanya kepala toko yang mengatur target. Tab baru `targets`.
- **Diskon**: diskon siap pakai (persen/rupiah, minimal belanja, tanggal berlaku; tab `discounts`) dan diskon manual dengan batas persen untuk kasir (`stores.discountManualMax`) serta alasan wajib. Urutan hitung: subtotal - diskon = dasar, lalu PPN dari dasar (`calcTotals`, dipakai sama di browser dan server). Struk, Keuangan (kartu "Diskon diberikan"), dan daftar transaksi memuatnya.
- **Mode offline** (hanya halaman Kasir): katalog, status kasir, dan antrean transaksi disimpan di `localStorage` (`src/lib/offline.ts`); `public/sw.js` menyimpan berkas aplikasi dan halaman `/kasir` (hanya aktif di build produksi). Transaksi offline bernomor `OFF-YYYYMMDD-KODE-001`, dikirim otomatis (`Shell`) dengan `clientId` sehingga kirim ulang tidak pernah menggandakan. Server menerima penjualan offline sesuai struk dan menandai `review` bila berbeda dari data saat ini (harga, stok, diskon, PPN, metode, total, waktu). Buka dan tutup kasir tetap butuh internet; tutup kasir diblokir selama ada antrean. Kolom `transactions` kini >26, jadi `setup()` memperluas kolom tab dan pembacaan memakai `A:BZ`.
- **Pantau kasir** (`/monitor`): kepala toko dan kepala cabang melihat kasir online/offline. Browser kasir mengirim detak tiap 40 detik; offline bila tidak ada detak ±2 menit. Detak disimpan di memori server dan hanya ditulis ke Sheets tiap 4 menit per orang (menjaga kuota API). Paling akurat di server tunggal (VPS / `next start`); di hosting serverless dengan banyak instance, status bisa terlambat beberapa menit.
- Mode offline hanya untuk halaman Kasir (lihat bagian "Mode offline"). Halaman lain tetap butuh internet. Service worker hanya aktif pada build produksi (`npm run build && npm start`, atau deploy), bukan `npm run dev`.

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