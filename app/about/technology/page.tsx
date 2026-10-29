import type { Metadata } from "next";
import { TechnologyPageContent } from "@/components/technology-page-content";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Product knowledge and ecosystem understanding for Zamzameena's business architecture and commercial positioning.",
};

export default function TechnologyPage() {
  return <TechnologyPageContent />;
}
