import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventTicketPage } from "@/components/public-event-pages";
import { getPublishedEventBySlug } from "@/lib/public-events/data";

export const dynamic = "force-dynamic";

type EventTicketPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EventTicketPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) return { title: "Event tidak ditemukan" };
  return { title: `Tiket | ${event.name}` };
}

export default async function PublicEventTicketRoute({ params }: EventTicketPageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  return <EventTicketPage event={event} />;
}
