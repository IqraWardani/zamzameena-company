import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  InvitationCollectionRepository,
  InvitationCollectionTransaction,
} from "@/lib/invitations/collection-service";

export const prismaInvitationCollectionRepository: InvitationCollectionRepository = {
  transaction<T>(
    work: (transaction: InvitationCollectionTransaction) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (transaction) => {
      const repositoryTransaction: InvitationCollectionTransaction = {
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
                        permission: { code: "invitations.collect" },
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
        async lockInvitationCode(eventId, code) {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM invitation_codes WHERE event_id = ${eventId}::uuid AND code = ${code} FOR UPDATE`,
          );
        },
        async findInvitationCode(eventId, code) {
          const invitation = await transaction.invitationCode.findFirst({
            where: { eventId, code },
            select: {
              id: true,
              eventId: true,
              registrationId: true,
              ticketId: true,
              expiresAt: true,
              isActive: true,
              ticket: { select: { registrationId: true } },
            },
          });
          return invitation
            ? {
                id: invitation.id,
                eventId: invitation.eventId,
                registrationId: invitation.registrationId,
                ticketRegistrationId: invitation.ticket?.registrationId ?? null,
                expiresAt: invitation.expiresAt,
                isActive: invitation.isActive,
              }
            : null;
        },
        async lockRegistration(registrationId) {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
          );
        },
        async findRegistration(registrationId) {
          const registration = await transaction.registration.findUnique({
            where: { id: registrationId },
            select: {
              id: true,
              eventId: true,
              status: true,
              tickets: { select: { id: true, status: true }, take: 1 },
              invitationCollection: { select: { id: true } },
            },
          });
          return registration
            ? {
                id: registration.id,
                eventId: registration.eventId,
                status: registration.status,
                ticketId: registration.tickets[0]?.id ?? null,
                ticketStatus: registration.tickets[0]?.status ?? null,
                alreadyCollected: Boolean(registration.invitationCollection),
              }
            : null;
        },
        createCollection(input) {
          return transaction.invitationCollection.create({
            data: input,
            select: { id: true, collectedAt: true },
          });
        },
        async deactivateInvitationCodesForRegistration(input) {
          await transaction.invitationCode.updateMany({
            where: {
              eventId: input.eventId,
              isActive: true,
              OR: [
                { registrationId: input.registrationId },
                { ticketId: input.ticketId },
              ],
            },
            data: { isActive: false },
          });
        },
        async auditCollection(input) {
          await transaction.auditLog.create({
            data: {
              actorAdminUserId: input.actorAdminUserId,
              eventId: input.eventId,
              entityId: input.collectionId,
              entityType: "invitation_collection",
              action: "invitation_collected",
              metadata: {
                registrationId: input.registrationId,
                method: input.method,
              },
            },
          });
        },
      };

      return work(repositoryTransaction);
    });
  },
};
