import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import SwRegister from "@/components/SwRegister";
import NavMobile from "@/components/NavMobile";
import AdminNavMobile from "@/components/AdminNavMobile";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Tienda 10K | Tu membresía, tu oportunidad",
  description:
    "10,000 membresías numeradas. Participa en la selección aleatoria de Tienda 10K y gana.",
  keywords: "tienda 10k, membresías, selección aleatoria, Colombia",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Tienda 10K | Tu membresía, tu oportunidad",
    description:
      "10,000 membresías numeradas. Participa en la selección aleatoria de Tienda 10K y gana.",
    url: "https://tienda10k.com",
    siteName: "Tienda 10K",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tienda 10K | Tu membresía, tu oportunidad",
    description:
      "10,000 membresías numeradas. Participa en la selección aleatoria de Tienda 10K y gana.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tienda 10K",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunito.variable} h-full`}>
      <head>
        <meta name="theme-color" content="#102463" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-gray-50">
        <Providers>
          {children}
          <NavMobile />
          <AdminNavMobile />
        </Providers>
        <SwRegister />
      </body>
    </html>
  );
}
