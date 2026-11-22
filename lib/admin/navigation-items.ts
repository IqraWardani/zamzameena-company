import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import type { AdminSession } from "@/lib/admin/authorization";

export type AdminNavigationItem = {
  permission: string;
  href: string;
  label: string;
};

export function getAdminNavigationItems(
  session: AdminSession,
): AdminNavigationItem[] {
  const canManageKeyVisuals =
    session.permissions.includes(EVENT_PERMISSIONS.update) &&
    session.eventIds.length > 0;

  return [
    { permission: EVENT_PERMISSIONS.read, href: "/admin/events", label: "Daftar Event" },
    { permission: "sales.read", href: "/admin/sales", label: "Manajemen Penjual" },
    { permission: EVENT_PERMISSIONS.reviewPayments, href: "/admin/payments", label: "Verifikasi Pembayaran" },
    { permission: EVENT_PERMISSIONS.collectInvitations, href: "/admin/invitations", label: "Pengambilan Undangan" },
    { permission: EVENT_PERMISSIONS.recordCheckIns, href: "/admin/check-in", label: "Check-in" },
    { permission: EVENT_PERMISSIONS.manageContacts, href: "/admin/contacts", label: "Kontak" },
    ...(canManageKeyVisuals
      ? [{
          permission: EVENT_PERMISSIONS.update,
          href: "/admin/key-visual",
          label: "Key Visual Management",
        }]
      : []),
  ].filter((item) => session.permissions.includes(item.permission));
}
