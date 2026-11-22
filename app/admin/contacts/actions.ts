"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { prisma } from "@/lib/db";

export type ContactStatusActionState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const CONTACT_STATUSES = ["new", "in_progress", "resolved", "spam"] as const;
type ContactStatus = (typeof CONTACT_STATUSES)[number];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isContactStatus(value: string): value is ContactStatus {
  return CONTACT_STATUSES.some((status) => status === value);
}

export async function updateContactStatus(
  contactId: string,
  _previousState: ContactStatusActionState,
  formData: FormData,
): Promise<ContactStatusActionState> {
  if (!UUID_PATTERN.test(contactId)) return { error: "Kiriman kontak tidak ditemukan." };
  const statusValue = formData.get("status");
  if (typeof statusValue !== "string" || !isContactStatus(statusValue)) {
    return {
      error: "Pilih status kontak yang valid.",
      fieldErrors: { status: "Pilih status kontak yang valid." },
    };
  }

  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.manageContacts,
    "/admin/contacts",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const current = await transaction.contactSubmission.findUnique({
        where: { id: contactId },
        select: { status: true },
      });
      if (!current) return "not_found" as const;
      if (current.status === statusValue) return "unchanged" as const;

      const result = await transaction.contactSubmission.updateMany({
        where: { id: contactId, status: current.status },
        data: {
          status: statusValue,
          resolvedAt: statusValue === "resolved" ? new Date() : null,
        },
      });
      if (result.count !== 1) return "conflict" as const;

      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          entityId: contactId,
          entityType: "contact_submission",
          action: "contact_status_changed",
          metadata: { from: current.status, to: statusValue },
        },
      });
      return "updated" as const;
    });

    switch (updated) {
      case "not_found":
        return { error: "Kiriman kontak tidak ditemukan." };
      case "conflict":
        return { error: "Status kontak berubah. Muat ulang halaman lalu coba lagi." };
      case "unchanged":
        return { message: "Status kontak tidak berubah." };
      case "updated":
        revalidatePath("/admin/contacts");
        return { message: "Status kontak berhasil diperbarui." };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Contact status update failed due to a database operation.");
      return { error: "Status belum berhasil diperbarui. Data tetap tersimpan; coba lagi." };
    }
    throw error;
  }
}
