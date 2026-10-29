import type { Metadata } from "next";
import { StandardContentPage } from "@/components/standard-content-page";
import { careerPage } from "@/data/content-pages";

export const metadata: Metadata = {
  title: careerPage.title,
  description: careerPage.description,
};

export default function CareerPage() {
  return <StandardContentPage page={careerPage} />;
}
