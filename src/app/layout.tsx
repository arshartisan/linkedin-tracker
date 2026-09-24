import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/*
  The UI is set in Inter, loaded as the variable font - no weight list, so the
  whole 100-900 axis ships as one file and any weight the app asks for renders
  exactly rather than snapping to the nearest static cut. Served, not borrowed
  from the OS, so every platform gets the same face.
*/
const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/*
  Mono earns its place on one job now: figures that must not jitter as they
  change, and URLs. Everything that used to be set in it - the small uppercase
  captions especially - moved to the rounded face, which is most of what makes
  the new look calmer than the old one.
*/
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
      className={`${sans.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
