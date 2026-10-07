import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Beranda | PT Zamzameena Ainsa Synergy",
    template: "%s | PT Zamzameena Ainsa Synergy",
  },
  description: "PT Zamzameena Ainsa Synergy membangun ekosistem bisnis digital yang menghubungkan pasar, data, dan mitra.",
  icons: {
    icon: "/assets/logo.svg",
  },
  openGraph: {
    title: "PT Zamzameena Ainsa Synergy",
    description: "Ekosistem bisnis digital yang menghubungkan pasar, data, dan mitra.",
    type: "website",
    siteName: "PT Zamzameena Ainsa Synergy",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#F4F5F6" />
      </head>
      <body>
        {children}
        <Script src="/js/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
