import { createInvoicePdf } from "@/lib/invoices/pdf";
import { getParticipantSession } from "@/lib/participant/session";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  if (!UUID_PATTERN.test(invoiceId)) {
    return new Response("Not found", { status: 404 });
  }
  const participant = await getParticipantSession();
  if (!participant) return new Response("Not found", { status: 404 });

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      registration: { id: { in: participant.registrationIds } },
    },
    select: {
      invoiceNumber: true,
      issuedAt: true,
      amountDue: true,
      unitPriceAmount: true,
      quantity: true,
      subtotalAmount: true,
      discountAmount: true,
      currency: true,
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
  if (!invoice) return new Response("Not found", { status: 404 });

  const pdf = await createInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    issuedAt: invoice.issuedAt,
    amountDue: invoice.amountDue.toFixed(2),
    currency: invoice.currency,
    status: invoice.status === "paid" || invoice.payments[0]?.status === "approved"
      ? "paid"
      : "pending",
    registrationNumber: invoice.registration.registrationNumber,
    eventName: invoice.registration.event.name,
    eventStartsAt: invoice.registration.event.startsAt,
    eventEndsAt: invoice.registration.event.endsAt,
    eventTimezone: invoice.registration.event.timezone,
    eventLocation: [
      invoice.registration.event.venueName,
      invoice.registration.event.venueAddress,
    ].filter(Boolean).join(", ") || null,
    participantName: invoice.registration.participantProfile.fullName,
    participantEmail: invoice.registration.participantProfile.email,
    participantPhone: invoice.registration.participantProfile.phone,
    ticketLines: [{
      description: invoice.registration.ticketType.name,
      quantity: invoice.quantity ?? 1,
      unitPrice: invoice.unitPriceAmount?.toFixed(2) ?? null,
      total: invoice.amountDue.toFixed(2),
    }],
    subtotal: (invoice.subtotalAmount ?? invoice.amountDue).toFixed(2),
    discountAmount: invoice.discountAmount?.toFixed(2) ?? "0.00",
    paymentMethod: invoice.payments[0]?.senderBank
      ? `Bank Transfer (${invoice.payments[0].senderBank})`
      : null,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
