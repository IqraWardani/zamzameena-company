import type { Metadata } from "next";
import { ComingSoonPage } from "@/components/coming-soon-page";

export const metadata: Metadata = {
  title: "Certifications",
  description:
    "Verified company certifications and supporting information will be presented in this section.",
};

export default function CertificationsPage() {
  return (
    <ComingSoonPage
      heroTitle="CERTIFICATIONS"
      heroTagline="Demonstrating our commitment to quality, trust, and recognized standards."
      heroImage="/images/figma/about-hero.webp"
      description="We are preparing a dedicated space for Zamzameena Ainsa Synergy's verified certifications and supporting information. Leave your email and we will let you know when it opens."
    />
  );
}
