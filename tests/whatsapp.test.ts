import assert from "node:assert/strict";
import test from "node:test";
import {
  createWhatsAppMessage,
  createWhatsAppUrl,
  normalizeWhatsAppNumber,
} from "../lib/payments/whatsapp-messages";

test("Indonesian WhatsApp numbers are normalized to country code 62", () => {
  assert.equal(normalizeWhatsAppNumber("0812 3456-7890"), "6281234567890");
  assert.equal(normalizeWhatsAppNumber("+62 (812) 3456-7890"), "6281234567890");
  assert.equal(normalizeWhatsAppNumber("81234567890"), "6281234567890");
  assert.equal(normalizeWhatsAppNumber("0044 20 1234 5678"), "442012345678");
  assert.equal(normalizeWhatsAppNumber("12"), null);
});

test("pending WhatsApp template contains current registration data", () => {
  const message = createWhatsAppMessage({
    participantName: "Dewi Peserta",
    invoiceNumber: "ZAS-2027-0001",
    ticketName: "Regular",
    eventName: "Synergy Preneur Summit 2027",
    paymentStatus: "pending",
  });

  assert.match(message, /Dewi Peserta/);
  assert.match(message, /ZAS-2027-0001/);
  assert.match(message, /Regular/);
  assert.match(message, /masih menunggu pembayaran/);
  assert.doesNotMatch(message, /sudah berhasil diverifikasi/);
});

test("pending WhatsApp template distinguishes a submitted proof awaiting review", () => {
  const message = createWhatsAppMessage({
    participantName: "Dewi Peserta",
    invoiceNumber: "ZAS-2027-0001",
    ticketName: "Regular",
    eventName: "Synergy Preneur Summit 2027",
    paymentStatus: "pending",
    paymentVerificationPending: true,
  });
  assert.match(message, /bukti pembayaran/i);
  assert.match(message, /menunggu verifikasi admin/i);
  assert.doesNotMatch(message, /masih menunggu pembayaran/i);
});

test("paid WhatsApp template confirms the verified payment", () => {
  const message = createWhatsAppMessage({
    participantName: "Dewi Peserta",
    invoiceNumber: "ZAS-2027-0002",
    ticketName: "VIP",
    eventName: "Synergy Preneur Summit 2027",
    paymentStatus: "paid",
  });
  assert.match(message, /ZAS-2027-0002/);
  assert.match(message, /PAID \/ TERKONFIRMASI/);
  assert.match(message, /telah berhasil diverifikasi/);
});

test("WhatsApp URL encodes the complete editable message", () => {
  const url = createWhatsAppUrl(
    "081234567890",
    "Halo peserta & panitia\nZAS-2027-0001",
  );
  assert.ok(url);
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "wa.me");
  assert.equal(parsed.pathname, "/6281234567890");
  assert.equal(parsed.searchParams.get("text"), "Halo peserta & panitia\nZAS-2027-0001");
  assert.equal(createWhatsAppUrl("invalid", "Pesan"), null);
});
