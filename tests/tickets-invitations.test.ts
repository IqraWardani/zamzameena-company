import assert from "node:assert/strict";
import test from "node:test";
import {
  collectInvitationByCode,
  collectInvitationByParticipantSearch,
  isInvitationCodeUsable,
  type InvitationCollectionRepository,
  type InvitationCollectionTransaction,
} from "../lib/invitations/collection-service";
import {
  issueConfirmedTicket,
  TicketIssuanceError,
  type TicketIssueTransaction,
} from "../lib/tickets/ticket-issuance";

const EVENT_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_EVENT_ID = "00000000-0000-4000-8000-000000000002";
const REGISTRATION_ID = "00000000-0000-4000-8000-000000000003";
const ADMIN_ID = "00000000-0000-4000-8000-000000000004";
const NOW = new Date("2026-11-15T07:00:00.000Z");
const CODE = "ZAS-ABCD12345678";

class MemoryTicketIssue implements TicketIssueTransaction {
  status = "confirmed";
  ticketId: string | null = null;
  ticketCode: string | null = null;
  auditEntries: Array<{ reason: string; eventId: string }> = [];
  nextId = 0;

  async lockRegistration() {}

  async findTicketContext() {
    return { eventId: EVENT_ID, status: this.status, ticketId: this.ticketId };
  }

  async createActiveTicket(input: { ticketCode: string }) {
    this.ticketId = `ticket-${++this.nextId}`;
    this.ticketCode = input.ticketCode;
    return { id: this.ticketId };
  }

  async auditTicketIssued(input: { reason: string; eventId: string }) {
    this.auditEntries.push(input);
  }
}

class MemoryInvitationRepository implements InvitationCollectionRepository {
  authorized = true;
  registration = {
    id: REGISTRATION_ID,
    eventId: EVENT_ID,
    status: "confirmed",
    ticketId: "ticket-1",
    ticketStatus: "active",
    alreadyCollected: false,
  };
  code = {
    id: "invitation-code-1",
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID as string | null,
    ticketRegistrationId: REGISTRATION_ID as string | null,
    expiresAt: null as Date | null,
    isActive: true,
  };
  collections: Array<{ method: string; registrationId: string }> = [];
  auditEntries: Array<{ method: string; registrationId: string }> = [];
  checkIns: string[] = [];

  transaction<T>(
    work: (transaction: InvitationCollectionTransaction) => Promise<T>,
  ): Promise<T> {
    const transaction: InvitationCollectionTransaction = {
      isStaffAuthorized: async (_adminUserId, eventId) =>
        this.authorized && eventId === EVENT_ID,
      lockInvitationCode: async () => {},
      findInvitationCode: async (_eventId, code) =>
        code === CODE ? this.code : null,
      lockRegistration: async () => {},
      findRegistration: async (registrationId) =>
        registrationId === this.registration.id ? this.registration : null,
      createCollection: async (input) => {
        this.registration.alreadyCollected = true;
        this.collections.push(input);
        return { id: "collection-1", collectedAt: NOW };
      },
      deactivateInvitationCodesForRegistration: async () => {
        this.code.isActive = false;
      },
      auditCollection: async (input) => {
        this.auditEntries.push(input);
      },
    };
    return work(transaction);
  }
}

test("tickets cannot be issued before registration confirmation", async () => {
  const transaction = new MemoryTicketIssue();
  transaction.status = "pending_payment";
  await assert.rejects(
    issueConfirmedTicket(transaction, {
      registrationId: REGISTRATION_ID,
      actorAdminUserId: ADMIN_ID,
      reason: "payment_approved",
    }),
    (error: unknown) =>
      error instanceof TicketIssuanceError &&
      error.reason === "registration_not_confirmed",
  );
  assert.equal(transaction.ticketId, null);
});

test("a confirmed registration receives one unique ticket and cannot be issued twice", async () => {
  const transaction = new MemoryTicketIssue();
  const input = {
    registrationId: REGISTRATION_ID,
    actorAdminUserId: ADMIN_ID,
    reason: "payment_approved" as const,
  };
  const ticket = await issueConfirmedTicket(transaction, input);
  assert.equal(ticket.id, "ticket-1");
  assert.match(transaction.ticketCode ?? "", /^ZAS-TKT-[A-F0-9]{32}$/);
  assert.equal(transaction.auditEntries.length, 1);
  await assert.rejects(
    issueConfirmedTicket(transaction, input),
    (error: unknown) =>
      error instanceof TicketIssuanceError &&
      error.reason === "ticket_already_exists",
  );
  assert.equal(transaction.auditEntries.length, 1);
});

test("inactive, expired, wrong-event, and mismatched-target codes are unusable", () => {
  const base = {
    id: "code-1",
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID,
    ticketRegistrationId: REGISTRATION_ID,
    expiresAt: null,
    isActive: true,
  };
  assert.equal(isInvitationCodeUsable(base, EVENT_ID, NOW), true);
  assert.equal(isInvitationCodeUsable({ ...base, isActive: false }, EVENT_ID, NOW), false);
  assert.equal(
    isInvitationCodeUsable({ ...base, expiresAt: new Date(NOW.getTime() - 1) }, EVENT_ID, NOW),
    false,
  );
  assert.equal(isInvitationCodeUsable(base, OTHER_EVENT_ID, NOW), false);
  assert.equal(
    isInvitationCodeUsable({ ...base, ticketRegistrationId: OTHER_EVENT_ID }, EVENT_ID, NOW),
    false,
  );
});

test("invalid, expired, and inactive invitation codes are rejected", async () => {
  const repository = new MemoryInvitationRepository();
  repository.code.expiresAt = new Date(NOW.getTime() - 1);
  const expired = await collectInvitationByCode(repository, {
    eventId: EVENT_ID,
    actorAdminUserId: ADMIN_ID,
    code: CODE,
    now: NOW,
  });
  assert.deepEqual(expired, { success: false, reason: "code_invalid" });

  repository.code.expiresAt = null;
  repository.code.isActive = false;
  const inactive = await collectInvitationByCode(repository, {
    eventId: EVENT_ID,
    actorAdminUserId: ADMIN_ID,
    code: CODE,
    now: NOW,
  });
  assert.deepEqual(inactive, { success: false, reason: "code_invalid" });

  const invalid = await collectInvitationByCode(repository, {
    eventId: EVENT_ID,
    actorAdminUserId: ADMIN_ID,
    code: "bad",
    now: NOW,
  });
  assert.deepEqual(invalid, { success: false, reason: "code_invalid" });
});

test("a valid invitation code is consumed once and its collection is audited", async () => {
  const repository = new MemoryInvitationRepository();
  const first = await collectInvitationByCode(repository, {
    eventId: EVENT_ID,
    actorAdminUserId: ADMIN_ID,
    code: CODE.toLowerCase(),
    now: NOW,
  });
  const repeated = await collectInvitationByCode(repository, {
    eventId: EVENT_ID,
    actorAdminUserId: ADMIN_ID,
    code: CODE,
    now: NOW,
  });

  assert.equal(first.success, true);
  assert.deepEqual(repeated, { success: false, reason: "code_invalid" });
  assert.equal(repository.collections.length, 1);
  assert.equal(repository.auditEntries[0]?.method, "invitation_code");
  assert.equal(repository.checkIns.length, 0);
});

test("repeated invitation collection is rejected and does not create check-ins", async () => {
  const repository = new MemoryInvitationRepository();
  const first = await collectInvitationByParticipantSearch(repository, {
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID,
    actorAdminUserId: ADMIN_ID,
  });
  const duplicate = await collectInvitationByParticipantSearch(repository, {
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID,
    actorAdminUserId: ADMIN_ID,
  });

  assert.equal(first.success, true);
  assert.deepEqual(duplicate, { success: false, reason: "already_collected" });
  assert.equal(repository.collections.length, 1);
  assert.equal(repository.auditEntries.length, 1);
  assert.equal(repository.code.isActive, false);
  assert.deepEqual(repository.checkIns, []);
});

test("staff cannot collect invitations for an event outside their assignment", async () => {
  const repository = new MemoryInvitationRepository();
  repository.authorized = false;
  const result = await collectInvitationByCode(repository, {
    eventId: OTHER_EVENT_ID,
    actorAdminUserId: ADMIN_ID,
    code: CODE,
    now: NOW,
  });

  assert.deepEqual(result, { success: false, reason: "forbidden" });
  assert.equal(repository.collections.length, 0);
});

test("participant search cannot collect a registration from a different event", async () => {
  const repository = new MemoryInvitationRepository();
  repository.registration.eventId = OTHER_EVENT_ID;
  const result = await collectInvitationByParticipantSearch(repository, {
    eventId: EVENT_ID,
    registrationId: REGISTRATION_ID,
    actorAdminUserId: ADMIN_ID,
  });

  assert.deepEqual(result, {
    success: false,
    reason: "registration_unavailable",
  });
  assert.equal(repository.collections.length, 0);
});
