export type InvitationCodeRecord = {
  id: string;
  eventId: string;
  registrationId: string | null;
  ticketRegistrationId: string | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export type InvitationRegistrationRecord = {
  id: string;
  eventId: string;
  status: string;
  ticketId: string | null;
  ticketStatus: string | null;
  alreadyCollected: boolean;
};

export type InvitationCollectionTransaction = {
  isStaffAuthorized(adminUserId: string, eventId: string): Promise<boolean>;
  lockInvitationCode(eventId: string, code: string): Promise<void>;
  findInvitationCode(eventId: string, code: string): Promise<InvitationCodeRecord | null>;
  lockRegistration(registrationId: string): Promise<void>;
  findRegistration(registrationId: string): Promise<InvitationRegistrationRecord | null>;
  createCollection(input: {
    eventId: string;
    registrationId: string;
    invitationCodeId: string | null;
    method: "invitation_code" | "participant_search";
    collectedByAdminUserId: string;
  }): Promise<{ id: string; collectedAt: Date }>;
  deactivateInvitationCodesForRegistration(input: {
    eventId: string;
    registrationId: string;
    ticketId: string;
  }): Promise<void>;
  auditCollection(input: {
    collectionId: string;
    registrationId: string;
    eventId: string;
    actorAdminUserId: string;
    method: "invitation_code" | "participant_search";
  }): Promise<void>;
};

export type InvitationCollectionRepository = {
  transaction<T>(
    work: (transaction: InvitationCollectionTransaction) => Promise<T>,
  ): Promise<T>;
};

export type InvitationCollectionResult =
  | { success: true; registrationId: string; collectedAt: Date }
  | {
      success: false;
      reason:
        | "forbidden"
        | "code_invalid"
        | "registration_unavailable"
        | "already_collected";
    };

export function normalizeInvitationCode(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return /^[A-Z0-9-]{8,80}$/.test(normalized) ? normalized : null;
}

export function isInvitationCodeUsable(
  code: InvitationCodeRecord,
  eventId: string,
  now: Date,
): boolean {
  const targetRegistrationId =
    code.registrationId ?? code.ticketRegistrationId;
  return (
    code.isActive &&
    code.eventId === eventId &&
    (!code.expiresAt || code.expiresAt > now) &&
    targetRegistrationId !== null &&
    (!code.registrationId ||
      !code.ticketRegistrationId ||
      code.registrationId === code.ticketRegistrationId)
  );
}

async function recordCollection(
  transaction: InvitationCollectionTransaction,
  input: {
    eventId: string;
    registrationId: string;
    actorAdminUserId: string;
    method: "invitation_code" | "participant_search";
    invitationCodeId: string | null;
  },
): Promise<InvitationCollectionResult> {
  await transaction.lockRegistration(input.registrationId);
  const registration = await transaction.findRegistration(input.registrationId);
  if (
    !registration ||
    registration.eventId !== input.eventId ||
    registration.status !== "confirmed" ||
    !registration.ticketId ||
    registration.ticketStatus !== "active"
  ) {
    return { success: false, reason: "registration_unavailable" };
  }
  if (registration.alreadyCollected) {
    return { success: false, reason: "already_collected" };
  }

  const collection = await transaction.createCollection({
    eventId: input.eventId,
    registrationId: registration.id,
    invitationCodeId: input.invitationCodeId,
    method: input.method,
    collectedByAdminUserId: input.actorAdminUserId,
  });
  await transaction.deactivateInvitationCodesForRegistration({
    eventId: input.eventId,
    registrationId: registration.id,
    ticketId: registration.ticketId,
  });
  await transaction.auditCollection({
    collectionId: collection.id,
    registrationId: registration.id,
    eventId: input.eventId,
    actorAdminUserId: input.actorAdminUserId,
    method: input.method,
  });
  return {
    success: true,
    registrationId: registration.id,
    collectedAt: collection.collectedAt,
  };
}

export async function collectInvitationByCode(
  repository: InvitationCollectionRepository,
  input: {
    eventId: string;
    actorAdminUserId: string;
    code: string;
    now?: Date;
  },
): Promise<InvitationCollectionResult> {
  const codeValue = normalizeInvitationCode(input.code);
  if (!codeValue) return { success: false, reason: "code_invalid" };
  const now = input.now ?? new Date();

  return repository.transaction(async (transaction) => {
    if (!(await transaction.isStaffAuthorized(input.actorAdminUserId, input.eventId))) {
      return { success: false, reason: "forbidden" };
    }
    await transaction.lockInvitationCode(input.eventId, codeValue);
    const code = await transaction.findInvitationCode(input.eventId, codeValue);
    if (!code || !isInvitationCodeUsable(code, input.eventId, now)) {
      return { success: false, reason: "code_invalid" };
    }
    const registrationId = code.registrationId ?? code.ticketRegistrationId;
    if (!registrationId) return { success: false, reason: "code_invalid" };

    return recordCollection(transaction, {
      eventId: input.eventId,
      registrationId,
      actorAdminUserId: input.actorAdminUserId,
      method: "invitation_code",
      invitationCodeId: code.id,
    });
  });
}

export async function collectInvitationByParticipantSearch(
  repository: InvitationCollectionRepository,
  input: {
    eventId: string;
    registrationId: string;
    actorAdminUserId: string;
  },
): Promise<InvitationCollectionResult> {
  return repository.transaction(async (transaction) => {
    if (!(await transaction.isStaffAuthorized(input.actorAdminUserId, input.eventId))) {
      return { success: false, reason: "forbidden" };
    }
    return recordCollection(transaction, {
      eventId: input.eventId,
      registrationId: input.registrationId,
      actorAdminUserId: input.actorAdminUserId,
      method: "participant_search",
      invitationCodeId: null,
    });
  });
}
