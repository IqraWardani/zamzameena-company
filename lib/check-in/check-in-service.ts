export type CheckInTicket = {
  id: string;
  ticketCode: string;
  status: string;
  eventId: string;
  registrationId: string;
  registrationStatus: string;
  checkedInAt: Date | null;
};

export type CheckInTransaction = {
  isStaffAuthorized(adminUserId: string, eventId: string): Promise<boolean>;
  findTicketByCode(ticketCode: string): Promise<CheckInTicket | null>;
  lockRegistration(registrationId: string): Promise<void>;
  findTicketForRegistration(
    eventId: string,
    registrationId: string,
  ): Promise<CheckInTicket | null>;
  createCheckIn(input: {
    eventId: string;
    registrationId: string;
    ticketId: string;
    checkedInByAdminUserId: string;
  }): Promise<{ id: string; checkedInAt: Date }>;
  createAuditLog(input: {
    checkInId: string;
    eventId: string;
    registrationId: string;
    ticketId: string;
    actorAdminUserId: string;
    merchandiseReceived: boolean;
  }): Promise<void>;
};

export type CheckInRepository = {
  transaction<T>(work: (transaction: CheckInTransaction) => Promise<T>): Promise<T>;
};

export type CheckInResult =
  | { status: "checked_in"; checkedInAt: Date }
  | { status: "already_checked_in"; checkedInAt: Date }
  | { status: "invalid_ticket" }
  | { status: "wrong_event" }
  | { status: "registration_unconfirmed" }
  | { status: "ticket_inactive" }
  | { status: "merchandise_required" }
  | { status: "access_denied" };

function isValidCode(value: string): boolean {
  return /^ZAS-TKT-[A-F0-9]{32}$/i.test(value);
}

async function recordCheckIn(
  transaction: CheckInTransaction,
  input: {
    eventId: string;
    adminUserId: string;
    ticket: CheckInTicket | null;
    merchandiseReceived: boolean;
  },
): Promise<CheckInResult> {
  const { ticket } = input;
  if (!ticket) return { status: "invalid_ticket" };
  if (ticket.eventId !== input.eventId) return { status: "wrong_event" };
  if (ticket.status !== "active") return { status: "ticket_inactive" };
  if (ticket.registrationStatus !== "confirmed") {
    return { status: "registration_unconfirmed" };
  }
  if (ticket.checkedInAt) {
    return { status: "already_checked_in", checkedInAt: ticket.checkedInAt };
  }

  await transaction.lockRegistration(ticket.registrationId);
  const currentTicket = await transaction.findTicketForRegistration(
    input.eventId,
    ticket.registrationId,
  );
  if (!currentTicket) return { status: "invalid_ticket" };
  if (currentTicket.eventId !== input.eventId) return { status: "wrong_event" };
  if (currentTicket.status !== "active") return { status: "ticket_inactive" };
  if (currentTicket.registrationStatus !== "confirmed") {
    return { status: "registration_unconfirmed" };
  }
  if (currentTicket.checkedInAt) {
    return { status: "already_checked_in", checkedInAt: currentTicket.checkedInAt };
  }

  const checkIn = await transaction.createCheckIn({
    eventId: input.eventId,
    registrationId: currentTicket.registrationId,
    ticketId: currentTicket.id,
    checkedInByAdminUserId: input.adminUserId,
  });
  await transaction.createAuditLog({
    checkInId: checkIn.id,
    eventId: input.eventId,
    registrationId: currentTicket.registrationId,
    ticketId: currentTicket.id,
    actorAdminUserId: input.adminUserId,
    merchandiseReceived: input.merchandiseReceived,
  });
  return { status: "checked_in", checkedInAt: checkIn.checkedInAt };
}

export async function checkInByTicketCode(
  repository: CheckInRepository,
  input: {
    eventId: string;
    adminUserId: string;
    ticketCode: string;
    merchandiseReceived: boolean;
  },
): Promise<CheckInResult> {
  const ticketCode = input.ticketCode.trim().toUpperCase();
  if (!isValidCode(ticketCode)) return { status: "invalid_ticket" };

  return repository.transaction(async (transaction) => {
    if (!(await transaction.isStaffAuthorized(input.adminUserId, input.eventId))) {
      return { status: "access_denied" };
    }
    if (input.merchandiseReceived !== true) {
      return { status: "merchandise_required" };
    }
    const ticket = await transaction.findTicketByCode(ticketCode);
    return recordCheckIn(transaction, {
      eventId: input.eventId,
      adminUserId: input.adminUserId,
      ticket,
      merchandiseReceived: true,
    });
  });
}

export async function checkInByRegistrationSearch(
  repository: CheckInRepository,
  input: {
    eventId: string;
    adminUserId: string;
    registrationId: string;
    merchandiseReceived: boolean;
  },
): Promise<CheckInResult> {
  return repository.transaction(async (transaction) => {
    if (!(await transaction.isStaffAuthorized(input.adminUserId, input.eventId))) {
      return { status: "access_denied" };
    }
    if (input.merchandiseReceived !== true) {
      return { status: "merchandise_required" };
    }
    const ticket = await transaction.findTicketForRegistration(
      input.eventId,
      input.registrationId,
    );
    return recordCheckIn(transaction, {
      eventId: input.eventId,
      adminUserId: input.adminUserId,
      ticket,
      merchandiseReceived: true,
    });
  });
}
