import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type AdminAuditInput = {
  action: string;
  entityType: string;
  actorAdminUserId?: string;
  entityId?: string;
  eventId?: string;
  metadata?: Prisma.InputJsonObject;
};

function isNextSignal(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE")
  );
}

export async function logAdminAudit(input: AdminAuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        actorAdminUserId: input.actorAdminUserId,
        entityId: input.entityId,
        eventId: input.eventId,
        metadata: input.metadata ?? {},
      },
    });
  } catch (error) {
    if (isNextSignal(error)) throw error;
    console.error("Failed to write admin audit log:", error);
  }
}
