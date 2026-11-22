import assert from "node:assert/strict";
import test from "node:test";
import {
  submitContactMessage,
  validateContactSubmission,
  type ContactInboxRepository,
  type ContactSubmissionInput,
} from "../lib/contact/contact-submission";
import { canAccessPaymentProof } from "../lib/payments/document-access";
import { authorizeAdmin } from "../lib/admin/access-policy";

class MemoryContactInbox implements ContactInboxRepository {
  submissions: ContactSubmissionInput[] = [];
  notifications: Array<{ channel: string; recipient: string; payload: Record<string, string> }> = [];
  participants: unknown[] = [];

  async createSubmissionAndQueueNotice(input: ContactSubmissionInput) {
    const id = "contact-submission-1";
    this.submissions.push(input);
    this.notifications.push({
      channel: "internal",
      recipient: "admin_inbox",
      payload: { contactSubmissionId: id },
    });
    return { id };
  }
}

function validContactPayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "  Ada  ",
    lastName: "Lovelace",
    email: " ADA@example.com ",
    phone: "+62 812-3456-7890",
    subject: "Partnership inquiry",
    message: "I would like to discuss a business partnership.",
    agreedToTerms: true,
    website: "",
    sourcePath: "/contact",
    ...overrides,
  };
}

test("public contact submission is stored separately without creating a participant", async () => {
  const inbox = new MemoryContactInbox();
  const result = await submitContactMessage(inbox, validContactPayload());

  assert.equal(result, "accepted");
  assert.equal(inbox.submissions.length, 1);
  assert.deepEqual(inbox.submissions[0], {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+62 812-3456-7890",
    subject: "Partnership inquiry",
    message: "I would like to discuss a business partnership.",
    sourcePath: "/contact",
  });
  assert.deepEqual(inbox.participants, []);
});

test("contact notification queue carries an internal reference, not contact content", async () => {
  const inbox = new MemoryContactInbox();
  await submitContactMessage(inbox, validContactPayload());

  assert.deepEqual(inbox.notifications, [{
    channel: "internal",
    recipient: "admin_inbox",
    payload: { contactSubmissionId: "contact-submission-1" },
  }]);
  assert.equal(JSON.stringify(inbox.notifications).includes("ada@example.com"), false);
  assert.equal(JSON.stringify(inbox.notifications).includes("business partnership"), false);
});

test("contact schema validates required consent and sanitizes bounded text", () => {
  const valid = validateContactSubmission(
    validContactPayload({
      firstName: "Ada\u0000 ",
      message: "First line\r\nSecond line.",
      sourcePath: "javascript:alert(1)",
    }),
  );
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.name, "Ada Lovelace");
    assert.equal(valid.data.message, "First line\nSecond line.");
    assert.equal(valid.data.sourcePath, "/contact");
  }
  assert.deepEqual(
    validateContactSubmission(validContactPayload({ agreedToTerms: false })),
    { success: false, reason: "invalid" },
  );
  assert.deepEqual(
    validateContactSubmission(validContactPayload({ website: "spam" })),
    { success: false, reason: "spam" },
  );
});

test("contact validation rejects oversized fields and invalid email", () => {
  assert.deepEqual(
    validateContactSubmission(validContactPayload({ email: "not-an-email" })),
    { success: false, reason: "invalid" },
  );
  assert.deepEqual(
    validateContactSubmission(validContactPayload({ message: "x".repeat(2001) })),
    { success: false, reason: "invalid" },
  );
});

test("contact management requires its explicit admin permission", () => {
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin-1", permissions: [], eventIds: [] },
      "contacts.manage",
    ),
    { allowed: false, reason: "permission_denied" },
  );
  assert.deepEqual(
    authorizeAdmin(
      { id: "admin-1", permissions: ["contacts.manage"], eventIds: [] },
      "contacts.manage",
    ),
    { allowed: true },
  );
});

test("private payment document access requires owner or assigned reviewer and excludes deleted docs", () => {
  const base = {
    documentExists: true,
    documentOwnerType: "payment",
    documentKind: "payment_proof",
    documentIsDeleted: false,
    allowedRegistrationIds: ["registration-a"],
    documentRegistrationId: "registration-b",
    adminAuthorized: false,
  };
  assert.equal(canAccessPaymentProof(base), false);
  assert.equal(canAccessPaymentProof({ ...base, adminAuthorized: true }), true);
  assert.equal(
    canAccessPaymentProof({
      ...base,
      allowedRegistrationIds: ["registration-b"],
    }),
    true,
  );
  assert.equal(
    canAccessPaymentProof({ ...base, adminAuthorized: true, documentIsDeleted: true }),
    false,
  );
  assert.equal(
    canAccessPaymentProof({ ...base, documentOwnerType: "participant", adminAuthorized: true }),
    false,
  );
});
