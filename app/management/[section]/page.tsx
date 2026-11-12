import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ComingSoonPage } from "@/components/coming-soon-page";
import { FounderPageContent } from "@/components/founder-page-content";
import { StandardContentPage } from "@/components/standard-content-page";
import { managementPages } from "@/data/content-pages";

type ComingSoonContent = {
  heroTitle: string;
  heroTagline: string;
  description: string;
};

const comingSoonPages: Record<string, ComingSoonContent> = {
  struktur: {
    heroTitle: "STRUKTUR",
    heroTagline: "A clear organization structure brings people, roles, and shared goals together.",
    description:
      "We are preparing a dedicated space for Zamzameena Ainsa Synergy's organization structure and roles. Leave your email and we will let you know when it opens.",
  },
  direksi: {
    heroTitle: "DIREKSI",
    heroTagline: "Meet the leadership guiding Zamzameena Ainsa Synergy's direction and growth.",
    description:
      "We are preparing a dedicated space for approved director profiles and information. Leave your email and we will let you know when it opens.",
  },
  sdm: {
    heroTitle: "SDM",
    heroTagline: "Our people are at the heart of a connected and growing business ecosystem.",
    description:
      "We are preparing a dedicated space for people and human resources at Zamzameena Ainsa Synergy. Leave your email and we will let you know when it opens.",
  },
};

type ManagementPageProps = {
  params: Promise<{ section: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(managementPages).map((section) => ({ section }));
}

export async function generateMetadata({
  params,
}: ManagementPageProps): Promise<Metadata> {
  const { section } = await params;
  const page = managementPages[section];

  if (!page) notFound();

  return {
    title: page.title,
    description: page.description,
  };
}

export default async function ManagementPage({ params }: ManagementPageProps) {
  const { section } = await params;
  const page = managementPages[section];

  if (!page) notFound();

  if (section === "founder") {
    return <FounderPageContent />;
  }

  const comingSoonPage = comingSoonPages[section];

  if (comingSoonPage) {
    return (
      <ComingSoonPage
        {...comingSoonPage}
        heroImage="/images/figma/about-hero.webp"
      />
    );
  }

  return <StandardContentPage page={page} />;
}
