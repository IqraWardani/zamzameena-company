import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Zamzameena Ainsa Synergy | Intelligence Business Ecosystem",
    template: "%s | Zamzameena Ainsa Synergy",
  },
  description:
    "Zamzameena Ainsa Synergy connects businesses, partners, and markets through an intelligence-led business ecosystem.",
  icons: {
    icon: "/assets/logo.svg",
  },
  openGraph: {
    title: "Zamzameena Ainsa Synergy",
    description:
      "An intelligence business ecosystem connecting people, markets, and partners.",
    type: "website",
    siteName: "Zamzameena Ainsa Synergy",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <meta name="theme-color" content="#101820" />
      </head>
      <body>
        {children}
        <Script src="/js/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
