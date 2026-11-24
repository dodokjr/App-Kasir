import type { Metadata } from "next";
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import RegisterSW from "@/components/RegisterSW";
import TrafficBeacon from "@/components/TrafficBeacon";
import ThemeSync from "@/components/ThemeSync";
import { themeScript } from "@/lib/themeScript";
import { FeedbackProvider } from "@/components/Feedback";

// Plus Jakarta Sans
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
});

// IBM Plex Mono
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Kasir Toko",
  // Logo Galaxy Kasir: file-file ini ada di folder public/
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  description:
    "Aplikasi kasir untuk warung makan, toko barang, dan toko sembako. Banyak cabang, struk rapi, data di Google Sheets Anda.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>

      <body className={`${sans.variable} ${mono.variable} font-sans`}>
        {/* Menjaga tema + warna tetap sama di setiap halaman */}
        <ThemeSync />
        <FeedbackProvider>
          {children}
          <RegisterSW />
          <TrafficBeacon />
        </FeedbackProvider>
      </body>
    </html>
  );
}