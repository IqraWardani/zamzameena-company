import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/coming-soon-page";

export const metadata: Metadata = {
  title: "Career",
  description:
    "Explore future career opportunities with Zamzameena Ainsa Synergy.",
};

export default function CareerPage() {
  return (
    <ComingSoonPage
      heroTitle="CAREER"
      heroTagline="Build your future with a team shaping a more connected business ecosystem."
      heroImage="/images/figma/about-hero.webp"
      description="We are getting ready to share career opportunities at Zamzameena Ainsa Synergy. Leave your email and we will let you know when they become available."
    />
  );
}
