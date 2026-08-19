import type { Metadata } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/*
  The UI is set in Manrope, and it is served rather than borrowed from the OS -
  every platform gets the same face, at the same weights, instead of Apple
  rendering one thing and Windows another. Semi-condensed and open-countered,
  it holds the small label sizes the app leans on without the figures crowding.
*/
const sans = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
  themeColor: "#0a0c11",
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
