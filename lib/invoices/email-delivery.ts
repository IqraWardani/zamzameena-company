import "server-only";

import { createInvoicePdf } from "@/lib/invoices/pdf";
import { prisma } from "@/lib/db";

export type InvoiceEmailDeliveryResult =
  | "sent"
  | "not_configured"
  | "already_processed"
  | "failed";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function invoiceIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const invoiceId = Reflect.get(payload, "invoiceId");
  return typeof invoiceId === "string" ? invoiceId : null;
}

export async function deliverInvoiceEmail(
  notificationId: string,
): Promise<InvoiceEmailDeliveryResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return "not_configured";

  const notification = await prisma.notificationDelivery.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      registrationId: true,
      recipient: true,
      templateKey: true,
      payload: true,
      status: true,
    },
  });
  if (
    !notification ||
    notification.templateKey !== "invoice_issued_v1" ||
    !notification.registrationId
  ) {
    return "failed";
  }
  const invoiceId = invoiceIdFromPayload(notification.payload);
  if (!invoiceId) return "failed";

  const claimed = await prisma.notificationDelivery.updateMany({
    where: {
      id: notification.id,
      status: "queued",
    },
    data: {
      status: "failed",
      attempts: { increment: 1 },
      lastAttemptAt: new Date(),
      failureReason: "Delivery attempt in progress.",
    },
  });
  if (claimed.count !== 1) return "already_processed";

  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        registrationId: notification.registrationId,
      },
      select: {
        invoiceNumber: true,
        amountDue: true,
        unitPriceAmount: true,
        quantity: true,
        subtotalAmount: true,
        discountAmount: true,
        currency: true,
        issuedAt: true,
        status: true,
        registration: {
          select: {
            registrationNumber: true,
            event: {
              select: {
                name: true,
                startsAt: true,
                endsAt: true,
                timezone: true,
                venueName: true,
                venueAddress: true,
              },
            },
            participantProfile: { select: { fullName: true, email: true, phone: true } },
            ticketType: { select: { name: true } },
          },
        },
        payments: {
          orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { status: true, senderBank: true },
        },
      },
    });
    if (!invoice) throw new Error("Invoice notification target is unavailable.");

    const invoiceNumber = invoice.invoiceNumber;
    const eventName = invoice.registration.event.name;
    const participantName = invoice.registration.participantProfile.fullName;
    const ticketName = invoice.registration.ticketType.name;
    const amount = `${invoice.amountDue.toFixed(2)} ${invoice.currency.trim()}`;
    const snapshotSubtotal = invoice.subtotalAmount ?? invoice.amountDue;
    const quantity = invoice.quantity ?? 1;
    const discountAmount = invoice.discountAmount?.toFixed(2) ?? "0.00";
    const unitPrice = invoice.unitPriceAmount?.toFixed(2) ?? null;
    const safeEventName = eventName.replace(/[\r\n\t]+/g, " ").trim();
    const pdf = await createInvoicePdf({
      invoiceNumber,
      issuedAt: invoice.issuedAt,
      amountDue: invoice.amountDue.toFixed(2),
      currency: invoice.currency,
      status: invoice.status === "paid" || invoice.payments[0]?.status === "approved"
        ? "paid"
        : "pending",
      registrationNumber: invoice.registration.registrationNumber,
      eventName,
      eventStartsAt: invoice.registration.event.startsAt,
      eventEndsAt: invoice.registration.event.endsAt,
      eventTimezone: invoice.registration.event.timezone,
      eventLocation: [
        invoice.registration.event.venueName,
        invoice.registration.event.venueAddress,
      ].filter(Boolean).join(", ") || null,
      participantName,
      participantEmail: invoice.registration.participantProfile.email,
      participantPhone: invoice.registration.participantProfile.phone,
      ticketLines: [{
        description: ticketName,
        quantity,
        unitPrice,
        total: invoice.amountDue.toFixed(2),
      }],
      subtotal: snapshotSubtotal.toFixed(2),
      discountAmount,
      paymentMethod: invoice.payments[0]?.senderBank
        ? `Bank Transfer (${invoice.payments[0].senderBank})`
        : null,
    });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": notification.id,
      },
      body: JSON.stringify({
        from,
        to: [notification.recipient],
        subject: `Invoice ${invoiceNumber} — ${safeEventName}`,
        text: [
          `Hello ${participantName},`,
          "",
          `Your invoice for ${eventName} is ready.`,
          `Invoice number: ${invoiceNumber}`,
          `Registration: ${invoice.registration.registrationNumber}`,
          `Ticket: ${ticketName} × ${quantity}`,
          ...(unitPrice ? [`Unit price: ${unitPrice} ${invoice.currency.trim()}`] : []),
          `Subtotal: ${snapshotSubtotal.toFixed(2)} ${invoice.currency.trim()}`,
          ...(Number(discountAmount) > 0
            ? [`Discount: ${discountAmount} ${invoice.currency.trim()}`]
            : []),
          `Amount due: ${amount}`,
          `Issued: ${invoice.issuedAt.toISOString()}`,
        ].join("\n"),
        html: [
          `<p>Hello ${escapeHtml(participantName)},</p>`,
          `<p>Your invoice for ${escapeHtml(eventName)} is ready.</p>`,
          `<p><strong>Invoice number:</strong> ${escapeHtml(invoiceNumber)}</p>`,
          `<p><strong>Registration:</strong> ${escapeHtml(invoice.registration.registrationNumber)}</p>`,
          `<p><strong>Ticket:</strong> ${escapeHtml(ticketName)} × ${quantity}</p>`,
          ...(unitPrice
            ? [`<p><strong>Unit price:</strong> ${escapeHtml(unitPrice)} ${escapeHtml(invoice.currency.trim())}</p>`]
            : []),
          `<p><strong>Subtotal:</strong> ${escapeHtml(snapshotSubtotal.toFixed(2))} ${escapeHtml(invoice.currency.trim())}</p>`,
          ...(Number(discountAmount) > 0
            ? [`<p><strong>Discount:</strong> ${escapeHtml(discountAmount)} ${escapeHtml(invoice.currency.trim())}</p>`]
            : []),
          `<p><strong>Amount due:</strong> ${escapeHtml(amount)}</p>`,
          `<p><strong>Issued:</strong> ${escapeHtml(invoice.issuedAt.toISOString())}</p>`,
        ].join(""),
        attachments: [
          {
            filename: `${invoiceNumber}.pdf`,
            content: pdf.toString("base64"),
            content_type: "application/pdf",
          },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      await prisma.notificationDelivery.update({
        where: { id: notification.id },
        data: {
          failedAt: new Date(),
          failureReason: `Email provider returned HTTP ${response.status}.`,
        },
      });
      return "failed";
    }

    const result: unknown = await response.json();
    const providerMessageId =
      result && typeof result === "object" && "id" in result &&
      typeof result.id === "string"
        ? result.id.slice(0, 255)
        : null;
    await prisma.notificationDelivery.update({
      where: { id: notification.id },
      data: {
        status: "sent",
        providerMessageId,
        sentAt: new Date(),
        failedAt: null,
        failureReason: null,
      },
    });
    return "sent";
  } catch {
    await prisma.notificationDelivery.update({
      where: { id: notification.id },
      data: {
        failedAt: new Date(),
        failureReason: "Invoice email delivery failed.",
      },
    });
    console.error("Invoice email delivery failed.");
    return "failed";
  }
}
