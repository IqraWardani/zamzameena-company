import type { Metadata } from "next";
import { BusinessPageContent } from "@/components/business-page-content";
import { SiteFrame } from "@/components/site-frame";

export const metadata: Metadata = {
  title: "Business",
  description:
    "Explore Zamzameena's partnership network, distribution and commerce model, and connected ecosystem intelligence layer.",
};

export default function AboutBusinessPage() {
  return (
    <SiteFrame>
      <BusinessPageContent />
    </SiteFrame>
  );
}
