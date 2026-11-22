import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdmin } from "../lib/admin/access-policy";
import {
  canTransitionEventStatus,
  buildDraftEventData,
  EVENT_PERMISSIONS,
  getMissingEventPublishFields,
  isTicketCapacitySufficient,
  permissionForEventTransition,
  validateEventForm,
  validateTicketTypeForm,
} from "../lib/admin/event-validation";
import {
  dateTimeInputValues,
  localDateTimeToIso,
  localDateTimeToOffsetIso,
  slugifyEventName,
} from "../lib/admin/event-datetime";

function eventForm(overrides: Record<string, string> = {}): FormData {
  return new FormDataFrom({
    slug: "annual-gathering",
    eventCode: "SPS",
    name: "Annual Gathering",
    startsAt: "2026-12-01T09:00:00+08:00",
    endsAt: "2026-12-01T17:00:00+08:00",
    timezone: "Asia/Makassar",
    ...overrides,
  });
}

function ticketForm(overrides: Record<string, string> = {}): FormData {
  return new FormDataFrom({
    code: "GENERAL",
    name: "General admission",
    priceAmount: "250000.00",
    currency: "IDR",
    capacity: "250",
    isActive: "true",
    ...overrides,
  });
}

class FormDataFrom extends FormData {
  constructor(values: Record<string, string>) {
    super();
    for (const [key, value] of Object.entries(values)) this.set(key, value);
  }
}

test("event validation accepts a valid event and rejects invalid schedules and timezones", () => {
  assert.equal(validateEventForm(eventForm()).success, true);
  assert.equal(
    validateEventForm(eventForm({ slug: "invalid slug" })).success,
    false,
  );
  assert.equal(
    validateEventForm(eventForm({ eventCode: "S P S" })).success,
    false,
  );
  assert.equal(
    validateEventForm(eventForm({ startsAt: "2026-02-31T09:00:00+08:00" })).success,
    false,
  );
  assert.equal(
    validateEventForm(eventForm({ endsAt: "2026-12-01T08:00:00+08:00" })).success,
    false,
  );
  assert.equal(
    validateEventForm(eventForm({ timezone: "Not/A_Timezone" })).success,
    false,
  );
  const multipleErrors = validateEventForm(
    eventForm({
      slug: "invalid slug",
      name: "",
      startsAt: "invalid",
      timezone: "Not/A_Timezone",
    }),
  );
  assert.equal(multipleErrors.success, false);
  if (!multipleErrors.success) {
    assert.deepEqual(Object.keys(multipleErrors.fieldErrors ?? {}).sort(), [
      "name",
      "slug",
      "startsAt",
      "timezone",
    ]);
  }
  const missingTimes = validateEventForm(
    eventForm({ startsAt: "", endsAt: "" }),
  );
  assert.equal(missingTimes.success, false);
  if (!missingTimes.success) {
    assert.deepEqual(Object.keys(missingTimes.fieldErrors ?? {}).sort(), [
      "endsAt",
      "startsAt",
    ]);
  }
});

test("a new event is always prepared for storage as a draft", () => {
  const validation = validateEventForm(eventForm());
  assert.equal(validation.success, true);
  if (!validation.success) return;

  const data = buildDraftEventData(validation.data, "admin-123");
  assert.equal(data.status, "draft");
  assert.equal(data.createdByAdminUserId, "admin-123");
});

test("event publish requires complete public information", () => {
  const readyEvent = {
    slug: "annual-gathering",
    name: "Annual Gathering",
    description: "Ringkasan event",
    startsAt: new Date("2026-12-01T01:00:00.000Z"),
    endsAt: new Date("2026-12-01T09:00:00.000Z"),
    timezone: "Asia/Makassar",
    venueName: "Venue",
    venueAddress: "Alamat venue",
  };
  assert.deepEqual(getMissingEventPublishFields(readyEvent), []);
  assert.deepEqual(
    getMissingEventPublishFields({ ...readyEvent, venueName: null, description: null }),
    ["Ringkasan / deskripsi", "Nama venue"],
  );
});

test("event local date-time uses the selected timezone and rejects invalid wall times", () => {
  assert.equal(
    localDateTimeToIso("2026-12-01T09:00", "Asia/Makassar"),
    "2026-12-01T01:00:00.000Z",
  );
  assert.equal(
    localDateTimeToIso("2026-03-08T02:30", "America/New_York"),
    null,
  );
  assert.equal(localDateTimeToIso("2026-12-01T09:00", "invalid-zone"), null);
});

test("ticket date-time converts WITA inputs to an offset ISO timestamp and formats existing values locally", () => {
  assert.equal(
    localDateTimeToOffsetIso("2026-12-01T09:30", "Asia/Makassar"),
    "2026-12-01T09:30:00+08:00",
  );
  assert.deepEqual(
    dateTimeInputValues(
      new Date("2026-12-01T01:30:00.000Z"),
      "Asia/Makassar",
    ),
    { date: "2026-12-01", time: "09:30" },
  );
  assert.equal(
    localDateTimeToOffsetIso("2026-02-31T09:30", "Asia/Makassar"),
    null,
  );
});

test("event name slug is generated in a URL-safe form", () => {
  assert.equal(slugifyEventName("Synergy Preneur Summit 2027"), "synergy-preneur-summit-2027");
  assert.equal(slugifyEventName("  Café & Bisnis  "), "cafe-bisnis");
});

test("ticket validation enforces non-negative prices and positive integer capacity", () => {
  const valid = validateTicketTypeForm(ticketForm());
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.priceAmount, "250000.00");
    assert.equal(valid.data.capacity, 250);
  }
  assert.equal(validateTicketTypeForm(ticketForm({ priceAmount: "-1" })).success, false);
  assert.equal(validateTicketTypeForm(ticketForm({ priceAmount: "1.999" })).success, false);
  assert.equal(validateTicketTypeForm(ticketForm({ capacity: "0" })).success, false);
  assert.equal(validateTicketTypeForm(ticketForm({ capacity: "1.5" })).success, false);
  assert.equal(
    validateTicketTypeForm(ticketForm({ capacity: "2147483648" })).success,
    false,
  );
  const invalidCodeAndPrice = validateTicketTypeForm(
    ticketForm({ code: "SPS 2027", priceAmount: "-50" }),
  );
  assert.equal(invalidCodeAndPrice.success, false);
  if (!invalidCodeAndPrice.success) {
    assert.deepEqual(
      Object.keys(invalidCodeAndPrice.fieldErrors ?? {}).sort(),
      ["code", "priceAmount"],
    );
    assert.match(invalidCodeAndPrice.fieldErrors?.code ?? "", /Ticket Code/);
  }
  const unlimited = validateTicketTypeForm(ticketForm({ capacity: "" }));
  assert.equal(unlimited.success, true);
  if (unlimited.success) assert.equal(unlimited.data.capacity, null);
  const invalidSalesWindow = validateTicketTypeForm(
    ticketForm({
      salesOpensAt: "2026-12-01T10:00:00+08:00",
      salesClosesAt: "2026-12-01T09:00:00+08:00",
    }),
  );
  assert.equal(invalidSalesWindow.success, false);
  if (!invalidSalesWindow.success) {
    assert.match(
      invalidSalesWindow.fieldErrors?.salesClosesAt ?? "",
      /setelah waktu pembukaan/,
    );
  }
  assert.equal(isTicketCapacitySufficient(250, 250), true);
  assert.equal(isTicketCapacitySufficient(249, 250), false);
  assert.equal(isTicketCapacitySufficient(null, 250), true);
});

test("event permissions require both the capability and an event assignment", () => {
  assert.deepEqual(
    authorizeAdmin(
      { id: "staff-1", permissions: [], eventIds: [] },
      EVENT_PERMISSIONS.create,
    ),
    { allowed: false, reason: "permission_denied" },
  );
  assert.deepEqual(
    authorizeAdmin(
      { id: "staff-1", permissions: [], eventIds: ["event-1"] },
      EVENT_PERMISSIONS.publish,
      "event-1",
    ),
    { allowed: false, reason: "permission_denied" },
  );
  const action = authorizeAdmin(
    { id: "staff-1", permissions: [], eventIds: ["event-1"] },
    EVENT_PERMISSIONS.manageTickets,
    "event-1",
  );
  assert.deepEqual(action, { allowed: false, reason: "permission_denied" });

  const assignedAdmin = authorizeAdmin(
    {
      id: "staff-1",
      permissions: [EVENT_PERMISSIONS.manageTickets],
      eventIds: ["event-1"],
    },
    EVENT_PERMISSIONS.manageTickets,
    "event-1",
  );
  assert.deepEqual(assignedAdmin, { allowed: true });

  const unassignedAdmin = authorizeAdmin(
    {
      id: "staff-1",
      permissions: [EVENT_PERMISSIONS.manageTickets],
      eventIds: ["event-1"],
    },
    EVENT_PERMISSIONS.manageTickets,
    "event-2",
  );
  assert.deepEqual(unassignedAdmin, {
    allowed: false,
    reason: "event_scope_denied",
  });
});

test("event status transitions follow the schema lifecycle", () => {
  assert.equal(canTransitionEventStatus("draft", "published"), true);
  assert.equal(canTransitionEventStatus("published", "closed"), true);
  assert.equal(canTransitionEventStatus("closed", "archived"), true);
  assert.equal(canTransitionEventStatus("draft", "archived"), false);
  assert.equal(canTransitionEventStatus("archived", "draft"), false);
  assert.equal(permissionForEventTransition("published"), EVENT_PERMISSIONS.publish);
  assert.equal(permissionForEventTransition("draft"), null);
});
