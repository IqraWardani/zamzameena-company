"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createEventKeyVisualObjectKey,
  deleteEventKeyVisualObject,
  uploadEventKeyVisualObject,
} from "@/lib/key-visual/storage";
import {
  MAX_KEY_VISUAL_BYTES,
  validateKeyVisual,
} from "@/lib/key-visual/validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import {
  canTransitionEventStatus,
  buildDraftEventData,
  EVENT_PERMISSIONS,
  getMissingEventPublishFields,
  isEventStatus,
  isTicketCapacitySufficient,
  permissionForEventTransition,
  validateEventForm,
  validateTicketTypeForm,
} from "@/lib/admin/event-validation";

export type EventFormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function assertAdminPermission(permission: string, route: string, eventId?: string) {
  if (eventId && !UUID_PATTERN.test(eventId)) {
    throw new Error("Invalid event identifier.");
  }
  const { session, decision } = await requireAdminPermission(permission, route, eventId);
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");
  return session;
}

function isUniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

class EventCodeImmutableError extends Error {}

function isEventCodeConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.some((field) => String(field).includes("event_code"))
    : String(target ?? "").includes("event_code");
}

type ValidatedKeyVisual = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg" | "image/webp";
  originalFilename: string;
};

async function validateKeyVisualFormData(
  formData: FormData,
): Promise<{ file: ValidatedKeyVisual | null } | { error: string }> {
  const file = formData.get("keyVisual");
  if (file === null) return { file: null };
  if (!(file instanceof File)) {
    return { error: "File Key Visual tidak valid. Pilih file gambar kembali." };
  }
  if (!file.size) return { error: "File Key Visual tidak boleh kosong." };
  if (file.size > MAX_KEY_VISUAL_BYTES) {
    return { error: "Ukuran Key Visual maksimal 8 MB." };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { error: "File Key Visual tidak dapat dibaca. Pilih file lain." };
  }
  const validation = validateKeyVisual(file, bytes);
  if (!validation.success) return { error: validation.error };

  return {
    file: {
      bytes,
      contentType: validation.contentType,
      originalFilename: validation.originalFilename,
    },
  };
}

function keyVisualObjectKey(eventId: string, contentType: ValidatedKeyVisual["contentType"]) {
  return createEventKeyVisualObjectKey(eventId, contentType);
}

async function cleanUnreferencedKeyVisual(objectKey: string) {
  try {
    await deleteEventKeyVisualObject(objectKey);
  } catch {
    console.error("Could not clean up an unreferenced Key Visual object.");
  }
}

export async function createEvent(
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await assertAdminPermission(
    EVENT_PERMISSIONS.create,
    "/admin/events/new",
  );
  const result = validateEventForm(formData);
  if (!result.success) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  const validatedImage = await validateKeyVisualFormData(formData);
  if ("error" in validatedImage) return { error: validatedImage.error };

  const eventId = randomUUID();
  const objectKey = validatedImage.file
    ? keyVisualObjectKey(eventId, validatedImage.file.contentType)
    : null;
  let uploaded = false;
  if (validatedImage.file && objectKey) {
    try {
      await uploadEventKeyVisualObject({
        key: objectKey,
        bytes: validatedImage.file.bytes,
        contentType: validatedImage.file.contentType,
      });
      uploaded = true;
    } catch {
      await cleanUnreferencedKeyVisual(objectKey);
      return {
        error: "Upload Key Visual gagal. Event belum dibuat; periksa konfigurasi storage lalu coba kembali.",
      };
    }
  }

  let event: { id: string };
  try {
    event = await prisma.$transaction(async (transaction) => {
      const created = await transaction.event.create({
        data: {
          ...buildDraftEventData(result.data, session.id),
          id: eventId,
        },
        select: { id: true },
      });

      await transaction.eventStaffAssignment.create({
        data: {
          eventId: created.id,
          adminUserId: session.id,
          assignedByAdminUserId: session.id,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId: created.id,
          entityId: created.id,
          action: "event_created",
          entityType: "event",
          metadata: { initialStatus: "draft" },
        },
      });

      if (validatedImage.file && objectKey) {
        const keyVisual = await transaction.eventKeyVisual.create({
          data: {
            eventId: created.id,
            uploadedByAdminUserId: session.id,
            originalFilename: validatedImage.file.originalFilename,
            contentType: validatedImage.file.contentType,
            byteSize: BigInt(validatedImage.file.bytes.byteLength),
            objectKey,
            url: `/api/public/events/${result.data.slug}/key-visual`,
            isActive: true,
          },
          select: { id: true },
        });
        await transaction.auditLog.create({
          data: {
            actorAdminUserId: session.id,
            eventId: created.id,
            entityId: keyVisual.id,
            action: "event_key_visual_activated",
            entityType: "event_key_visual",
            metadata: {
              filename: validatedImage.file.originalFilename,
              contentType: validatedImage.file.contentType,
              byteSize: validatedImage.file.bytes.byteLength,
            },
          },
        });
      }

      return created;
    });

  } catch (error) {
    if (uploaded && objectKey) await cleanUnreferencedKeyVisual(objectKey);
    if (isUniqueConflict(error)) {
      if (isEventCodeConflict(error)) {
        const errorMessage = "Kode event sudah digunakan. Pilih kode yang berbeda.";
        return { error: errorMessage, fieldErrors: { eventCode: errorMessage } };
      }
      const errorMessage = "Slug ini sudah digunakan. Pilih slug yang berbeda.";
      return {
        error: errorMessage,
        fieldErrors: { slug: errorMessage },
      };
    }
    console.error("Event creation failed.");
    return { error: "Event belum berhasil disimpan. Periksa koneksi lalu coba lagi." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/admin/key-visual");
  revalidatePath("/event");
  revalidatePath(`/event/${result.data.slug}`);
  redirect(`/admin/events/${event.id}`);
}

export async function updateEvent(
  eventId: string,
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await assertAdminPermission(
    EVENT_PERMISSIONS.update,
    `/admin/events/${eventId}`,
    eventId,
  );
  const result = validateEventForm(formData);
  if (!result.success) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  const validatedImage = await validateKeyVisualFormData(formData);
  if ("error" in validatedImage) return { error: validatedImage.error };
  const removeKeyVisual = formData.get("removeKeyVisual") === "true";
  const objectKey = validatedImage.file
    ? keyVisualObjectKey(eventId, validatedImage.file.contentType)
    : null;
  let uploaded = false;
  if (validatedImage.file && objectKey) {
    try {
      await uploadEventKeyVisualObject({
        key: objectKey,
        bytes: validatedImage.file.bytes,
        contentType: validatedImage.file.contentType,
      });
      uploaded = true;
    } catch {
      await cleanUnreferencedKeyVisual(objectKey);
      return {
        error: "Upload Key Visual gagal. KV yang lama tetap digunakan; periksa konfigurasi storage lalu coba kembali.",
      };
    }
  }

  let removedObjectKey: string | null = null;
  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM events WHERE id = ${eventId}::uuid FOR UPDATE`,
      );
      const current = await transaction.event.findFirst({
        where: {
          id: eventId,
          eventAssignments: { some: { adminUserId: session.id } },
        },
        select: { status: true, eventCode: true },
      });
      if (!current) throw new Error("Event not found in your assigned scope.");
      if (current.status !== "draft") {
        throw new Error("Only draft events can be edited.");
      }
      if (current.eventCode && current.eventCode !== result.data.eventCode) {
        throw new EventCodeImmutableError("Event codes cannot be changed after creation.");
      }

      await transaction.event.update({
        where: { id: eventId },
        data: result.data,
      });

      await transaction.eventKeyVisual.updateMany({
        where: { eventId },
        data: { url: `/api/public/events/${result.data.slug}/key-visual` },
      });

      if (validatedImage.file && objectKey) {
        await transaction.eventKeyVisual.updateMany({
          where: {
            eventId,
            isActive: true,
            deletedAt: null,
          },
          data: { isActive: false },
        });
        const keyVisual = await transaction.eventKeyVisual.create({
          data: {
            eventId,
            uploadedByAdminUserId: session.id,
            originalFilename: validatedImage.file.originalFilename,
            contentType: validatedImage.file.contentType,
            byteSize: BigInt(validatedImage.file.bytes.byteLength),
            objectKey,
            url: `/api/public/events/${result.data.slug}/key-visual`,
            isActive: true,
          },
          select: { id: true },
        });
        await transaction.auditLog.create({
          data: {
            actorAdminUserId: session.id,
            eventId,
            entityId: keyVisual.id,
            action: "event_key_visual_activated",
            entityType: "event_key_visual",
            metadata: {
              filename: validatedImage.file.originalFilename,
              contentType: validatedImage.file.contentType,
              byteSize: validatedImage.file.bytes.byteLength,
            },
          },
        });
      } else if (removeKeyVisual) {
        const currentVisual = await transaction.eventKeyVisual.findFirst({
          where: { eventId, isActive: true, deletedAt: null },
          select: { id: true, objectKey: true },
        });
        if (currentVisual) {
          await transaction.eventKeyVisual.update({
            where: { id: currentVisual.id },
            data: { isActive: false, deletedAt: new Date() },
          });
          removedObjectKey = currentVisual.objectKey;
          await transaction.auditLog.create({
            data: {
              actorAdminUserId: session.id,
              eventId,
              entityId: currentVisual.id,
              action: "event_key_visual_deleted",
              entityType: "event_key_visual",
              metadata: { wasActive: true },
            },
          });
        }
      }

      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: eventId,
          action: "event_updated",
          entityType: "event",
          metadata: { fields: Object.keys(result.data) },
        },
      });
    });
  } catch (error) {
    if (uploaded && objectKey) await cleanUnreferencedKeyVisual(objectKey);
    if (error instanceof EventCodeImmutableError) {
      const errorMessage = "Kode event tidak dapat diubah setelah event dibuat.";
      return { error: errorMessage, fieldErrors: { eventCode: errorMessage } };
    }
    if (isUniqueConflict(error)) {
      if (isEventCodeConflict(error)) {
        const errorMessage = "Kode event sudah digunakan. Pilih kode yang berbeda.";
        return { error: errorMessage, fieldErrors: { eventCode: errorMessage } };
      }
      const errorMessage = "Slug ini sudah digunakan. Pilih slug yang berbeda.";
      return {
        error: errorMessage,
        fieldErrors: { slug: errorMessage },
      };
    }
    console.error("Event update failed.");
    return { error: "Perubahan belum berhasil disimpan. Periksa koneksi lalu coba lagi." };
  }

  let cleanupFailed = false;
  if (removedObjectKey) {
    try {
      await deleteEventKeyVisualObject(removedObjectKey);
    } catch {
      cleanupFailed = true;
      console.error("Removed Key Visual object could not be cleaned up.");
    }
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin/key-visual");
  revalidatePath(`/admin/events/${eventId}/key-visual`);
  redirect(
    `/admin/events/${eventId}?notice=updated${cleanupFailed ? "&kvCleanup=1" : ""}`,
  );
}

export async function transitionEventStatus(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const nextStatusValue = formData.get("status");
  if (typeof nextStatusValue !== "string" || !isEventStatus(nextStatusValue)) {
    throw new Error("Invalid event status.");
  }

  const permission = permissionForEventTransition(nextStatusValue);
  if (!permission) throw new Error("Transition to draft is not permitted.");
  const session = await assertAdminPermission(
    permission,
    `/admin/events/${eventId}`,
    eventId,
  );

  let publishRequirementsMissing: string[] = [];
  await prisma.$transaction(async (transaction) => {
    const current = await transaction.event.findFirst({
      where: {
        id: eventId,
        eventAssignments: { some: { adminUserId: session.id } },
      },
      select: {
        status: true,
        slug: true,
        name: true,
        description: true,
        startsAt: true,
        endsAt: true,
        timezone: true,
        venueName: true,
        venueAddress: true,
      },
    });
    if (!current) throw new Error("Event not found in your assigned scope.");
    if (!canTransitionEventStatus(current.status, nextStatusValue)) {
      throw new Error(`Event cannot transition from ${current.status} to ${nextStatusValue}.`);
    }
    if (nextStatusValue === "published") {
      publishRequirementsMissing = getMissingEventPublishFields(current);
      if (publishRequirementsMissing.length > 0) return;
    }

    const updated = await transaction.event.updateMany({
      where: {
        id: eventId,
        status: current.status,
        ...(nextStatusValue === "published"
          ? {
              slug: current.slug,
              name: current.name,
              description: current.description,
              startsAt: current.startsAt,
              endsAt: current.endsAt,
              timezone: current.timezone,
              venueName: current.venueName,
              venueAddress: current.venueAddress,
            }
          : {}),
      },
      data: { status: nextStatusValue },
    });
    if (updated.count !== 1) {
      throw new Error("Event status changed while this action was in progress.");
    }

    await transaction.auditLog.create({
      data: {
        actorAdminUserId: session.id,
        eventId,
        entityId: eventId,
        action: "event_status_changed",
        entityType: "event",
        metadata: { from: current.status, to: nextStatusValue },
      },
    });
  });

  if (publishRequirementsMissing.length > 0) {
    redirect(`/admin/events/${eventId}?notice=publish-incomplete`);
  }

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  if (nextStatusValue === "published") {
    redirect(`/admin/events/${eventId}?notice=published`);
  }
}

export async function assignEventStaff(
  eventId: string,
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await assertAdminPermission(
    EVENT_PERMISSIONS.manageStaff,
    `/admin/events/${eventId}/staff`,
    eventId,
  );
  const emailValue = formData.get("email");
  if (typeof emailValue !== "string") {
    const error = "Masukkan email administrator.";
    return { error, fieldErrors: { email: error } };
  }
  const email = emailValue.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = "Masukkan alamat email administrator yang valid.";
    return { error, fieldErrors: { email: error } };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const event = await transaction.event.findFirst({
        where: {
          id: eventId,
          eventAssignments: { some: { adminUserId: session.id } },
        },
        select: { id: true },
      });
      if (!event) throw new Error("Event not found in your assigned scope.");

      const target = await transaction.adminUser.findUnique({
        where: { email },
        select: { id: true, status: true },
      });
      if (!target || target.status !== "active") {
        throw new Error("NO_ACTIVE_ADMIN");
      }

      const assignment = await transaction.eventStaffAssignment.upsert({
        where: { eventId_adminUserId: { eventId, adminUserId: target.id } },
        create: {
          eventId,
          adminUserId: target.id,
          assignedByAdminUserId: session.id,
        },
        update: { assignedByAdminUserId: session.id },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: target.id,
          action: "event_staff_assigned",
          entityType: "event_staff_assignment",
          metadata: { assignedAt: assignment.assignedAt.toISOString() },
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NO_ACTIVE_ADMIN") {
      const message = "Tidak ada akun administrator aktif dengan email tersebut.";
      return { error: message, fieldErrors: { email: message } };
    }
    console.error("Event staff assignment failed.");
    return { error: "Staf belum berhasil ditambahkan. Periksa koneksi lalu coba lagi." };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { message: "Staf berhasil ditambahkan ke event." };
}

export async function removeEventStaff(
  eventId: string,
  formData: FormData,
): Promise<void> {
  const session = await assertAdminPermission(
    EVENT_PERMISSIONS.manageStaff,
    `/admin/events/${eventId}/staff`,
    eventId,
  );
  const adminUserId = formData.get("adminUserId");
  if (typeof adminUserId !== "string" || !UUID_PATTERN.test(adminUserId)) {
    throw new Error("Invalid administrator account identifier.");
  }

  await prisma.$transaction(async (transaction) => {
    const event = await transaction.event.findFirst({
      where: {
        id: eventId,
        eventAssignments: { some: { adminUserId: session.id } },
      },
      select: { id: true },
    });
    if (!event) throw new Error("Event not found in your assigned scope.");

    const removed = await transaction.eventStaffAssignment.deleteMany({
      where: { eventId, adminUserId },
    });
    if (removed.count !== 1) throw new Error("Staff assignment no longer exists.");

    await transaction.auditLog.create({
      data: {
        actorAdminUserId: session.id,
        eventId,
        entityId: adminUserId,
        action: "event_staff_removed",
        entityType: "event_staff_assignment",
        metadata: {},
      },
    });
  });

  revalidatePath(`/admin/events/${eventId}`);
}

export async function createTicketType(
  eventId: string,
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await assertAdminPermission(
    EVENT_PERMISSIONS.manageTickets,
    `/admin/events/${eventId}/tickets`,
    eventId,
  );
  const result = validateTicketTypeForm(formData);
  if (!result.success) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  try {
    await prisma.$transaction(async (transaction) => {
    const event = await transaction.event.findFirst({
      where: {
        id: eventId,
        eventAssignments: { some: { adminUserId: session.id } },
        status: { in: ["draft", "published"] },
      },
      select: { id: true },
    });
    if (!event) throw new Error("Tickets can only be managed on an assigned draft or published event.");

    const ticketType = await transaction.ticketType.create({
      data: {
        ...result.data,
        eventId,
        priceAmount: new Prisma.Decimal(result.data.priceAmount),
      },
      select: { id: true },
    });
    await transaction.auditLog.create({
      data: {
        actorAdminUserId: session.id,
        eventId,
        entityId: ticketType.id,
        action: "ticket_type_created",
        entityType: "ticket_type",
        metadata: { code: result.data.code },
      },
    });
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const message = "Kode tiket ini sudah digunakan pada event tersebut.";
      return { error: message, fieldErrors: { code: message } };
    }
    console.error("Ticket type creation failed.");
    return { error: "Jenis tiket belum berhasil disimpan. Periksa koneksi lalu coba lagi." };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { message: "Jenis tiket berhasil ditambahkan." };
}

export async function updateTicketType(
  eventId: string,
  ticketTypeId: string,
  _previousState: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const session = await assertAdminPermission(
    EVENT_PERMISSIONS.manageTickets,
    `/admin/events/${eventId}/tickets`,
    eventId,
  );
  if (!UUID_PATTERN.test(ticketTypeId)) return { error: "Invalid ticket type identifier." };
  const result = validateTicketTypeForm(formData);
  if (!result.success) {
    return { error: result.error, fieldErrors: result.fieldErrors };
  }

  try {
    await prisma.$transaction(async (transaction) => {
    const event = await transaction.event.findFirst({
      where: {
        id: eventId,
        eventAssignments: { some: { adminUserId: session.id } },
        status: { in: ["draft", "published"] },
      },
      select: { id: true },
    });
    if (!event) throw new Error("Tickets can only be managed on an assigned draft or published event.");

    const ticketType = await transaction.ticketType.findFirst({
      where: { id: ticketTypeId, eventId },
      select: { id: true },
    });
    if (!ticketType) throw new Error("Ticket type not found in this event.");
    const activeRegistrationCount = await transaction.registration.count({
      where: {
        ticketTypeId,
        status: { in: ["pending_payment", "payment_submitted", "confirmed"] },
      },
    });
    if (!isTicketCapacitySufficient(result.data.capacity, activeRegistrationCount)) {
      throw new Error("Capacity cannot be lower than the number of existing registrations.");
    }

    await transaction.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        ...result.data,
        priceAmount: new Prisma.Decimal(result.data.priceAmount),
      },
    });
    await transaction.auditLog.create({
      data: {
        actorAdminUserId: session.id,
        eventId,
        entityId: ticketTypeId,
        action: "ticket_type_updated",
        entityType: "ticket_type",
        metadata: { fields: Object.keys(result.data) },
      },
    });
    });
  } catch (error) {
    if (isUniqueConflict(error)) {
      const message = "Kode tiket ini sudah digunakan pada event tersebut.";
      return { error: message, fieldErrors: { code: message } };
    }
    if (error instanceof Error && error.message.includes("Capacity cannot be lower")) {
      const message = "Kapasitas tidak boleh lebih kecil dari jumlah pendaftaran yang sudah ada.";
      return { error: message, fieldErrors: { capacity: message } };
    }
    console.error("Ticket type update failed.");
    return { error: "Perubahan jenis tiket belum berhasil disimpan. Periksa koneksi lalu coba lagi." };
  }

  revalidatePath(`/admin/events/${eventId}`);
  return { message: "Perubahan jenis tiket berhasil disimpan." };
}
