import assert from "node:assert/strict";
import test from "node:test";
import {
  checkInByRegistrationSearch,
  checkInByTicketCode,
  type CheckInRepository,
  type CheckInTicket,
  type CheckInTransaction,
} from "../lib/check-in/check-in-service";

const EVENT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_EVENT_ID = "00000000-0000-4000-8000-000000000002";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000003";
const ADMIN_ID = "00000000-0000-4000-8000-000000000004";
const CHECKED_AT = new Date("2026-11-15T07:30:00.000Z");
const TICKET_CODE = "ZAS-TKT-0123456789ABCDEF0123456789ABCDEF";

class MemoryCheckInRepository implements CheckInRepository {
  authorized = true;
  ticket: CheckInTicket | null = {
    id: "ticket-1",
    ticketCode: TICKET_CODE,
    status: "active",
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID,
    registrationStatus: "confirmed",
    checkedInAt: null,
  };
  persistedCheckIns: Array<{ eventId: string; registrationId: string; ticketId: string; adminUserId: string }> = [];
  auditEntries: Array<{ eventId: string; registrationId: string; ticketId: string; adminUserId: string; merchandiseReceived: boolean }> = [];

  transaction<T>(work: (transaction: CheckInTransaction) => Promise<T>): Promise<T> {
    const transaction: CheckInTransaction = {
      isStaffAuthorized: async (_adminUserId, eventId) =>
        this.authorized && eventId === EVENT_ID,
      findTicketByCode: async (ticketCode) =>
        ticketCode === this.ticket?.ticketCode ? this.ticket : null,
      lockRegistration: async () => {},
      findTicketForRegistration: async (eventId, registrationId) =>
        this.ticket?.eventId === eventId &&
        this.ticket.registrationId === registrationId
          ? this.ticket
          : null,
      createCheckIn: async (input) => {
        this.persistedCheckIns.push({
          eventId: input.eventId,
          registrationId: input.registrationId,
          ticketId: input.ticketId,
          adminUserId: input.checkedInByAdminUserId,
        });
        this.ticket = { ...this.ticket!, checkedInAt: CHECKED_AT };
        return { id: "check-in-1", checkedInAt: CHECKED_AT };
      },
      createAuditLog: async (input) => {
        this.auditEntries.push({
          eventId: input.eventId,
          registrationId: input.registrationId,
          ticketId: input.ticketId,
          adminUserId: input.actorAdminUserId,
          merchandiseReceived: input.merchandiseReceived,
        });
      },
    };
    return work(transaction);
  }
}

test("valid active ticket for a confirmed registration is checked in and audited", async () => {
  const repository = new MemoryCheckInRepository();
  const result = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE.toLowerCase(),
    merchandiseReceived: true,
  });

  assert.deepEqual(result, { status: "checked_in", checkedInAt: CHECKED_AT });
  assert.deepEqual(repository.persistedCheckIns, [{
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID,
    ticketId: "ticket-1",
    adminUserId: ADMIN_ID,
  }]);
  assert.equal(repository.auditEntries.length, 1);
  assert.equal(repository.auditEntries[0].merchandiseReceived, true);
});

test("ticket-code check-in requires merchandise confirmation", async () => {
  const repository = new MemoryCheckInRepository();
  const result = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: false,
  });

  assert.deepEqual(result, { status: "merchandise_required" });
  assert.equal(repository.persistedCheckIns.length, 0);
  assert.equal(repository.auditEntries.length, 0);
});

test("manual participant search checks in an eligible registration", async () => {
  const repository = new MemoryCheckInRepository();
  const result = await checkInByRegistrationSearch(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    registrationId: REGISTRATION_ID,
    merchandiseReceived: true,
  });

  assert.deepEqual(result, { status: "checked_in", checkedInAt: CHECKED_AT });
  assert.equal(repository.persistedCheckIns.length, 1);
  assert.equal(repository.auditEntries[0].merchandiseReceived, true);
});

test("manual participant check-in requires merchandise confirmation", async () => {
  const repository = new MemoryCheckInRepository();
  const result = await checkInByRegistrationSearch(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    registrationId: REGISTRATION_ID,
    merchandiseReceived: false,
  });

  assert.deepEqual(result, { status: "merchandise_required" });
  assert.equal(repository.persistedCheckIns.length, 0);
  assert.equal(repository.auditEntries.length, 0);
});

test("duplicate manual check-in does not create another record or audit entry", async () => {
  const repository = new MemoryCheckInRepository();
  const input = {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    registrationId: REGISTRATION_ID,
    merchandiseReceived: true,
  };
  await checkInByRegistrationSearch(repository, input);
  const repeated = await checkInByRegistrationSearch(repository, input);

  assert.deepEqual(repeated, {
    status: "already_checked_in",
    checkedInAt: CHECKED_AT,
  });
  assert.equal(repository.persistedCheckIns.length, 1);
  assert.equal(repository.auditEntries.length, 1);
});

test("malformed or unknown ticket code is rejected", async () => {
  const repository = new MemoryCheckInRepository();
  const malformed = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: "not-a-ticket",
    merchandiseReceived: true,
  });
  const unknown = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: "ZAS-TKT-FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    merchandiseReceived: true,
  });

  assert.deepEqual(malformed, { status: "invalid_ticket" });
  assert.deepEqual(unknown, { status: "invalid_ticket" });
  assert.equal(repository.persistedCheckIns.length, 0);
});

test("duplicate check-in is rejected without creating another record", async () => {
  const repository = new MemoryCheckInRepository();
  await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: true,
  });
  const repeated = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: true,
  });

  assert.deepEqual(repeated, {
    status: "already_checked_in",
    checkedInAt: CHECKED_AT,
  });
  assert.equal(repository.persistedCheckIns.length, 1);
  assert.equal(repository.auditEntries.length, 1);
});

test("ticket belonging to another event is reported as wrong event", async () => {
  const repository = new MemoryCheckInRepository();
  repository.ticket = { ...repository.ticket!, eventId: OTHER_EVENT_ID };
  const result = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: true,
  });

  assert.deepEqual(result, { status: "wrong_event" });
  assert.equal(repository.persistedCheckIns.length, 0);
});

test("void ticket is rejected", async () => {
  const repository = new MemoryCheckInRepository();
  repository.ticket = { ...repository.ticket!, status: "void" };
  const result = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: true,
  });

  assert.deepEqual(result, { status: "ticket_inactive" });
  assert.equal(repository.persistedCheckIns.length, 0);
});

test("unconfirmed registration is rejected", async () => {
  const repository = new MemoryCheckInRepository();
  repository.ticket = { ...repository.ticket!, registrationStatus: "payment_submitted" };
  const result = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: true,
  });

  assert.deepEqual(result, { status: "registration_unconfirmed" });
  assert.equal(repository.persistedCheckIns.length, 0);
});

test("operator without event assignment and permission is denied", async () => {
  const repository = new MemoryCheckInRepository();
  repository.authorized = false;
  const result = await checkInByTicketCode(repository, {
    eventId: EVENT_ID,
    adminUserId: ADMIN_ID,
    ticketCode: TICKET_CODE,
    merchandiseReceived: true,
  });

  assert.deepEqual(result, { status: "access_denied" });
  assert.equal(repository.persistedCheckIns.length, 0);
});

test("manual search only validates registrations in the selected event", async () => {
  const repository = new MemoryCheckInRepository();
  const result = await checkInByRegistrationSearch(repository, {
    eventId: OTHER_EVENT_ID,
    adminUserId: ADMIN_ID,
    registrationId: REGISTRATION_ID,
    merchandiseReceived: false,
  });

  assert.deepEqual(result, { status: "access_denied" });
  assert.equal(repository.persistedCheckIns.length, 0);
});
