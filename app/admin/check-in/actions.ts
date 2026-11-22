"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import {
  checkInByRegistrationSearch,
  checkInByTicketCode,
  type CheckInResult,
} from "@/lib/check-in/check-in-service";
import { prismaCheckInRepository } from "@/lib/check-in/prisma-repository";

export type CheckInOperationState = {
  status?: CheckInResult["status"];
  message?: string;
  checkedInAt?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESULT_MESSAGES: Record<CheckInResult["status"], string> = {
  checked_in: "Check-in berhasil dicatat.",
  already_checked_in: "Pendaftaran ini sudah check-in.",
  invalid_ticket: "Kode tiket tidak valid atau tiket tidak ditemukan.",
  wrong_event: "Tiket ini terdaftar untuk event lain.",
  registration_unconfirmed: "Pendaftaran peserta belum dikonfirmasi.",
  ticket_inactive: "Tiket ini tidak aktif atau sudah dibatalkan.",
  merchandise_required: "Centang konfirmasi merchandise sebelum melanjutkan check-in.",
  access_denied: "Anda tidak memiliki izin check-in untuk event ini.",
};

async function authorizeEvent(eventId: string) {
  if (!UUID_PATTERN.test(eventId)) return null;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.recordCheckIns,
    "/admin/check-in",
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");
  return session;
}

function toState(result: CheckInResult): CheckInOperationState {
  return {
    status: result.status,
    message: RESULT_MESSAGES[result.status],
    ...(
      result.status !== "checked_in" &&
      result.status !== "already_checked_in" &&
      result.status !== "merchandise_required"
        ? { fieldErrors: { ticketCode: RESULT_MESSAGES[result.status] } }
        : {}
    ),
    ...(result.status === "checked_in" || result.status === "already_checked_in"
      ? { checkedInAt: result.checkedInAt.toISOString() }
      : {}),
  };
}

async function runCheckIn(
  eventId: string,
  action: (
    adminUserId: string,
  ) => Promise<CheckInResult>,
): Promise<CheckInOperationState> {
  const session = await authorizeEvent(eventId);
  if (!session) return { status: "access_denied", message: RESULT_MESSAGES.access_denied };
  try {
    const result = await action(session.id);
    if (result.status === "checked_in") {
      revalidatePath("/admin/check-in");
      revalidatePath("/admin/invitations");
    }
    return toState(result);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        status: "already_checked_in",
        message: RESULT_MESSAGES.already_checked_in,
      };
    }
    console.error("Check-in operation failed.");
    return {
      status: "invalid_ticket",
      message: "Check-in belum berhasil dicatat. Periksa koneksi lalu coba lagi.",
      error: "Check-in belum berhasil dicatat. Periksa koneksi lalu coba lagi.",
    };
  }
}

export async function checkInByCodeAction(
  eventId: string,
  _previousState: CheckInOperationState,
  formData: FormData,
): Promise<CheckInOperationState> {
  const ticketCode = formData.get("ticketCode");
  if (
    typeof ticketCode !== "string" ||
    ticketCode.length > 80 ||
    !ticketCode.trim()
  ) {
    return {
      status: "invalid_ticket",
      message: RESULT_MESSAGES.invalid_ticket,
      fieldErrors: { ticketCode: RESULT_MESSAGES.invalid_ticket },
    };
  }
  return runCheckIn(eventId, (adminUserId) =>
    checkInByTicketCode(prismaCheckInRepository, {
      eventId,
      adminUserId,
      ticketCode,
      merchandiseReceived: formData.get("merchandiseReceived") === "confirmed",
    }),
  );
}

export async function checkInByParticipantAction(
  eventId: string,
  registrationId: string,
  previousState: CheckInOperationState,
  formData: FormData,
): Promise<CheckInOperationState> {
  void previousState;
  if (!UUID_PATTERN.test(registrationId)) {
    return { status: "invalid_ticket", message: RESULT_MESSAGES.invalid_ticket };
  }
  const merchandiseReceived = formData.get("merchandiseReceived") === "confirmed";
  return runCheckIn(eventId, (adminUserId) =>
    checkInByRegistrationSearch(prismaCheckInRepository, {
      eventId,
      adminUserId,
      registrationId,
      merchandiseReceived,
    }),
  );
}
