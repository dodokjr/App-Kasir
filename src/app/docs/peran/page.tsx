export default function Peran() {
  return (
    <>
      <h1>Peran dan hak akses</h1>
      <p>Setiap akun punya satu peran. Peran menentukan halaman dan data apa yang bisa diakses.</p>
      <table>
        <thead><tr><th>Peran</th><th>Bisa melakukan</th><th>Cakupan data</th></tr></thead>
        <tbody>
          <tr><td>Developer</td><td>Menambah akun admin, melihat dan menonaktifkan toko</td><td>Semua toko</td></tr>
          <tr><td>Admin</td><td>Melihat dan menonaktifkan toko</td><td>Semua toko</td></tr>
          <tr><td>Kepala toko</td><td>Menambah cabang, menambah kepala cabang, kasir, dan gudang, mengelola stok, kasir (buka–tutup), melihat transaksi dan keuangan, mengatur struk</td><td>Seluruh cabang di tokonya</td></tr>
          <tr><td>Kepala cabang</td><td>Menambah kasir dan gudang, mengelola stok, kasir (buka–tutup), melihat transaksi dan keuangan</td><td>Cabangnya</td></tr>
          <tr><td>Kasir</td><td>Membuka dan menutup kasir, membuat transaksi, mencetak struk dan PDF</td><td>Cabangnya</td></tr>
          <tr><td>Gudang</td><td>Menambah produk, mengubah harga dan stok</td><td>Cabangnya</td></tr>
        </tbody>
      </table>
      <h2>Toko dinonaktifkan</h2>
      <p>Jika admin menonaktifkan sebuah toko, semua akun di toko itu tidak bisa masuk sampai toko diaktifkan lagi. Data tidak dihapus.</p>
    </>
  );
}
