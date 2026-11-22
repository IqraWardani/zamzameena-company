"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { prisma } from "@/lib/db";
import {
  collectInvitationByCode,
  collectInvitationByParticipantSearch,
  type InvitationCollectionResult,
} from "@/lib/invitations/collection-service";
import { prismaInvitationCollectionRepository } from "@/lib/invitations/prisma-repository";

export type InvitationOperationState = {
  error?: string;
  message?: string;
  invitationCode?: string;
  fieldErrors?: Record<string, string>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeEvent(eventId: string) {
  if (!UUID_PATTERN.test(eventId)) return null;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.collectInvitations,
    "/admin/invitations",
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");
  return session;
}

async function isStillAuthorized(
  transaction: Prisma.TransactionClient,
  adminUserId: string,
  eventId: string,
): Promise<boolean> {
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
                permission: { code: EVENT_PERMISSIONS.collectInvitations },
              },
            },
          },
        },
      },
    },
    select: { id: true },
  });
  return Boolean(staff);
}

function collectionResultMessage(result: InvitationCollectionResult): InvitationOperationState {
  if (result.success) return { message: "Invitation collected. Check-in has not been recorded." };
  switch (result.reason) {
    case "forbidden":
      return { error: "Izin Anda untuk event ini sudah tidak berlaku." };
    case "code_invalid":
      return {
        error: "Kode undangan tidak valid, nonaktif, atau sudah kedaluwarsa.",
        fieldErrors: { code: "Kode undangan tidak valid, nonaktif, atau sudah kedaluwarsa." },
      };
    case "registration_unavailable":
      return { error: "Pendaftaran ini belum memenuhi syarat untuk pengambilan undangan." };
    case "already_collected":
      return { error: "Undangan untuk pendaftaran ini sudah diambil." };
  }
}

export async function createInvitationCode(
  eventId: string,
  registrationId: string,
  _previousState: InvitationOperationState,
  formData: FormData,
): Promise<InvitationOperationState> {
  const session = await authorizeEvent(eventId);
  if (!session) return { error: "Invalid event." };
  if (!UUID_PATTERN.test(registrationId)) return { error: "Invalid registration." };

  const expiryValue = formData.get("expiresAt");
  if (
    expiryValue !== null &&
    (typeof expiryValue !== "string" ||
      (expiryValue !== "" && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(expiryValue)))
  ) {
    const message = "Masukkan waktu kedaluwarsa yang valid.";
    return { error: message, fieldErrors: { expiresAt: message } };
  }
  const expiresAt =
    typeof expiryValue === "string" && expiryValue.trim()
      ? new Date(`${expiryValue}:00Z`)
      : null;
  if (
    expiresAt &&
    (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())
  ) {
    const message = "Waktu kedaluwarsa harus berada di masa mendatang.";
    return { error: message, fieldErrors: { expiresAt: message } };
  }

  const code = `ZAS-${randomBytes(12).toString("hex").toUpperCase()}`;
  let created: { code: string; created: boolean } | null;
  try {
  created = await prisma.$transaction(async (transaction) => {
    if (!(await isStillAuthorized(transaction, session.id, eventId))) return null;
    await transaction.$queryRaw(
      Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
    );
    const registration = await transaction.registration.findFirst({
      where: {
        id: registrationId,
        eventId,
        status: "confirmed",
        tickets: { some: { status: "active" } },
        invitationCollection: { is: null },
      },
      select: {
        id: true,
        tickets: { where: { status: "active" }, select: { id: true }, take: 1 },
      },
    });
    const ticket = registration?.tickets[0];
    if (!registration || !ticket) return null;

    const existingCode = await transaction.invitationCode.findFirst({
      where: {
        eventId,
        registrationId: registration.id,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { code: true },
    });
    if (existingCode) return { code: existingCode.code, created: false };

    const invitation = await transaction.invitationCode.create({
      data: {
        eventId,
        registrationId: registration.id,
        ticketId: ticket.id,
        code,
        expiresAt,
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        actorAdminUserId: session.id,
        eventId,
        entityId: invitation.id,
        entityType: "invitation_code",
        action: "invitation_code_created",
        metadata: { registrationId: registration.id, expiresAt },
      },
    });
    return { code, created: true };
  });
  } catch {
    console.error("Invitation code creation failed.");
    const message = "Kode undangan belum berhasil dibuat. Periksa koneksi lalu coba lagi.";
    return { error: message, fieldErrors: { expiresAt: message } };
  }

  if (!created) return { error: "Pendaftaran ini tidak lagi memenuhi syarat untuk kode undangan." };
  revalidatePath("/admin/invitations");
  return {
    message: created.created
      ? "Kode undangan berhasil dibuat. Bagikan hanya kepada peserta terkait."
      : "Kode undangan aktif sudah tersedia untuk pendaftaran ini.",
    invitationCode: created.code,
  };
}

async function handleCollection(
  eventId: string,
  work: (actorAdminUserId: string) => Promise<InvitationCollectionResult>,
): Promise<InvitationOperationState> {
  const session = await authorizeEvent(eventId);
  if (!session) return { error: "Invalid event." };

  try {
    const result = await work(session.id);
    if (result.success) {
      revalidatePath("/admin/invitations");
      revalidatePath("/admin/check-in");
    }
    return collectionResultMessage(result);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Undangan untuk pendaftaran ini sudah diambil." };
    }
    console.error("Invitation collection failed.");
    return { error: "Pengambilan undangan gagal. Periksa koneksi lalu coba lagi." };
  }
}

export async function collectByInvitationCode(
  eventId: string,
  _previousState: InvitationOperationState,
  formData: FormData,
): Promise<InvitationOperationState> {
  const code = formData.get("code");
  if (typeof code !== "string" || code.length > 80) {
    return {
      error: "Masukkan kode undangan yang valid.",
      fieldErrors: { code: "Masukkan kode undangan yang valid." },
    };
  }
  return handleCollection(eventId, (actorAdminUserId) =>
    collectInvitationByCode(prismaInvitationCollectionRepository, {
      eventId,
      actorAdminUserId,
      code,
    }),
  );
}

export async function collectByParticipantSearch(
  eventId: string,
  registrationId: string,
  previousState: InvitationOperationState,
  formData: FormData,
): Promise<InvitationOperationState> {
  void previousState;
  void formData;
  if (!UUID_PATTERN.test(registrationId)) return { error: "Invalid registration." };
  return handleCollection(eventId, (actorAdminUserId) =>
    collectInvitationByParticipantSearch(prismaInvitationCollectionRepository, {
      eventId,
      registrationId,
      actorAdminUserId,
    }),
  );
}
