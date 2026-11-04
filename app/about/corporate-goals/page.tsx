import type { Metadata } from "next";
import { CorporateGoalsPageContent } from "@/components/corporate-goals-page-content";

export const metadata: Metadata = {
  title: "Corporate Goals",
  description:
    "Our corporate goals define the direction of our growth and guide the development of an interconnected, resilient business ecosystem.",
};

export default function CorporateGoalsPage() {
  return <CorporateGoalsPageContent />;
}
