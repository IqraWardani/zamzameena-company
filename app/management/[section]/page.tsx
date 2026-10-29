import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StandardContentPage } from "@/components/standard-content-page";
import { managementPages } from "@/data/content-pages";

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

  return <StandardContentPage page={page} />;
}
