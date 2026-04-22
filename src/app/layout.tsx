import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Festival Sorteo 10000 | Cajas Sorpresa",
  description:
    "Participa en el sorteo de cajas sorpresa del festival escolar. Elige tu número del 0000 al 9999 y gana increíbles premios.",
  keywords: "sorteo, festival, cajas sorpresa, lotería escolar, Colombia",
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
