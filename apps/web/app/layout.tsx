import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saans - From Field to Delhi",
  description: "An agent-driven web platform for the Delhi Diwali and stubble-burning smog season.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <body className="min-h-screen flex flex-col bg-sand-200 text-text-primary">
        {children}
      </body>
    </html>
  );
}
