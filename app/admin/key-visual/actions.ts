"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
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

export type KeyVisualActionState = {
  error?: string;
  message?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authorizeEventKeyVisual(eventId: string) {
  if (!UUID_PATTERN.test(eventId)) {
    return { error: "Event tidak ditemukan." } as const;
  }
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.update,
    `/admin/events/${eventId}/key-visual`,
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      eventAssignments: { some: { adminUserId: session.id } },
    },
    select: { id: true, slug: true },
  });
  if (!event) return { error: "Event tidak ditemukan dalam daftar Event yang ditugaskan kepada Anda." } as const;

  return { event, session } as const;
}

function revalidateKeyVisualViews(eventId: string, eventSlug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/key-visual");
  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}/key-visual`);
  revalidatePath("/event");
  revalidatePath(`/event/${eventSlug}`);
}

function logKeyVisualFailure(stage: "storage" | "database", error: unknown) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const details = error && typeof error === "object" ? error : null;
  const errorCode = details
    ? Reflect.get(details, "Code") ?? Reflect.get(details, "code")
    : null;
  const metadata = details ? Reflect.get(details, "$metadata") : null;
  const statusCode = metadata && typeof metadata === "object"
    ? Reflect.get(metadata, "httpStatusCode")
    : null;

  console.error(`Key Visual ${stage} operation failed.`, {
    errorName,
    errorCode: typeof errorCode === "string" ? errorCode : undefined,
    statusCode: typeof statusCode === "number" ? statusCode : undefined,
  });
}

export async function uploadEventKeyVisual(
  eventId: string,
  formData: FormData,
): Promise<KeyVisualActionState> {
  const authorized = await authorizeEventKeyVisual(eventId);
  if ("error" in authorized) return { error: authorized.error };

  const file = formData.get("keyVisual");
  const originalFilename = formData.get("keyVisualFilename");
  if (!(file instanceof File) || !file.size) {
    return { error: "Pilih file PNG, JPG, atau WEBP terlebih dahulu." };
  }
  if (typeof originalFilename !== "string" || !originalFilename.trim()) {
    return { error: "Nama file Key Visual tidak tersedia. Pilih file kembali." };
  }
  if (file.size > MAX_KEY_VISUAL_BYTES) {
    return { error: "Ukuran file maksimal 8 MB." };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { error: "File tidak dapat dibaca. Pilih file lain dan coba kembali." };
  }
  const validation = validateKeyVisual(file, bytes, originalFilename);
  if (!validation.success) return { error: validation.error };

  const objectKey = createEventKeyVisualObjectKey(
    authorized.event.id,
    validation.contentType,
  );

  try {
    await uploadEventKeyVisualObject({
      key: objectKey,
      bytes,
      contentType: validation.contentType,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("Supabase Key Visual storage is not fully configured:")
    ) {
      console.error("Key Visual upload blocked: Supabase Storage configuration is incomplete.");
      return {
        error: "Supabase Storage belum dikonfigurasi. Periksa SUPABASE_URL, SUPABASE_SECRET_KEY, dan SUPABASE_STORAGE_BUCKET di .env.local, lalu restart server.",
      };
    }

    logKeyVisualFailure("storage", error);
    return {
      error: "File belum berhasil diunggah ke storage. Key Visual sebelumnya tetap aktif; periksa konfigurasi dan akses storage.",
    };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.eventKeyVisual.updateMany({
        where: {
          eventId: authorized.event.id,
          isActive: true,
          deletedAt: null,
        },
        data: { isActive: false },
      });
      const created = await transaction.eventKeyVisual.create({
        data: {
          eventId: authorized.event.id,
          uploadedByAdminUserId: authorized.session.id,
          originalFilename: validation.originalFilename,
          contentType: validation.contentType,
          byteSize: BigInt(bytes.byteLength),
          objectKey,
          url: `/api/public/events/${authorized.event.slug}/key-visual`,
          isActive: true,
        },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: authorized.session.id,
          eventId: authorized.event.id,
          entityId: created.id,
          entityType: "event_key_visual",
          action: "event_key_visual_activated",
          metadata: {
            filename: validation.originalFilename,
            contentType: validation.contentType,
            byteSize: bytes.byteLength,
          },
        },
      });
    });
  } catch (error) {
    try {
      await deleteEventKeyVisualObject(objectKey);
    } catch {
      console.error("Could not clean up a Key Visual object after database failure.");
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logKeyVisualFailure("database", error);
      return {
        error: "Key Visual belum berhasil disimpan. KV sebelumnya tetap aktif; coba kembali.",
      };
    }
    logKeyVisualFailure("database", error);
    return {
      error: "File sudah diunggah, tetapi belum berhasil diaktifkan. Key Visual sebelumnya tetap aktif; coba kembali.",
    };
  }

  revalidateKeyVisualViews(authorized.event.id, authorized.event.slug);
  return { message: "Key Visual berhasil diunggah dan diaktifkan." };
}

export async function deleteEventKeyVisual(
  eventId: string,
  keyVisualId: string,
): Promise<KeyVisualActionState> {
  const authorized = await authorizeEventKeyVisual(eventId);
  if ("error" in authorized) return { error: authorized.error };
  if (!UUID_PATTERN.test(keyVisualId)) {
    return { error: "Key Visual tidak ditemukan." };
  }

  const visual = await prisma.eventKeyVisual.findFirst({
    where: {
      id: keyVisualId,
      eventId: authorized.event.id,
      deletedAt: null,
    },
    select: { id: true, objectKey: true, isActive: true },
  });
  if (!visual) return { error: "Key Visual tidak ditemukan." };

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.eventKeyVisual.update({
        where: { id: visual.id },
        data: { isActive: false, deletedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: authorized.session.id,
          eventId: authorized.event.id,
          entityId: visual.id,
          entityType: "event_key_visual",
          action: "event_key_visual_deleted",
          metadata: { wasActive: visual.isActive },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Key Visual deletion database operation failed.");
      return { error: "Key Visual belum berhasil dihapus. Silakan coba kembali." };
    }
    throw error;
  }

  let cleanupWarning: string | undefined;
  try {
    await deleteEventKeyVisualObject(visual.objectKey);
  } catch {
    console.error("Deleted Key Visual object could not be removed from storage.");
    cleanupWarning =
      "Metadata Key Visual sudah dihapus, tetapi file di object storage belum berhasil dibersihkan.";
  }

  revalidateKeyVisualViews(authorized.event.id, authorized.event.slug);
  return cleanupWarning
    ? { message: "Key Visual berhasil dihapus dari website.", error: cleanupWarning }
    : { message: "Key Visual berhasil dihapus." };
}
