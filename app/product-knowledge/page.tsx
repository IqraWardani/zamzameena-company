import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Technology",
  description:
    "Product knowledge and ecosystem understanding for Zamzameena's business architecture and commercial positioning.",
};

export default function ProductKnowledgePage() {
  redirect("/about/technology");
}
