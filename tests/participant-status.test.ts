import assert from "node:assert/strict";
import test from "node:test";
import { getParticipantPaymentStatus } from "../lib/payments/participant-status";

test("participant payment overview separates paid, unpaid, free, and inactive registrations", () => {
  const base = {
    registrationStatus: "pending_payment",
    invoiceStatus: "pending",
    hasApprovedPayment: false,
    ticketPrice: "250000.00",
  };

  assert.equal(getParticipantPaymentStatus(base), "unpaid");
  assert.equal(
    getParticipantPaymentStatus({ ...base, hasApprovedPayment: true }),
    "paid",
  );
  assert.equal(
    getParticipantPaymentStatus({ ...base, invoiceStatus: "paid" }),
    "paid",
  );
  assert.equal(
    getParticipantPaymentStatus({ ...base, ticketPrice: "0" }),
    "free",
  );
  assert.equal(
    getParticipantPaymentStatus({ ...base, registrationStatus: "cancelled" }),
    "inactive",
  );
  assert.equal(
    getParticipantPaymentStatus({ ...base, invoiceStatus: "void" }),
    "inactive",
  );
});
