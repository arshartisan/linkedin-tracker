import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Inter_Tight({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Reach - Daily Outreach Tracker",
  description: "Log every LinkedIn connect you send and hold the daily line.",
};

export const viewport = {
  themeColor: "#0a0d12",
};

/*
  Fonts and the stylesheet only. The signed-in shell - sidebar, data provider -
  lives in (app)/layout.tsx, so /login renders on a bare page instead of behind
  a nav it can't use yet.
*/
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
