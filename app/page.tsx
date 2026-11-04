import type { Metadata } from "next";
import { CtaBanner } from "@/components/cta-banner";
import { EcosystemSection } from "@/components/home/ecosystem-section";
import { FoundersSection } from "@/components/home/founders-section";
import { HomeHero } from "@/components/home/home-hero";
import { HomeHighlights } from "@/components/home/home-highlights";
import { SmartMarketSection } from "@/components/home/smart-market-section";

export const metadata: Metadata = {
  title: "Home",
  description:
    "Discover Zamzameena Ainsa Synergy, an intelligence business ecosystem connecting partners, markets, and integrated supply chains.",
  openGraph: {
    title: "Zamzameena Ainsa Synergy | Intelligence Business Ecosystem",
    description:
      "Connecting businesses, partners, and markets to create lasting value through collaboration and intelligence.",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="home-design">
      <main id="main-content">
        <HomeHero />
        <HomeHighlights />
        <EcosystemSection />
        <SmartMarketSection />
        <FoundersSection />
        <CtaBanner variant="home-design" />
      </main>
    </div>
  );
}
