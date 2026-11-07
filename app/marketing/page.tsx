import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/coming-soon-page";

export const metadata: Metadata = {
  title: "Marketing",
  description:
    "Discover Zamzameena Ainsa Synergy's marketing initiatives, campaigns, and opportunities.",
};

export default function MarketingPage() {
  return (
    <ComingSoonPage
      heroTitle="MARKETING"
      heroTagline="Sharing our vision, connecting with our audience, and creating new opportunities for growth."
      heroImage="/images/figma/about-hero.webp"
      description="We are preparing a new space for Zamzameena Ainsa Synergy's marketing initiatives. Leave your email and we will let you know when it opens."
    />
  );
}
