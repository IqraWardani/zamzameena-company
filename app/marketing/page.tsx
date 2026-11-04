import type { Metadata } from "next";
import { StandardContentPage } from "@/components/standard-content-page";
import { marketingPage } from "@/data/content-pages";

export const metadata: Metadata = {
  title: marketingPage.title,
  description: marketingPage.description,
};

export default function MarketingPage() {
  return <StandardContentPage page={marketingPage} />;
}
