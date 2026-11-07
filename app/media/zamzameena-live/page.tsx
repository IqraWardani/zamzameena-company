import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/coming-soon-page";

export const metadata: Metadata = {
  title: "Zamzameena Live",
  description:
    "Zamzameena Live is coming soon. Sign up to hear when our new platform opens.",
};

export default function ZamzameenaLivePage() {
  return (
    <ComingSoonPage
      heroTitle="ZAMZAMEENA LIVE"
      heroTagline="Experience stories, conversations, and moments from across the Zamzameena community."
      heroImage="/images/figma/about-hero.webp"
      description="We are preparing something new for Zamzameena Live. Leave your email and we will let you know when it opens."
    />
  );
}
