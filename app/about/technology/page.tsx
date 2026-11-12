import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/coming-soon-page";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Product knowledge and ecosystem understanding for Zamzameena's business architecture and commercial positioning.",
};

export default function TechnologyPage() {
  return (
    <ComingSoonPage
      heroTitle="TECHNOLOGY"
      heroTagline="Product knowledge and ecosystem understanding for Zamzameena's business architecture and commercial positioning."
      heroImage="/images/figma/about-hero.webp"
      description="We are preparing a dedicated space for Zamzameena Ainsa Synergy's technology, products, and ecosystem. Leave your email and we will let you know when it opens."
    />
  );
}
