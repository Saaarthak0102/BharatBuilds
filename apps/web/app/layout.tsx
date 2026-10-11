import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Instrument_Serif, Noto_Sans_Devanagari, Noto_Sans_Gurmukhi } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: "italic",
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  weight: ["400", "500", "600", "700"],
  variable: "--font-hi",
  subsets: ["devanagari"],
  display: "swap",
});

const notoSansGurmukhi = Noto_Sans_Gurmukhi({
  weight: ["400", "500", "600", "700"],
  variable: "--font-pa",
  subsets: ["gurmukhi"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#07090D",
};

export const metadata: Metadata = {
  title: "Saans - One good decision at a time",
  description: "An agent-driven web platform for the Delhi Diwali and stubble-burning smog season.",
  appleWebApp: {
    capable: true,
    title: "Saans",
  },
  openGraph: {
    title: "Saans - One good decision at a time",
    description: "An agent-driven web platform for the Delhi Diwali and stubble-burning smog season.",
    images: ["/icons/icon-512.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Saans - One good decision at a time",
    description: "An agent-driven web platform for the Delhi Diwali and stubble-burning smog season.",
    images: ["/icons/icon-512.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${instrumentSerif.variable} ${notoSansDevanagari.variable} ${notoSansGurmukhi.variable}`} data-accent="blue">
      <body className="min-h-screen flex flex-col text-white font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
