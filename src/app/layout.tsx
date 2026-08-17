import type { Metadata } from "next";
import { Nunito, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/*
  The UI is set in SF Pro Rounded, which is why the stack in globals.css leads
  with the `ui-rounded` generic - on Apple platforms that resolves to the real
  thing, at the optical sizes Apple ships it in.

  It cannot be self-hosted: Apple licenses SF for use on Apple platforms, not
  for redistribution as a webfont. So Nunito loads underneath it as the
  cross-platform rounded face - geometric, generous counters, the same soft
  temperament - and Windows and Android get a rounded UI rather than falling
  back to something grotesque.
*/
const rounded = Nunito({
  variable: "--font-rounded",
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
      className={`${rounded.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
