// Isi lewat .env.local agar halaman publik menampilkan data pengelola yang benar
export const SITE = {
  name: "Kasir Toko",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "halo@contoh.com",
  operator: process.env.NEXT_PUBLIC_OPERATOR_NAME || "Pengelola Kasir Toko",
  address: process.env.NEXT_PUBLIC_OPERATOR_ADDRESS || "Indonesia",
  updated: "4 November 2026",
};
