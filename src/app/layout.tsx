import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Barlow_Condensed, Source_Sans_3 } from "next/font/google";

import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Whistle — NBA in plain English",
  description:
    "A live NBA companion that explains what just happened, for people who don't know the rules yet.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
