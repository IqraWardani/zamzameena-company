import type { Metadata } from "next";
import { StandardContentPage } from "@/components/standard-content-page";
import { certificationsPage } from "@/data/content-pages";

export const metadata: Metadata = {
  title: certificationsPage.title,
  description: certificationsPage.description,
};

export default function CertificationsPage() {
  return <StandardContentPage page={certificationsPage} />;
}
