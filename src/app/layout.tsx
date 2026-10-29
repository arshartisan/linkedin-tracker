import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { DesktopTitleBar } from "@/components/DesktopTitleBar";
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
  themeColor: "#070708",
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
      // The script below adds "desktop" before hydration.
      suppressHydrationWarning
    >
      <body className="min-h-full">
        {/*
          Tauri injects __TAURI_INTERNALS__ before any page script runs, so this
          tags the desktop app before first paint and the frameless chrome
          never flashes in or out.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if (window.__TAURI_INTERNALS__) document.documentElement.classList.add("desktop")`,
          }}
        />
        <DesktopTitleBar />
        {children}
      </body>
    </html>
  );
}
