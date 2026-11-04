import type { Metadata } from "next";
import { VisionMissionPageContent } from "@/components/vision-mission-page-content";

export const metadata: Metadata = {
  title: "Vision & Mission",
  description:
    "The principles behind Zamzameena Ainsa Synergy's business ecosystem: our vision and mission.",
};

export default function VisionMissionPage() {
  return <VisionMissionPageContent />;
}
