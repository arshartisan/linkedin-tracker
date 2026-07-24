import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DataProvider } from "@/components/DataProvider";
import { Nav } from "@/components/Nav";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

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
      <body className="min-h-full">
        <DataProvider>
          <SidebarProvider>
            <Nav />
            {/* The rail is fixed, so only this pane scrolls. */}
            <SidebarInset className="pb-24 md:pb-0">{children}</SidebarInset>
          </SidebarProvider>
        </DataProvider>
      </body>
    </html>
  );
}
