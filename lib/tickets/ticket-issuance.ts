import { randomBytes } from "node:crypto";

export type TicketIssueTransaction = {
  lockRegistration(registrationId: string): Promise<void>;
  findTicketContext(
    registrationId: string,
  ): Promise<{ eventId: string; status: string; ticketId: string | null } | null>;
  createActiveTicket(input: {
    registrationId: string;
    ticketCode: string;
  }): Promise<{ id: string }>;
  auditTicketIssued(input: {
    ticketId: string;
    registrationId: string;
    eventId: string;
    actorAdminUserId: string | null;
    reason: "payment_approved" | "zero_price_registration";
  }): Promise<void>;
};

export class TicketIssuanceError extends Error {
  constructor(
    readonly reason: "registration_not_found" | "registration_not_confirmed" | "ticket_already_exists",
  ) {
    super(reason);
  }
}

export function createTicketCode(): string {
  return `ZAS-TKT-${randomBytes(16).toString("hex").toUpperCase()}`;
}

export async function issueConfirmedTicket(
  transaction: TicketIssueTransaction,
  input: {
    registrationId: string;
    actorAdminUserId: string | null;
    reason: "payment_approved" | "zero_price_registration";
  },
): Promise<{ id: string }> {
  await transaction.lockRegistration(input.registrationId);
  const context = await transaction.findTicketContext(input.registrationId);
  if (!context) throw new TicketIssuanceError("registration_not_found");
  if (context.status !== "confirmed") {
    throw new TicketIssuanceError("registration_not_confirmed");
  }
  if (context.ticketId) throw new TicketIssuanceError("ticket_already_exists");

  const ticket = await transaction.createActiveTicket({
    registrationId: input.registrationId,
    ticketCode: createTicketCode(),
  });
  await transaction.auditTicketIssued({
    ticketId: ticket.id,
    registrationId: input.registrationId,
    eventId: context.eventId,
    actorAdminUserId: input.actorAdminUserId,
    reason: input.reason,
  });
  return ticket;
}
