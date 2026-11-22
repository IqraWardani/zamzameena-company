import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  CheckInRepository,
  CheckInTicket,
  CheckInTransaction,
} from "@/lib/check-in/check-in-service";

function mapTicket(
  ticket: {
    id: string;
    ticketCode: string;
    status: string;
    registration: {
      id: string;
      eventId: string;
      status: string;
      checkIn: { checkedInAt: Date } | null;
    };
  } | null,
): CheckInTicket | null {
  if (!ticket) return null;
  return {
    id: ticket.id,
    ticketCode: ticket.ticketCode,
    status: ticket.status,
    registrationId: ticket.registration.id,
    eventId: ticket.registration.eventId,
    registrationStatus: ticket.registration.status,
    checkedInAt: ticket.registration.checkIn?.checkedInAt ?? null,
  };
}

export const prismaCheckInRepository: CheckInRepository = {
  transaction<T>(
    work: (transaction: CheckInTransaction) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (transaction) => {
      const repositoryTransaction: CheckInTransaction = {
        async isStaffAuthorized(adminUserId, eventId) {
          const staff = await transaction.adminUser.findFirst({
            where: {
              id: adminUserId,
              status: "active",
              eventAssignments: { some: { eventId } },
              userRoles: {
                some: {
                  role: {
                    permissions: {
                      some: {
                        permission: { code: "checkins.record" },
                      },
                    },
                  },
                },
              },
            },
            select: { id: true },
          });
          return Boolean(staff);
        },
        async findTicketByCode(ticketCode) {
          return mapTicket(
            await transaction.ticket.findUnique({
              where: { ticketCode },
              select: {
                id: true,
                ticketCode: true,
                status: true,
                registration: {
                  select: {
                    id: true,
                    eventId: true,
                    status: true,
                    checkIn: { select: { checkedInAt: true } },
                  },
                },
              },
            }),
          );
        },
        async lockRegistration(registrationId) {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
          );
        },
        async findTicketForRegistration(eventId, registrationId) {
          return mapTicket(
            await transaction.ticket.findFirst({
              where: {
                registrationId,
                registration: { eventId },
              },
              select: {
                id: true,
                ticketCode: true,
                status: true,
                registration: {
                  select: {
                    id: true,
                    eventId: true,
                    status: true,
                    checkIn: { select: { checkedInAt: true } },
                  },
                },
              },
            }),
          );
        },
        createCheckIn(input) {
          return transaction.checkIn.create({
            data: input,
            select: { id: true, checkedInAt: true },
          });
        },
        async createAuditLog(input) {
          await transaction.auditLog.create({
            data: {
              actorAdminUserId: input.actorAdminUserId,
              eventId: input.eventId,
              entityId: input.checkInId,
              entityType: "check_in",
              action: "participant_checked_in",
              metadata: {
                registrationId: input.registrationId,
                ticketId: input.ticketId,
                merchandiseReceived: input.merchandiseReceived,
              },
            },
          });
        },
      };
      return work(repositoryTransaction);
    });
  },
};
