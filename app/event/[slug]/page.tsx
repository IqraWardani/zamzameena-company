import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventDetailPage } from "@/components/public-event-pages";
import { getPublishedEventBySlug } from "@/lib/public-events/data";

export const dynamic = "force-dynamic";

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) return { title: "Event tidak ditemukan" };

  return {
    title: event.name,
    description: event.description ?? `Informasi publik mengenai ${event.name}.`,
  };
}

export default async function PublicEventDetailRoute({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  return <EventDetailPage event={event} />;
}
