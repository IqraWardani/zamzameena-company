import { getParticipantPaymentStatus } from "@/lib/payments/participant-status";
import { buildParticipantWorkbook } from "@/lib/admin/participant-export";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function answerText(answer: Prisma.JsonValue): string {
  if (typeof answer === "string") return answer;
  if (answer === null || typeof answer === "number" || typeof answer === "boolean") {
    return answer === null ? "" : String(answer);
  }
  return JSON.stringify(answer);
}

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("eventId") ?? "";
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.reviewPayments,
    "/admin/participants.xlsx",
    eventId,
  );
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }
  if (!decision.allowed) {
    return Response.json({ error: "You are not authorized to export this event." }, { status: 403 });
  }
  if (!UUID_PATTERN.test(eventId)) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, name: true, slug: true, timezone: true },
  });
  if (!event) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  const registrations = await prisma.registration.findMany({
    where: { eventId: event.id },
    orderBy: [{ registeredAt: "asc" }, { id: "asc" }],
    select: {
      status: true,
      participantProfile: {
        select: { fullName: true, phone: true, email: true, city: true },
      },
      ticketType: { select: { priceAmount: true } },
      answers: {
        where: { fieldKey: { in: ["domicile_address", "identity_address"] } },
        select: { fieldKey: true, answer: true },
      },
      invoices: {
        orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
        select: {
          status: true,
          payments: { select: { status: true } },
        },
      },
    },
  });

  const exportedAt = new Date();
  const workbook = await buildParticipantWorkbook({
    eventName: event.name,
    exportedAt,
    timezone: event.timezone,
    participants: registrations.map((registration) => {
      const answers = new Map(
        registration.answers.map(({ fieldKey, answer }) => [fieldKey, answerText(answer)]),
      );
      const hasApprovedPayment = registration.invoices.some((invoice) =>
        invoice.payments.some((payment) => payment.status === "approved"),
      );
      const paymentStatus = getParticipantPaymentStatus({
        registrationStatus: registration.status,
        invoiceStatus: registration.invoices.some((invoice) => invoice.status === "paid")
          ? "paid"
          : registration.invoices[0]?.status ?? null,
        hasApprovedPayment,
        ticketPrice: registration.ticketType.priceAmount.toString(),
      });

      return {
        fullName: registration.participantProfile.fullName,
        phone: registration.participantProfile.phone,
        email: registration.participantProfile.email,
        address: answers.get("domicile_address") || answers.get("identity_address") || "",
        city: registration.participantProfile.city ?? "",
        status: paymentStatus === "paid" ? "Paid" : "Pending",
      };
    }),
  });
  const fileSlug = event.slug.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "")
    || "event";

  return new Response(new Uint8Array(workbook), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="data-peserta-${fileSlug}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
