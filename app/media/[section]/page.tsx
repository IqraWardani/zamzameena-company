import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardContentPage } from "@/components/standard-content-page";
import { mediaPages } from "@/data/content-pages";

type MediaPageProps = {
  params: Promise<{ section: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(mediaPages).map((section) => ({ section }));
}

export async function generateMetadata({ params }: MediaPageProps): Promise<Metadata> {
  const { section } = await params;
  const page = mediaPages[section];

  if (!page) notFound();

  return {
    title: page.title,
    description: page.description,
  };
}

export default async function MediaPage({ params }: MediaPageProps) {
  const { section } = await params;
  const page = mediaPages[section];

  if (!page) notFound();

  return <StandardContentPage page={page} />;
}
