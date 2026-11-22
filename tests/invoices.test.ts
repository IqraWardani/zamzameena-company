import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import test from "node:test";
import { createInvoicePdf } from "../lib/invoices/pdf";

function pdfText(pdf: Buffer): string {
  const source = pdf.toString("latin1");
  const streams = [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)];
  return streams.map((match) => {
    try {
      const content = inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
      return [...content.matchAll(/<([0-9a-f]+)>/gi)]
        .map((token) => Buffer.from(token[1], "hex").toString("latin1"))
        .join("");
    } catch {
      return "";
    }
  }).join("\n");
}

test("invoice renderer generates a PDF with current order details and payment status", async () => {
  const pdf = await createInvoicePdf({
    invoiceNumber: "ZAS-2027-0001",
    issuedAt: new Date("2026-11-15T12:00:00.000Z"),
    amountDue: "125000.00",
    currency: "IDR",
    status: "pending",
    registrationNumber: "ZAS-2026-UNIQUE001",
    eventName: "Synergy Preneur Summit 2027",
    eventStartsAt: new Date("2027-02-20T01:00:00.000Z"),
    eventEndsAt: new Date("2027-02-20T09:00:00.000Z"),
    eventTimezone: "Asia/Makassar",
    eventLocation: "Makassar Convention Center, Makassar",
    participantName: "Ada Lovelace",
    participantEmail: "ada@example.com",
    participantPhone: "08123456789",
    ticketLines: [{
      description: "General admission",
      quantity: 1,
      unitPrice: "125000.00",
      total: "125000.00",
    }],
    subtotal: "125000.00",
    paymentMethod: "BCA",
  });

  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.toString("latin1").includes("%%EOF"));
  const source = pdf.toString("latin1");
  assert.ok(source.includes("/MediaBox [0 0 595.28 841.89]"), "PDF should use A4 portrait");
  assert.equal((source.match(/\/Type \/Page(?!s)/g) ?? []).length, 1);
  const text = pdfText(pdf);
  for (const expected of [
    "INVOICE",
    "ZAMZAMEENA AINSA SYNERGY",
    "ZAS-2027-0001",
    "Invoice Date",
    "BILLING INFORMATION",
    "Ada Lovelace",
    "ada@example.com",
    "08123456789",
    "EVENT INFORMATION",
    "Synergy Preneur Summit 2027",
    "Makassar Convention Center",
    "General admission",
    "Quantity",
    "125.000",
    "PENDING",
    "BCA",
    "ADDITIONAL NOTES",
    "TERMS AND CONDITIONS",
    "Page 1 of 1",
  ]) {
    assert.ok(text.includes(expected), `PDF text should include ${expected}`);
  }
});

test("invoice status supports paid payments and ticket detail rows", async () => {
  const pdf = await createInvoicePdf({
    invoiceNumber: "ZAS-2027-0002",
    issuedAt: new Date("2026-11-15T12:00:00.000Z"),
    amountDue: "500000.00",
    currency: "IDR",
    status: "paid",
    registrationNumber: "ZAS-2026-UNIQUE002",
    eventName: "Synergy Preneur Summit 2027",
    eventStartsAt: new Date("2027-02-20T01:00:00.000Z"),
    eventEndsAt: new Date("2027-02-20T09:00:00.000Z"),
    eventTimezone: "Asia/Makassar",
    eventLocation: null,
    participantName: "Grace Hopper",
    participantEmail: "grace@example.com",
    participantPhone: "08234567890",
    ticketLines: [
      { description: "Regular Ticket", quantity: 1, unitPrice: "250000.00", total: "250000.00" },
      { description: "VIP Ticket", quantity: 1, unitPrice: "250000.00", total: "250000.00" },
    ],
    subtotal: "500000.00",
    paymentMethod: null,
  });
  const text = pdfText(pdf);

  assert.ok(text.includes("PAID"));
  assert.ok(text.includes("Regular Ticket"));
  assert.ok(text.includes("VIP Ticket"));
  assert.ok(text.includes("TERMS AND CONDITIONS"));
});

test("legacy invoice PDFs never infer a missing unit-price snapshot", async () => {
  const pdf = await createInvoicePdf({
    invoiceNumber: "ZAS-2027-LEGACY01",
    issuedAt: new Date("2026-11-15T12:00:00.000Z"),
    amountDue: "125000.00",
    currency: "IDR",
    status: "paid",
    registrationNumber: "ZAS-2026-LEGACY001",
    eventName: "Synergy Preneur Summit 2027",
    eventStartsAt: new Date("2027-02-20T01:00:00.000Z"),
    eventEndsAt: new Date("2027-02-20T09:00:00.000Z"),
    eventTimezone: "Asia/Makassar",
    eventLocation: null,
    participantName: "Legacy Participant",
    participantEmail: "legacy@example.com",
    participantPhone: "08123456789",
    ticketLines: [{
      description: "Legacy ticket",
      quantity: 1,
      unitPrice: null,
      total: "125000.00",
    }],
    subtotal: "125000.00",
  });
  const text = pdfText(pdf);

  assert.ok(text.includes("Legacy ticket"));
  assert.ok(text.includes("125.000"));
  assert.ok(text.includes("-"));
});

test("long ticket tables paginate and repeat the table header", async () => {
  const pdf = await createInvoicePdf({
    invoiceNumber: "ZAS-2027-0003",
    issuedAt: new Date("2026-11-15T12:00:00.000Z"),
    amountDue: "4000000.00",
    currency: "IDR",
    status: "pending",
    registrationNumber: "ZAS-2026-UNIQUE003",
    eventName: "Synergy Preneur Summit 2027",
    eventStartsAt: new Date("2027-02-20T01:00:00.000Z"),
    eventEndsAt: new Date("2027-02-20T09:00:00.000Z"),
    eventTimezone: "Asia/Makassar",
    eventLocation: null,
    participantName: "Test Participant",
    participantEmail: "participant@example.com",
    participantPhone: "08123456789",
    ticketLines: Array.from({ length: 40 }, (_, index) => ({
      description: `Ticket ${index + 1}`,
      quantity: 1,
      unitPrice: "100000.00",
      total: "100000.00",
    })),
    subtotal: "4000000.00",
  });
  const source = pdf.toString("latin1");
  const pageCount = (source.match(/\/Type \/Page(?!s)/g) ?? []).length;
  const text = pdfText(pdf);

  assert.ok(pageCount > 1, "long invoice should continue on additional pages");
  assert.ok(text.includes("Page 1 of "));
  assert.ok(
    (text.match(/Description/g) ?? []).length > 1,
    "table header should repeat on continuation pages",
  );
});
