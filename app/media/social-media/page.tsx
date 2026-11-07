import type { Metadata } from "next";
import {
  ComingSoonPage,
  type ComingSoonFeature,
} from "@/components/coming-soon-page";

export const metadata: Metadata = {
  title: "Social Media",
  description:
    "Zamzameena Ainsa Synergy is building a new space for meaningful social media connections and conversations.",
};

const features: ComingSoonFeature[] = [
  {
    title: "Connections",
    description: "Meaningful ties between people, ideas, and opportunities.",
    icon: "connections",
  },
  {
    title: "Insights",
    description: "Valuable perspectives shared openly with our community.",
    icon: "insights",
  },
  {
    title: "Conversations",
    description: "Dialogue that brings people closer together.",
    icon: "conversations",
  },
];

export default function SocialMediaPage() {
  return (
    <ComingSoonPage
      heroTitle="SOCIAL MEDIA"
      heroTagline="Building meaningful connections, sharing valuable insights, and creating conversations that bring people, ideas, and opportunities closer together."
      heroImage="/images/figma/about-hero.webp"
      description="We are shaping a new space for Zamzameena Ainsa Synergy's social media, built around conversations that matter. Leave your email and we will let you know when it opens."
      features={features}
    />
  );
}
