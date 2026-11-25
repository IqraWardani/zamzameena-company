import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { authorizeAdmin, type AdminPrincipal, type AuthorizationDecision } from "@/lib/admin/access-policy";
import { logAdminAudit } from "@/lib/admin/audit";
import { adminSessionCookie, readAdminSessionToken } from "@/lib/admin/session";

export type AdminSession = AdminPrincipal & {
  email: string;
  fullName: string;
};

function isNextSignal(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_") || digest === "DYNAMIC_SERVER_USAGE")
  );
}

export async function getAdminSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(adminSessionCookie.name)?.value;
    if (!token) return null;

    const claims = await readAdminSessionToken(token);
    if (!claims) return null;

    const adminUser = await prisma.adminUser.findUnique({
      where: { id: claims.adminUserId },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        userRoles: {
          select: {
            role: {
              select: {
                code: true,
                permissions: {
                  select: {
                    permission: { select: { code: true } },
                  },
                },
              },
            },
          },
        },
        eventAssignments: { select: { eventId: true } },
      },
    });

    if (!adminUser || adminUser.status !== "active") return null;

    const permissions = new Set<string>();
    const roleCodes = new Set<string>();
    for (const assignment of adminUser.userRoles) {
      roleCodes.add(assignment.role.code);
      for (const rolePermission of assignment.role.permissions) {
        permissions.add(rolePermission.permission.code);
      }
    }

    return {
      id: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.fullName,
      permissions: [...permissions],
      eventIds: adminUser.eventAssignments.map((assignment) => assignment.eventId),
      roleCodes: [...roleCodes],
    };
  } catch (error) {
    if (isNextSignal(error)) throw error;
    console.error("Failed to retrieve admin session:", error);
    return null;
  }
}

export async function requireAdminPermission(
  permissionCode: string,
  routeLabel: string,
  eventId?: string,
): Promise<{ session: AdminSession | null; decision: AuthorizationDecision }> {
  const session = await getAdminSession();
  const decision = authorizeAdmin(session, permissionCode, eventId);

  if (session && !decision.allowed) {
    await logAdminAudit({
      action: "access_denied",
      entityType: "admin_route",
      actorAdminUserId: session.id,
      eventId,
      metadata: {
        route: routeLabel,
        permission: permissionCode,
        reason: decision.reason,
      },
    });
  }

  return { session, decision };
}
