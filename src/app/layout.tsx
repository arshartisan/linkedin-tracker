import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const sans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reach - Daily Outreach Tracker",
  description: "Log every LinkedIn connect you send and hold the daily line.",
};

export const viewport = {
  themeColor: "#161616",
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
      className={`${sans.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
