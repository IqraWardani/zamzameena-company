import type { Metadata } from "next";
import { AboutStrategyPage } from "@/components/about-strategy-page";
import { visionMissionPage } from "@/data/about-strategy-pages";

export const metadata: Metadata = {
  title: "Vision & Mission",
  description:
    "This page is prepared for Zamzameena Ainsa Synergy's approved vision and mission statements.",
};

export default function VisionMissionPage() {
  return <AboutStrategyPage page={visionMissionPage} />;
}
