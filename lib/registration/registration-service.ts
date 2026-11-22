import { randomBytes } from "node:crypto";
import type { ParticipantRegistrationInput } from "@/lib/registration/validation";
import {
  createInvoiceNumber,
  getEventYear,
} from "@/lib/registration/invoice-number";

type EventForRegistration = {
  id: string;
  slug: string;
  name: string;
  status: string;
  startsAt: Date;
  timezone: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
};

type TicketForRegistration = {
  id: string;
  eventId: string;
  priceAmount: string;
  currency: string;
  isActive: boolean;
  capacity: number | null;
  salesOpensAt: Date | null;
  salesClosesAt: Date | null;
};

type RegistrationRecord = { registrationNumber: string };
type ParticipantRecord = { id: string };
type SalesReferralRecord = {
  id: string;
  referralCode: string;
  position: "director" | "arm" | "branch_manager" | "sales";
};

export interface RegistrationTransaction {
  lockParticipantEmail(email: string): Promise<void>;
  nextInvoiceSequence(): Promise<bigint>;
  findEventBySlug(slug: string): Promise<EventForRegistration | null>;
  lockEventAvailability(eventId: string): Promise<void>;
  findTicketType(ticketTypeId: string): Promise<TicketForRegistration | null>;
  findActiveSalesMemberByReferralCode(
    eventId: string,
    referralCode: string,
  ): Promise<SalesReferralRecord | null>;
  findActiveSalesMemberById(
    eventId: string,
    salesMemberId: string,
  ): Promise<SalesReferralRecord | null>;
  lockTicketCapacity(ticketTypeId: string): Promise<void>;
  findParticipantByEmail(email: string): Promise<ParticipantRecord | null>;
  findRegistration(
    eventId: string,
    participantProfileId: string,
  ): Promise<RegistrationRecord | null>;
  countCapacityReservations(ticketTypeId: string): Promise<number>;
  createParticipantProfile(
    participant: Omit<
      ParticipantRegistrationInput,
      "ticketTypeId" | "answers" | "agreedToPrivacy"
      | "referralCode" | "salesMemberId"
    >,
  ): Promise<ParticipantRecord>;
  capturePrivacyConsent(participantProfileId: string): Promise<void>;
  createRegistration(input: {
    registrationNumber: string;
    eventId: string;
    participantProfileId: string;
    ticketTypeId: string;
    sellerMemberId: string | null;
    referralCodeSnapshot: string | null;
    status: "pending_payment" | "confirmed";
  }): Promise<{ id: string }>;
  issueFreeTicket(registrationId: string): Promise<void>;
  createInvoice(input: {
    invoiceNumber: string;
    registrationId: string;
    unitPriceAmount: string;
    quantity: number;
    subtotalAmount: string;
    discountAmount: string;
    amountDue: string;
    currency: string;
  }): Promise<{ id: string }>;
  queueInvoiceEmail(input: {
    invoiceId: string;
    registrationId: string;
    participantProfileId: string;
    recipient: string;
  }): Promise<{ id: string }>;
  createAnswers(
    registrationId: string,
    answers: ParticipantRegistrationInput["answers"],
  ): Promise<void>;
}

export interface RegistrationRepository {
  transaction<T>(
    work: (transaction: RegistrationTransaction) => Promise<T>,
  ): Promise<T>;
}

export type RegistrationResult =
  | {
      success: true;
      registrationNumber: string;
      invoiceNumber: string | null;
      invoiceId: string | null;
      invoiceNotificationId: string | null;
      registrationId: string;
      participantProfileId: string;
    }
  | {
      success: false;
      reason:
        | "event_unavailable"
        | "ticket_unavailable"
        | "already_registered"
        | "ticket_sold_out"
        | "invalid_referral";
      error: string;
    };

export function registrationConfirmationForClient(
  registrationNumber: string,
  invoiceNumber: string | null,
  invoiceId: string | null,
  emailNotice?: string,
): {
  registrationNumber: string;
  invoiceNumber: string | null;
  invoiceId: string | null;
  emailNotice?: string;
} {
  return {
    registrationNumber,
    invoiceNumber,
    invoiceId,
    ...(emailNotice ? { emailNotice } : {}),
  };
}

export function createRegistrationNumber(now = new Date()): string {
  return `ZAS-${now.getUTCFullYear()}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

function isWithinRegistrationWindow(
  event: EventForRegistration,
  now: Date,
): boolean {
  return (
    event.status === "published" &&
    (!event.registrationOpensAt || event.registrationOpensAt <= now) &&
    (!event.registrationClosesAt || event.registrationClosesAt > now)
  );
}

function isTicketOnSale(ticket: TicketForRegistration, now: Date): boolean {
  return (
    ticket.isActive &&
    (!ticket.salesOpensAt || ticket.salesOpensAt <= now) &&
    (!ticket.salesClosesAt || ticket.salesClosesAt > now)
  );
}

function isZeroPrice(priceAmount: string): boolean {
  return /^0+(?:\.0+)?$/.test(priceAmount);
}

export async function registerParticipant(
  repository: RegistrationRepository,
  eventSlug: string,
  input: ParticipantRegistrationInput,
  options: { now?: Date; registrationNumber?: () => string } = {},
): Promise<RegistrationResult> {
  const now = options.now ?? new Date();
  const newRegistrationNumber = options.registrationNumber ?? (() => createRegistrationNumber(now));

  return repository.transaction(async (transaction) => {
    await transaction.lockParticipantEmail(input.email);

    let event = await transaction.findEventBySlug(eventSlug);
    if (!event || !isWithinRegistrationWindow(event, now)) {
      return {
        success: false,
        reason: "event_unavailable",
        error: "Registration for this event is not currently open.",
      };
    }
    await transaction.lockEventAvailability(event.id);
    event = await transaction.findEventBySlug(eventSlug);
    if (!event || !isWithinRegistrationWindow(event, now)) {
      return {
        success: false,
        reason: "event_unavailable",
        error: "Registration for this event is not currently open.",
      };
    }

    let ticket = await transaction.findTicketType(input.ticketTypeId);
    if (
      !ticket ||
      ticket.eventId !== event.id ||
      !isTicketOnSale(ticket, now)
    ) {
      return {
        success: false,
        reason: "ticket_unavailable",
        error: "That ticket is not available for this event. Choose another ticket.",
      };
    }

    await transaction.lockTicketCapacity(ticket.id);
    ticket = await transaction.findTicketType(ticket.id);
    if (!ticket || ticket.eventId !== event.id || !isTicketOnSale(ticket, now)) {
      return {
        success: false,
        reason: "ticket_unavailable",
        error: "That ticket is not available for this event. Choose another ticket.",
      };
    }

    const referralCode = input.referralCode?.toUpperCase() ?? null;
    const salesMemberByCode = referralCode
      ? await transaction.findActiveSalesMemberByReferralCode(event.id, referralCode)
      : null;
    const salesMemberById = input.salesMemberId
      ? await transaction.findActiveSalesMemberById(event.id, input.salesMemberId)
      : null;
    if (
      (!salesMemberByCode && !salesMemberById) ||
      (referralCode && input.salesMemberId) ||
      (referralCode && !salesMemberByCode) ||
      (input.salesMemberId && !salesMemberById) ||
      (salesMemberByCode && salesMemberById && salesMemberByCode.id !== salesMemberById.id)
    ) {
      return {
        success: false,
        reason: "invalid_referral",
        error: "Pilih penjual aktif yang terdaftar pada event ini atau masukkan kode referral yang valid.",
      };
    }
    const salesMember = salesMemberByCode ?? salesMemberById;

    const existingParticipant = await transaction.findParticipantByEmail(input.email);
    if (
      existingParticipant &&
      (await transaction.findRegistration(event.id, existingParticipant.id))
    ) {
      return {
        success: false,
        reason: "already_registered",
        error: "This email address is already registered for this event.",
      };
    }

    const reservations = await transaction.countCapacityReservations(ticket.id);
    if (ticket.capacity !== null && reservations >= ticket.capacity) {
      return {
        success: false,
        reason: "ticket_sold_out",
        error: "This ticket type has reached capacity. Choose another ticket.",
      };
    }

    const participant =
      existingParticipant ??
      (await transaction.createParticipantProfile({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        organizationName: input.organizationName,
        jobTitle: input.jobTitle,
        city: input.city,
        countryCode: input.countryCode,
      }));
    await transaction.capturePrivacyConsent(participant.id);
    const registrationNumber = newRegistrationNumber();

    const registration = await transaction.createRegistration({
      registrationNumber,
      eventId: event.id,
      participantProfileId: participant.id,
      ticketTypeId: ticket.id,
      sellerMemberId: salesMember?.id ?? null,
      referralCodeSnapshot: salesMember?.referralCode ?? null,
      status: isZeroPrice(ticket.priceAmount) ? "confirmed" : "pending_payment",
    });
    let invoiceNumber: string | null = null;
    let invoiceId: string | null = null;
    let invoiceNotificationId: string | null = null;
    if (isZeroPrice(ticket.priceAmount)) {
      await transaction.issueFreeTicket(registration.id);
    } else {
      const sequence = await transaction.nextInvoiceSequence();
      invoiceNumber = createInvoiceNumber(
        getEventYear(event.startsAt, event.timezone),
        sequence,
      );
      const invoice = await transaction.createInvoice({
        invoiceNumber,
        registrationId: registration.id,
        unitPriceAmount: ticket.priceAmount,
        quantity: 1,
        subtotalAmount: ticket.priceAmount,
        discountAmount: "0.00",
        amountDue: ticket.priceAmount,
        currency: ticket.currency,
      });
      invoiceId = invoice.id;
      const notification = await transaction.queueInvoiceEmail({
        invoiceId,
        registrationId: registration.id,
        participantProfileId: participant.id,
        recipient: input.email,
      });
      invoiceNotificationId = notification.id;
    }
    await transaction.createAnswers(registration.id, input.answers);

    return {
      success: true,
      registrationNumber,
      invoiceNumber,
      invoiceId,
      invoiceNotificationId,
      registrationId: registration.id,
      participantProfileId: participant.id,
    };
  });
}
