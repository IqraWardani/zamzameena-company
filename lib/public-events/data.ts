import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  getPublicEventBySlug,
  listPublicEvents,
  type PublicEventRepository,
} from "@/lib/public-events/public";
export type {
  PublicEvent,
  PublicEventRepository,
  PublicTicketType,
} from "@/lib/public-events/public";

const PUBLIC_EVENT_SELECT = {
  slug: true,
  name: true,
  description: true,
  startsAt: true,
  endsAt: true,
  timezone: true,
  venueName: true,
  venueAddress: true,
  registrationOpensAt: true,
  registrationClosesAt: true,
  keyVisuals: {
    where: { isActive: true, deletedAt: null },
    select: { url: true },
    take: 1,
  },
} satisfies Prisma.EventSelect;

const PUBLIC_TICKET_TYPE_SELECT = {
  id: true,
  code: true,
  name: true,
  description: true,
  priceAmount: true,
  currency: true,
  capacity: true,
  isActive: true,
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
} satisfies Prisma.TicketTypeSelect;

type PrismaPublicEventRow = Prisma.EventGetPayload<{
  select: typeof PUBLIC_EVENT_SELECT;
}>;

function toPublicEventRow(event: PrismaPublicEventRow) {
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
    keyVisualUrl: event.keyVisuals[0]?.url ?? null,
  };
}

const prismaPublicEventRepository: PublicEventRepository = {
  async listPublishedEvents() {
    const events = await prisma.event.findMany({
      where: { status: "published" },
      select: PUBLIC_EVENT_SELECT,
      orderBy: [{ startsAt: "asc" }, { name: "asc" }],
    });
    return events.map(toPublicEventRow);
  },
  async findPublishedEvent(slug, now) {
    const event = await prisma.event.findFirst({
      where: { slug, status: "published" },
      select: {
        ...PUBLIC_EVENT_SELECT,
        ticketTypes: {
          where: {
            isActive: true,
            AND: [
              {
                OR: [
                  { salesOpensAt: null },
                  { salesOpensAt: { lte: now } },
                ],
              },
              {
                OR: [
                  { salesClosesAt: null },
                  { salesClosesAt: { gt: now } },
                ],
              },
            ],
          },
          select: PUBLIC_TICKET_TYPE_SELECT,
          orderBy: [{ priceAmount: "asc" }, { name: "asc" }],
        },
      },
    });
    return event
      ? {
          ...toPublicEventRow(event),
          ticketTypes: event.ticketTypes,
        }
      : null;
  },
};

export async function listPublishedEvents() {
  return listPublicEvents(prismaPublicEventRepository);
}

export async function getPublishedEventBySlug(slug: string) {
  return getPublicEventBySlug(slug, prismaPublicEventRepository);
}
