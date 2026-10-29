import type { Metadata } from "next";
import { AboutStrategyPage } from "@/components/about-strategy-page";
import { corporateGoalsPage } from "@/data/about-strategy-pages";

export const metadata: Metadata = {
  title: "Corporate Goals",
  description:
    "Review a structured framework for Zamzameena Ainsa Synergy's corporate goals, with suggested categories pending approval.",
};

export default function CorporateGoalsPage() {
  return <AboutStrategyPage page={corporateGoalsPage} />;
}
