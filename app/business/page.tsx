import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Business",
  description:
    "Explore Zamzameena's partnership network, distribution and commerce model, and connected ecosystem intelligence layer.",
  openGraph: {
    title: "Business | Zamzameena Ainsa Synergy",
    description:
      "A connected business model bringing partnerships, commerce, and ecosystem intelligence together.",
    type: "website",
  },
};

export default function BusinessPage() {
  redirect("/about/business");
}
