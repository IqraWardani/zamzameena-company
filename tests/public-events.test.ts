import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  getPublicEventBySlug,
  getPublicEventPath,
  listPublicEvents,
  type PublicEventRepository,
} from "@/lib/public-events/public";

type EventRow = Awaited<ReturnType<PublicEventRepository["listPublishedEvents"]>>[number];
type EventWithTickets = NonNullable<
  Awaited<ReturnType<PublicEventRepository["findPublishedEvent"]>>
>;
type TicketRow = EventWithTickets["ticketTypes"][number];

const now = new Date("2027-01-01T00:00:00.000Z");

function makeEvent(slug = "summit-2027"): EventRow {
  return {
    slug,
    name: "Synergy Preneur Summit 2027",
    description: "Informasi publik event.",
    startsAt: new Date("2027-06-01T09:00:00.000Z"),
    endsAt: new Date("2027-06-01T17:00:00.000Z"),
    timezone: "Asia/Jakarta",
    venueName: "Venue terdaftar",
    venueAddress: null,
    registrationOpensAt: null,
    registrationClosesAt: null,
  };
}

function makeTicket(
  code: string,
  overrides: Partial<TicketRow> = {},
): TicketRow {
  return {
    id: `ticket-${code}`,
    code,
    name: `Tiket ${code}`,
    description: null,
    priceAmount: new Prisma.Decimal("250000.00"),
    currency: "IDR",
    capacity: 100,
    isActive: true,
    salesOpensAt: null,
    salesClosesAt: null,
    _count: { registrations: 1 },
    ...overrides,
  };
}

function detailRepository(
  event: EventWithTickets | null,
): PublicEventRepository {
  return {
    async listPublishedEvents() {
      return event ? [event] : [];
    },
    async findPublishedEvent() {
      return event;
    },
  };
}

test("public event listing prioritizes upcoming events before past events", async () => {
  const future = makeEvent("future");
  const past = {
    ...makeEvent("past"),
    startsAt: new Date("2026-12-01T09:00:00.000Z"),
  };
  const repository: PublicEventRepository = {
    async listPublishedEvents() {
      return [past, future];
    },
    async findPublishedEvent() {
      return null;
    },
  };
  const result = await listPublicEvents(repository, now);

  assert.equal(result.length, 2);
  assert.deepEqual(result.map((event) => event.slug), ["future", "past"]);
});

test("published event detail resolves by slug and returns only public fields", async () => {
  const event = {
    ...makeEvent(),
    keyVisualUrl: "/api/public/events/summit-2027/key-visual",
    ticketTypes: [makeTicket("regular")],
  } satisfies EventWithTickets;
  let requestedSlug = "";
  const repository: PublicEventRepository = {
    async listPublishedEvents() {
      return [];
    },
    async findPublishedEvent(slug) {
      requestedSlug = slug;
      return event;
    },
  };

  const result = await getPublicEventBySlug("summit-2027", repository, now);
  assert.equal(requestedSlug, "summit-2027");
  assert.ok(result);
  assert.equal(result.keyVisualUrl, event.keyVisualUrl);
  assert.deepEqual(Object.keys(result).sort(), [
    "description",
    "endsAt",
    "keyVisualUrl",
    "name",
    "registrationClosesAt",
    "registrationOpensAt",
    "registrationStatus",
    "slug",
    "startsAt",
    "ticketTypes",
    "timezone",
    "venueAddress",
    "venueName",
  ]);
  assert.deepEqual(Object.keys(result.ticketTypes[0]).sort(), [
    "capacity",
    "code",
    "currency",
    "description",
    "id",
    "name",
    "priceAmount",
  ]);
});

test("published events without an active Key Visual expose null for the existing visual fallback", async () => {
  const event = {
    ...makeEvent(),
    ticketTypes: [],
  } satisfies EventWithTickets;

  const result = await getPublicEventBySlug(
    event.slug,
    detailRepository(event),
    now,
  );

  assert.equal(result?.keyVisualUrl, null);
});

test("unpublished and missing slugs resolve to the same not-found result", async () => {
  const repository = detailRepository(null);
  assert.equal(await getPublicEventBySlug("draft", repository, now), null);
  assert.equal(await getPublicEventBySlug("missing", repository, now), null);
});

test("only active, in-window, not-full ticket types are exposed", async () => {
  const event = {
    ...makeEvent(),
    ticketTypes: [
      makeTicket("available"),
      makeTicket("inactive", { isActive: false }),
      makeTicket("not-open", { salesOpensAt: new Date("2027-02-01T00:00:00.000Z") }),
      makeTicket("closed", { salesClosesAt: now }),
      makeTicket("full", { capacity: 1, _count: { registrations: 1 } }),
    ],
  } satisfies EventWithTickets;
  const result = await getPublicEventBySlug(
    "summit-2027",
    detailRepository(event),
    now,
  );

  assert.deepEqual(result?.ticketTypes.map((ticket) => ticket.code), ["available"]);
});

test("ticket data is hidden while registration is not open", async () => {
  const event = {
    ...makeEvent(),
    registrationOpensAt: new Date("2027-02-01T00:00:00.000Z"),
    ticketTypes: [makeTicket("available")],
  } satisfies EventWithTickets;
  const result = await getPublicEventBySlug(
    "summit-2027",
    detailRepository(event),
    now,
  );

  assert.equal(result?.registrationStatus, "upcoming");
  assert.deepEqual(result?.ticketTypes, []);
});

test("event and ticket CTAs resolve to the matching public routes", () => {
  assert.equal(getPublicEventPath("summit-2027"), "/event/summit-2027");
  assert.equal(
    getPublicEventPath("summit-2027", "ticket"),
    "/event/summit-2027/ticket",
  );
  assert.equal(
    getPublicEventPath("summit-2027", "order", "regular pass"),
    "/event/summit-2027/order?ticket=regular%20pass",
  );
  assert.equal(
    getPublicEventPath("synergy-preneur-summit-2027", "order", "SPS-2027", "ARM SPS-001"),
    "/event/synergy-preneur-summit-2027/order?ticket=SPS-2027&ref=ARM%20SPS-001",
  );
});
