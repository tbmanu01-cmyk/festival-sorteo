import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import SwRegister from "@/components/SwRegister";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Club 10K | 10,000 membresías numeradas",
  description:
    "Elige tu número del 0000 al 9999 y obtén increíbles beneficios en Club 10K.",
  keywords: "club 10k, membresías numeradas, Colombia, selección especial",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Club 10K | 10,000 membresías numeradas",
    description:
      "Elige tu número del 0000 al 9999 y obtén increíbles beneficios en Club 10K.",
    url: "https://club-10k.vercel.app",
    siteName: "Club 10K",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Club 10K | 10,000 membresías numeradas",
    description:
      "Elige tu número del 0000 al 9999 y obtén increíbles beneficios en Club 10K.",
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Club 10K",
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
        <Providers>{children}</Providers>
        <SwRegister />
      </body>
    </html>
  );
}
