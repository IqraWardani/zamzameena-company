import "server-only";

import { Prisma } from "@prisma/client";
import type { TicketIssueTransaction } from "@/lib/tickets/ticket-issuance";

export function prismaTicketIssueTransaction(
  transaction: Prisma.TransactionClient,
): TicketIssueTransaction {
  return {
    async lockRegistration(registrationId) {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
      );
    },
    async findTicketContext(registrationId) {
      const registration = await transaction.registration.findUnique({
        where: { id: registrationId },
        select: {
          eventId: true,
          status: true,
          tickets: { select: { id: true }, take: 1 },
        },
      });
      return registration
        ? {
            eventId: registration.eventId,
            status: registration.status,
            ticketId: registration.tickets[0]?.id ?? null,
          }
        : null;
    },
    createActiveTicket(input) {
      return transaction.ticket.create({
        data: {
          registrationId: input.registrationId,
          ticketCode: input.ticketCode,
          status: "active",
        },
        select: { id: true },
      });
    },
    async auditTicketIssued(input) {
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: input.actorAdminUserId,
          eventId: input.eventId,
          entityId: input.ticketId,
          entityType: "ticket",
          action: "ticket_issued",
          metadata: {
            registrationId: input.registrationId,
            reason: input.reason,
          },
        },
      });
    },
  };
}
