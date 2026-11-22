import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  RegistrationRepository,
  RegistrationTransaction,
} from "@/lib/registration/registration-service";
import { issueConfirmedTicket } from "@/lib/tickets/ticket-issuance";
import { prismaTicketIssueTransaction } from "@/lib/tickets/prisma-transaction";

export const prismaRegistrationRepository: RegistrationRepository = {
  transaction<T>(
    work: (transaction: RegistrationTransaction) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(async (transaction) => {
      const registrationTransaction: RegistrationTransaction = {
        async lockParticipantEmail(email) {
          await transaction.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${email}, 0))`,
          );
        },
        async nextInvoiceSequence() {
          const [result] = await transaction.$queryRaw<{ value: bigint }[]>(
            Prisma.sql`SELECT nextval('public.invoice_number_seq') AS value`,
          );
          if (!result) throw new Error("Invoice sequence did not return a value.");
          return result.value;
        },
        findEventBySlug(slug) {
          return transaction.event.findUnique({
            where: { slug },
            select: {
              id: true,
              slug: true,
              name: true,
              status: true,
              startsAt: true,
              timezone: true,
              registrationOpensAt: true,
              registrationClosesAt: true,
            },
          });
        },
        async lockEventAvailability(eventId) {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE`,
          );
        },
        async findTicketType(ticketTypeId) {
          const ticket = await transaction.ticketType.findUnique({
            where: { id: ticketTypeId },
            select: {
              id: true,
              eventId: true,
              priceAmount: true,
              currency: true,
              isActive: true,
              capacity: true,
              salesOpensAt: true,
              salesClosesAt: true,
            },
          });
          return ticket ? { ...ticket, priceAmount: ticket.priceAmount.toString() } : null;
        },
        async findActiveSalesMemberByReferralCode(eventId, referralCode) {
          const [member] = await transaction.$queryRaw<{
            id: string;
            referral_code: string;
            position: "director" | "arm" | "branch_manager" | "sales";
          }[]>(
            Prisma.sql`
              SELECT id, referral_code, position
              FROM sales_members
              WHERE event_id = ${eventId}::uuid
                AND lower(referral_code) = lower(${referralCode})
                AND status = 'active'
              FOR UPDATE
            `,
          );
          return member
            ? {
                id: member.id,
                referralCode: member.referral_code,
                position: member.position,
              }
            : null;
        },
        async findActiveSalesMemberById(eventId, salesMemberId) {
          const [member] = await transaction.$queryRaw<{
            id: string;
            referral_code: string;
            position: "director" | "arm" | "branch_manager" | "sales";
          }[]>(
            Prisma.sql`
              SELECT id, referral_code, position
              FROM sales_members
              WHERE event_id = ${eventId}::uuid
                AND id = ${salesMemberId}::uuid
                AND status = 'active'
              FOR UPDATE
            `,
          );
          return member
            ? {
                id: member.id,
                referralCode: member.referral_code,
                position: member.position,
              }
            : null;
        },
        async lockTicketCapacity(ticketTypeId) {
          await transaction.$queryRaw(
            Prisma.sql`SELECT id FROM ticket_types WHERE id = ${ticketTypeId}::uuid FOR UPDATE`,
          );
        },
        findParticipantByEmail(email) {
          return transaction.participantProfile.findFirst({
            where: { email },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
        },
        findRegistration(eventId, participantProfileId) {
          return transaction.registration.findUnique({
            where: {
              eventId_participantProfileId: { eventId, participantProfileId },
            },
            select: { registrationNumber: true },
          });
        },
        countCapacityReservations(ticketTypeId) {
          return transaction.registration.count({
            where: {
              ticketTypeId,
              status: { in: ["pending_payment", "payment_submitted", "confirmed"] },
            },
          });
        },
        async createParticipantProfile(participant) {
          const created = await transaction.participantProfile.create({
            data: participant,
            select: { id: true },
          });
          return created;
        },
        async capturePrivacyConsent(participantProfileId) {
          await transaction.participantConsent.createMany({
            data: [{
              participantProfileId,
              consentType: "event_registration_privacy",
              policyVersion: "v1",
              granted: true,
              source: "public_event_registration",
            }],
            skipDuplicates: true,
          });
        },
        async createRegistration(input) {
          const registration = await transaction.registration.create({
            data: {
              registrationNumber: input.registrationNumber,
              eventId: input.eventId,
              participantProfileId: input.participantProfileId,
              ticketTypeId: input.ticketTypeId,
              sellerMemberId: input.sellerMemberId,
              referralCodeSnapshot: input.referralCodeSnapshot,
              status: input.status,
            },
            select: { id: true },
          });
          if (input.sellerMemberId && input.referralCodeSnapshot) {
            await transaction.auditLog.create({
              data: {
                eventId: input.eventId,
                entityId: registration.id,
                entityType: "registration",
                action: "sales_referral_attributed",
                metadata: {
                  salesMemberId: input.sellerMemberId,
                  referralCodeSnapshot: input.referralCodeSnapshot,
                },
              },
            });
          }
          return registration;
        },
        async issueFreeTicket(registrationId) {
          await issueConfirmedTicket(
            prismaTicketIssueTransaction(transaction),
            {
              registrationId,
              actorAdminUserId: null,
              reason: "zero_price_registration",
            },
          );
        },
        async createInvoice(input) {
          return transaction.invoice.create({
            data: {
              invoiceNumber: input.invoiceNumber,
              registrationId: input.registrationId,
              unitPriceAmount: new Prisma.Decimal(input.unitPriceAmount),
              quantity: input.quantity,
              subtotalAmount: new Prisma.Decimal(input.subtotalAmount),
              discountAmount: new Prisma.Decimal(input.discountAmount),
              amountDue: new Prisma.Decimal(input.amountDue),
              currency: input.currency,
              status: "pending",
            },
            select: { id: true },
          });
        },
        async queueInvoiceEmail(input) {
          return transaction.notificationDelivery.create({
            data: {
              registrationId: input.registrationId,
              participantProfileId: input.participantProfileId,
              channel: "email",
              templateKey: "invoice_issued_v1",
              recipient: input.recipient,
              payload: { invoiceId: input.invoiceId },
            },
            select: { id: true },
          });
        },
        async createAnswers(registrationId, answers) {
          if (answers.length === 0) return;
          await transaction.registrationAnswer.createMany({
            data: answers.map(({ fieldKey, answer }) => ({
              registrationId,
              fieldKey,
              answer,
            })),
          });
        },
      };

      return work(registrationTransaction);
    });
  },
};
