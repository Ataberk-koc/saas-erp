import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/providers/language-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NEXURA - KOBİ'ler için Yapay Zeka Destekli Ön Muhasebe",
  description: "Faturalarınızı yönetin, gelir-gider takibi yapın ve yapay zeka asistanı ile finansal durumunuzu anında öğrenin. Ücretsiz deneyin.",
  keywords: ["ön muhasebe", "erp", "yapay zeka", "fatura kesme", "cari hesap takip"],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%233b82f6' width='100' height='100' rx='10'/><text x='50' y='70' font-size='70' font-weight='bold' fill='white' text-anchor='middle'>N</text></svg>",
  },
  openGraph: {
    title: "NEXURA - Dijital CFO'nuz",
    description: "İşletmenizi cepten yönetin. Kredi kartı gerekmeden hemen başlayın.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
        <Toaster position="top-center" />
        {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
