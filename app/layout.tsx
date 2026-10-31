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

const title = `Pernikahan ${CONFIG.bride.name} & ${CONFIG.groom.name}`;

export const metadata: Metadata = {
  title,
  description: `Undangan pernikahan ${CONFIG.bride.name} & ${CONFIG.groom.name}, Sabtu 20 Februari 2027.`,
  openGraph: {
    title,
    description: "Kami mengundang Anda hadir dan mendoakan. Sabtu, 20 Februari 2027.",
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
