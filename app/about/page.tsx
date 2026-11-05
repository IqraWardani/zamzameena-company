import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "About Zamzameena Ainsa Synergy",
  description:
    "Learn how Zamzameena Ainsa Synergy connects products, businesses, markets, and technology.",
  openGraph: {
    title: "About Zamzameena Ainsa Synergy",
    description:
      "Discover the principles and direction behind the Zamzameena business ecosystem.",
    type: "website",
  },
};

export default function AboutPage() {
  redirect("/about/company-profile");
}
