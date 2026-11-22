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

export async function logAdminAudit(input: AdminAuditInput): Promise<void> {
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
}
