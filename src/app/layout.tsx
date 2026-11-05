import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { themeScript } from "@/lib/themeScript";

// Plus Jakarta Sans: huruf yang dirancang di Indonesia, jelas dibaca di layar kecil dan ramah untuk berbagai usia
const sans = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = { title: "Kasir Toko", description: "Aplikasi kasir untuk warung makan, toko barang, dan toko sembako. Banyak cabang, struk rapi, data di Google Sheets Anda." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${sans.variable} ${mono.variable} font-sans`}>{children}</body>
    </html>
  );
}