import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import SwRegister from "@/components/SwRegister";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club 10K | 10,000 membresías numeradas",
  description:
    "Elige tu número del 0000 al 9999 y obtén increíbles beneficios en Club 10K.",
  keywords: "club 10k, membresías numeradas, Colombia, selección especial",
  manifest: "/manifest.json",
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
    <html lang="es" className={`${geist.variable} h-full`}>
      <head>
        <meta name="theme-color" content="#102463" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/pwa-icon/180" />
      </head>
      <body className="min-h-full flex flex-col antialiased bg-gray-50">
        <Providers>{children}</Providers>
        <SwRegister />
      </body>
    </html>
  );
}
