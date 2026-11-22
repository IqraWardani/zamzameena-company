export type AdminPrincipal = {
  id: string;
  permissions: readonly string[];
  eventIds: readonly string[];
  roleCodes?: readonly string[];
};

export type AuthorizationDecision =
  | { allowed: true }
  | { allowed: false; reason: "unauthenticated" | "permission_denied" | "event_scope_denied" };

export function authorizeAdmin(
  principal: AdminPrincipal | null,
  permissionCode: string,
  eventId?: string,
): AuthorizationDecision {
  if (!principal) return { allowed: false, reason: "unauthenticated" };
  if (!principal.permissions.includes(permissionCode)) {
    return { allowed: false, reason: "permission_denied" };
  }
  if (
    permissionCode === "sales.manage" &&
    principal.roleCodes?.includes("marketing_director")
  ) {
    return { allowed: false, reason: "permission_denied" };
  }
  if (eventId && !principal.eventIds.includes(eventId)) {
    return { allowed: false, reason: "event_scope_denied" };
  }

  return { allowed: true };
}
