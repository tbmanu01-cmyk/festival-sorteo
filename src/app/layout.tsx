import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cajas Sorpresa | 10,000 números",
  description:
    "Elige tu número del 0000 al 9999 y gana increíbles premios en Cajas Sorpresa 10K.",
  keywords: "cajas sorpresa, selección de cajas, Colombia, sorteo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
