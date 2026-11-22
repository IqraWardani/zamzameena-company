import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicRegistrationForm } from "@/components/registration/public-registration-form";
import { prisma } from "@/lib/db";

type PublicEventRegistrationPageProps = {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ ref?: string | string[] }>;
};

export const metadata: Metadata = {
  title: "Event Registration",
  description: "Register for a Zamzameena event.",
};

export default async function PublicEventRegistrationPage({
  params,
  searchParams,
}: PublicEventRegistrationPageProps) {
  const [{ eventSlug }, query] = await Promise.all([params, searchParams]);
  const referralValue = Array.isArray(query.ref) ? query.ref[0] : query.ref;
  const initialReferralCode =
    referralValue && /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/.test(referralValue)
      ? referralValue.toUpperCase()
      : "";
  const now = new Date();
  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, status: { in: ["published", "closed"] } },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      status: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      venueName: true,
      venueAddress: true,
      registrationOpensAt: true,
      registrationClosesAt: true,
      ticketTypes: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          priceAmount: true,
          currency: true,
          capacity: true,
          salesOpensAt: true,
          salesClosesAt: true,
          _count: {
            select: {
              registrations: {
                where: {
                  status: { in: ["pending_payment", "payment_submitted", "confirmed"] },
                },
              },
            },
          },
        },
        orderBy: [{ priceAmount: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!event) notFound();

  const registrationOpen =
    event.status === "published" &&
    (!event.registrationOpensAt || event.registrationOpensAt <= now) &&
    (!event.registrationClosesAt || event.registrationClosesAt > now);
  const tickets = event.ticketTypes
    .filter((ticket) => {
      const withinSalesWindow =
        (!ticket.salesOpensAt || ticket.salesOpensAt <= now) &&
        (!ticket.salesClosesAt || ticket.salesClosesAt > now);
      const withinCapacity =
        ticket.capacity === null || ticket._count.registrations < ticket.capacity;
      return withinSalesWindow && withinCapacity;
    })
    .map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      description: ticket.description,
      price: ticket.priceAmount.toFixed(2),
      currency: ticket.currency.trim(),
    }));

  return (
    <main id="main-content" className="zas-registration-page">
      <header className="zas-registration-header">
        <p className="zas-registration-eyebrow">ZAS EVENT REGISTRATION</p>
        <h1>{event.name}</h1>
        {event.description && <p className="zas-registration-description">{event.description}</p>}
        <dl className="zas-registration-event-meta">
          <div>
            <dt>Date</dt>
            <dd>
              {event.startsAt.toLocaleString("en", { timeZone: event.timezone })}
              {" – "}
              {event.endsAt.toLocaleString("en", { timeZone: event.timezone })}
            </dd>
          </div>
          {event.venueName && (
            <div>
              <dt>Venue</dt>
              <dd>{event.venueName}{event.venueAddress ? `, ${event.venueAddress}` : ""}</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="zas-registration-card" aria-labelledby="registration-form-title">
        <h2 id="registration-form-title">Register to attend</h2>
        {!registrationOpen ? (
          <p className="zas-registration-unavailable" role="status">
            Registration for this event is not currently open.
          </p>
        ) : tickets.length === 0 ? (
          <p className="zas-registration-unavailable" role="status">
            No tickets are currently available for this event.
          </p>
        ) : (
          <PublicRegistrationForm
            eventSlug={event.slug}
            initialReferralCode={initialReferralCode}
            tickets={tickets}
          />
        )}
      </section>
    </main>
  );
}
