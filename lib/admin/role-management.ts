import "server-only";

import { prisma } from "@/lib/db";
import { authorizeAdmin } from "@/lib/admin/access-policy";
import { logAdminAudit } from "@/lib/admin/audit";
import type { AdminSession } from "@/lib/admin/authorization";

async function assertCanManageRoles(actor: AdminSession) {
  const decision = authorizeAdmin(actor, "admin.roles.manage");
  if (!decision.allowed) {
    await logAdminAudit({
      action: "access_denied",
      entityType: "admin_user_role",
      actorAdminUserId: actor.id,
      metadata: { permission: "admin.roles.manage", reason: decision.reason },
    });
    throw new Error("The current administrator is not allowed to manage roles.");
  }
}

export async function assignRoleToAdmin(
  actor: AdminSession,
  adminUserId: string,
  roleId: string,
): Promise<void> {
  await assertCanManageRoles(actor);

  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.adminUserRole.findUnique({
      where: { adminUserId_roleId: { adminUserId, roleId } },
    });
    if (existing) return;

    await transaction.adminUserRole.create({
      data: {
        adminUserId,
        roleId,
        assignedByAdminUserId: actor.id,
      },
    });
    await transaction.auditLog.create({
      data: {
        actorAdminUserId: actor.id,
        action: "role_assigned",
        entityType: "admin_user_role",
        entityId: adminUserId,
        metadata: { roleId },
      },
    });
  });
}

export async function removeRoleFromAdmin(
  actor: AdminSession,
  adminUserId: string,
  roleId: string,
): Promise<void> {
  await assertCanManageRoles(actor);

  await prisma.$transaction(async (transaction) => {
    const removed = await transaction.adminUserRole.deleteMany({
      where: { adminUserId, roleId },
    });
    if (removed.count === 0) return;

    await transaction.auditLog.create({
      data: {
        actorAdminUserId: actor.id,
        action: "role_removed",
        entityType: "admin_user_role",
        entityId: adminUserId,
        metadata: { roleId },
      },
    });
  });
}
