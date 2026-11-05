import type { Metadata } from "next";
import { AboutPageContent } from "@/components/about-page-content";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "Company Profile",
  description:
    "Learn about Zamzameena Ainsa Synergy's identity, direction, and business philosophy.",
};

export default function CompanyProfilePage() {
  return (
    <SiteFrame variant="about-design">
      <AboutPageContent />
    </SiteFrame>
  );
}
