import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Zamzameena — Intelligence Business Ecosystem",
    template: "%s | Zamzameena",
  },
  description: "PT Zamzameena Ainsa Synergy builds an intelligence business ecosystem through Smart Market, platform-centric operations, data intelligence, and strategic partnership.",
  openGraph: {
    title: "Zamzameena — Intelligence Business Ecosystem",
    description: "An integrated corporate profile for PT Zamzameena Ainsa Synergy, focused on data-led business architecture, ecosystem participation, and strategic growth.",
    type: "website",
    siteName: "Zamzameena",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-stone-50 text-zinc-900">
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
