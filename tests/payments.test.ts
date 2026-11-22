import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPaymentProof } from "../lib/payments/document-access";
import {
  getPaymentClaimDisposition,
  isPaymentAmountEqual,
  isValidPositivePaymentAmount,
  isValidPaymentReviewTransition,
  reviewTargetStatus,
  validatePaymentProof,
} from "../lib/payments/proof-validation";

function documentAccess(overrides: Partial<Parameters<typeof canAccessPaymentProof>[0]> = {}) {
  return {
    documentExists: true,
    documentOwnerType: "payment",
    documentKind: "payment_proof",
    documentIsDeleted: false,
    allowedRegistrationIds: [],
    documentRegistrationId: null,
    adminAuthorized: false,
    ...overrides,
  };
}

test("payment proof upload rejects empty, oversized, spoofed, and unsupported files", () => {
  const empty = new File([], "empty.pdf", { type: "application/pdf" });
  assert.equal(validatePaymentProof(empty, new Uint8Array()).success, false);

  const oversized = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", {
    type: "application/pdf",
  });
  assert.equal(
    validatePaymentProof(oversized, new Uint8Array(oversized.size)).success,
    false,
  );

  const spoofed = new File(["not a pdf"], "proof.pdf", { type: "application/pdf" });
  assert.equal(
    validatePaymentProof(spoofed, new Uint8Array(Buffer.from("not a pdf"))).success,
    false,
  );

  const unsupported = new File(["<html>"], "proof.html", { type: "text/html" });
  assert.equal(
    validatePaymentProof(unsupported, new Uint8Array(Buffer.from("<html>"))).success,
    false,
  );
});

test("valid JPEG, PNG, and PDF signatures are accepted", () => {
  const fixtures = [
    {
      file: new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "proof.jpg", {
        type: "image/jpeg",
      }),
      bytes: new Uint8Array([0xff, 0xd8, 0xff, 0x00]),
    },
    {
      file: new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "proof.png",
        { type: "image/png" },
      ),
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    },
    {
      file: new File(["%PDF-1.7\n"], "proof.pdf", { type: "application/pdf" }),
      bytes: new Uint8Array(Buffer.from("%PDF-1.7\n")),
    },
  ];

  for (const { file, bytes } of fixtures) {
    assert.equal(validatePaymentProof(file, bytes).success, true);
  }
});

test("payment documents require participant ownership or assigned admin authorization", () => {
  assert.equal(canAccessPaymentProof(documentAccess()), false);
  assert.equal(
    canAccessPaymentProof(documentAccess({
      allowedRegistrationIds: ["registration-a"],
      documentRegistrationId: "registration-b",
    })),
    false,
  );
  assert.equal(
    canAccessPaymentProof(documentAccess({
      allowedRegistrationIds: ["registration-a"],
      documentRegistrationId: "registration-a",
    })),
    true,
  );
  assert.equal(
    canAccessPaymentProof(documentAccess({ adminAuthorized: true })),
    true,
  );
  assert.equal(
    canAccessPaymentProof(documentAccess({
      adminAuthorized: true,
      documentIsDeleted: true,
    })),
    false,
  );
});

test("approval atomically targets paid, confirmed, and ticket-eligible statuses", () => {
  assert.equal(
    isValidPaymentReviewTransition({
      paymentStatus: "submitted",
      invoiceStatus: "payment_submitted",
      registrationStatus: "payment_submitted",
    }),
    true,
  );
  assert.deepEqual(reviewTargetStatus("approve"), {
    paymentStatus: "approved",
    invoiceStatus: "paid",
    registrationStatus: "confirmed",
  });
  assert.deepEqual(reviewTargetStatus("reject"), {
    paymentStatus: "rejected",
    invoiceStatus: "rejected",
    registrationStatus: "payment_rejected",
  });
});

test("illegal or repeated payment transitions cannot be reviewed again", () => {
  assert.equal(
    isValidPaymentReviewTransition({
      paymentStatus: "approved",
      invoiceStatus: "paid",
      registrationStatus: "confirmed",
    }),
    false,
  );
  assert.equal(
    isValidPaymentReviewTransition({
      paymentStatus: "submitted",
      invoiceStatus: "pending",
      registrationStatus: "pending_payment",
    }),
    false,
  );
  assert.equal(
    isValidPaymentReviewTransition({
      paymentStatus: "submitted",
      invoiceStatus: "payment_submitted",
      registrationStatus: "payment_rejected",
    }),
    false,
  );
});

test("duplicate payment submissions are idempotent and rejected claims may be retried", () => {
  assert.equal(isPaymentAmountEqual("100.00", "100"), true);
  assert.equal(isPaymentAmountEqual("100.01", "100"), false);
  assert.equal(isPaymentAmountEqual("1000000000000.00", "1000000000000.00"), false);
  assert.equal(isValidPositivePaymentAmount("100000"), true);
  assert.equal(isValidPositivePaymentAmount("100.50"), true);
  assert.equal(isValidPositivePaymentAmount("0"), false);
  assert.equal(isValidPositivePaymentAmount("10.999"), false);
  assert.equal(isValidPositivePaymentAmount("-1"), false);

  assert.equal(
    getPaymentClaimDisposition({
      registrationStatus: "pending_payment",
      invoiceStatus: "pending",
      paymentStatus: null,
    }),
    "accept",
  );
  assert.equal(
    getPaymentClaimDisposition({
      registrationStatus: "payment_submitted",
      invoiceStatus: "payment_submitted",
      paymentStatus: "submitted",
    }),
    "already_submitted",
  );
  assert.equal(
    getPaymentClaimDisposition({
      registrationStatus: "confirmed",
      invoiceStatus: "paid",
      paymentStatus: "approved",
    }),
    "already_submitted",
  );
  assert.equal(
    getPaymentClaimDisposition({
      registrationStatus: "payment_rejected",
      invoiceStatus: "rejected",
      paymentStatus: "rejected",
    }),
    "accept",
  );
  assert.equal(
    getPaymentClaimDisposition({
      registrationStatus: "cancelled",
      invoiceStatus: "void",
      paymentStatus: null,
    }),
    "invalid_state",
  );
});
