import type { Prisma } from "@prisma/client";

export type PublicEventRow = {
  slug: string;
  name: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  venueName: string | null;
  venueAddress: string | null;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  keyVisualUrl?: string | null;
};

export type PublicTicketTypeRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceAmount: Pick<Prisma.Decimal, "toFixed">;
  currency: string;
  capacity: number | null;
  isActive: boolean;
  salesOpensAt: Date | null;
  salesClosesAt: Date | null;
  _count: { registrations: number };
};

export type PublicEventWithTicketsRow = PublicEventRow & {
  ticketTypes: PublicTicketTypeRow[];
};

export type PublicTicketType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceAmount: string;
  currency: string;
  capacity: number | null;
};

export type PublicEvent = PublicEventRow & {
  keyVisualUrl: string | null;
  registrationStatus: "open" | "upcoming" | "closed";
  ticketTypes: PublicTicketType[];
};

export type PublicEventRepository = {
  listPublishedEvents(): Promise<PublicEventRow[]>;
  findPublishedEvent(
    slug: string,
    now: Date,
  ): Promise<PublicEventWithTicketsRow | null>;
};

export function getPublicEventPath(
  slug: string,
  page?: "ticket" | "order",
  ticketCode?: string,
  referralCode?: string,
): string {
  const basePath = `/event/${encodeURIComponent(slug)}`;
  if (!page) return basePath;

  const pagePath = `${basePath}/${page}`;
  if (page !== "order" || !ticketCode) return pagePath;

  const search = `ticket=${encodeURIComponent(ticketCode)}`;
  return `${pagePath}?${search}${
    referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""
  }`;
}

function getRegistrationStatus(
  event: Pick<PublicEventRow, "registrationOpensAt" | "registrationClosesAt">,
  now: Date,
): PublicEvent["registrationStatus"] {
  if (event.registrationClosesAt && event.registrationClosesAt <= now) {
    return "closed";
  }
  if (event.registrationOpensAt && event.registrationOpensAt > now) {
    return "upcoming";
  }
  return "open";
}

function mapPublicEvent(
  event: PublicEventWithTicketsRow | PublicEventRow,
  now: Date,
): PublicEvent {
  const registrationStatus = getRegistrationStatus(event, now);
  const ticketTypes = "ticketTypes" in event && registrationStatus === "open"
    ? event.ticketTypes
        .filter((ticket) => {
          const salesOpen = !ticket.salesOpensAt || ticket.salesOpensAt <= now;
          const salesNotClosed =
            !ticket.salesClosesAt || ticket.salesClosesAt > now;
          const capacityAvailable =
            ticket.capacity === null ||
            ticket._count.registrations < ticket.capacity;
          return ticket.isActive && salesOpen && salesNotClosed && capacityAvailable;
        })
        .map((ticket) => ({
          id: ticket.id,
          code: ticket.code,
          name: ticket.name,
          description: ticket.description,
          priceAmount: ticket.priceAmount.toFixed(2),
          currency: ticket.currency.trim(),
          capacity: ticket.capacity,
        }))
    : [];

  return {
    slug: event.slug,
    name: event.name,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    timezone: event.timezone,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    registrationOpensAt: event.registrationOpensAt,
    registrationClosesAt: event.registrationClosesAt,
    keyVisualUrl: event.keyVisualUrl ?? null,
    registrationStatus,
    ticketTypes,
  };
}

export async function listPublicEvents(
  repository: PublicEventRepository,
  now = new Date(),
): Promise<PublicEvent[]> {
  const events = await repository.listPublishedEvents();
  return events
    .map((event) => mapPublicEvent(event, now))
    .sort((left, right) => {
      const leftIsPast = left.startsAt < now;
      const rightIsPast = right.startsAt < now;
      if (leftIsPast !== rightIsPast) return leftIsPast ? 1 : -1;

      const dateOrder = leftIsPast
        ? right.startsAt.getTime() - left.startsAt.getTime()
        : left.startsAt.getTime() - right.startsAt.getTime();
      return dateOrder || left.name.localeCompare(right.name);
    });
}

export async function getPublicEventBySlug(
  slug: string,
  repository: PublicEventRepository,
  now = new Date(),
): Promise<PublicEvent | null> {
  const event = await repository.findPublishedEvent(slug, now);
  return event ? mapPublicEvent(event, now) : null;
}
