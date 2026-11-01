import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import { CONFIG } from "./_lib/config";
import "./globals.css";

const display = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

const text = Hanken_Grotesk({
  variable: "--font-text",
  subsets: ["latin"],
  display: "swap",
});

const title = `Pernikahan ${CONFIG.groom.name} & ${CONFIG.bride.name}`;

export const metadata: Metadata = {
  title,
  description: `Undangan pernikahan ${CONFIG.groom.name} & ${CONFIG.bride.name}, Sabtu, 05 Desember 2026.`,
  openGraph: {
    title,
    description: "Kami mengundang Anda hadir dan mendoakan. Sabtu, 05 Desember 2026.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1B1210",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
