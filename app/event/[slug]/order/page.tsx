import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventOrderPage } from "@/components/public-event-pages";
import { getPublishedEventBySlug } from "@/lib/public-events/data";

export const dynamic = "force-dynamic";

type EventOrderRouteProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ticket?: string | string[]; ref?: string | string[] }>;
};

export async function generateMetadata({ params }: EventOrderRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) return { title: "Event tidak ditemukan" };
  return { title: `Order Tiket | ${event.name}` };
}

export default async function PublicEventOrderRoute({
  params,
  searchParams,
}: EventOrderRouteProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  const ticketCode = typeof query.ticket === "string" ? query.ticket : null;
  const referralCode =
    typeof query.ref === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/.test(query.ref)
      ? query.ref.toUpperCase()
      : "";
  const selectedTicket =
    event.ticketTypes.find((ticket) => ticket.code === ticketCode) ?? null;

  return (
    <EventOrderPage
      event={event}
      initialReferralCode={referralCode}
      selectedTicket={selectedTicket}
    />
  );
}
