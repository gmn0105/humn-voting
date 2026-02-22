import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AlienProviders from "@/components/AlienProviders";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HUMN",
  description: "One Human. One Voice.",
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
        <AlienProviders>{children}</AlienProviders>
      </body>
    </html>
  );
}
