import { AdminNavigation } from "@/components/admin/admin-navigation";
import {
  AdminSummaryCards,
  type AdminSummaryMetric,
} from "@/components/admin/admin-summary-cards";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import type { AdminSession } from "@/lib/admin/authorization";
import { getAdminNavigationItems } from "@/lib/admin/navigation-items";
import { prisma } from "@/lib/db";

export async function AdminSharedDashboard({
  session,
  additionalMetrics = [],
  ariaLabel = "Ringkasan Event",
  summaryClassName = "",
  showSummary = true,
}: {
  session: AdminSession;
  additionalMetrics?: AdminSummaryMetric[];
  ariaLabel?: string;
  summaryClassName?: string;
  showSummary?: boolean;
}) {
  const canReadEvents = session.permissions.includes(EVENT_PERMISSIONS.read);
  const eventIds = [...session.eventIds];
  const [totalEvents, draftEvents, publishedEvents, totalRegistrations] =
    showSummary && canReadEvents && eventIds.length > 0
      ? await Promise.all([
          prisma.event.count({ where: { id: { in: eventIds } } }),
          prisma.event.count({ where: { id: { in: eventIds }, status: "draft" } }),
          prisma.event.count({ where: { id: { in: eventIds }, status: "published" } }),
          prisma.registration.count({ where: { eventId: { in: eventIds } } }),
        ])
      : [null, null, null, null];
  const metrics: AdminSummaryMetric[] = [
    {
      label: "Total Event",
      value: totalEvents,
      description: "Event dalam penugasan Anda",
      icon: "events",
      tone: "events",
    },
    {
      label: "Draft",
      value: draftEvents,
      description: "Event yang masih disiapkan",
      icon: "draft",
      tone: "draft",
    },
    {
      label: "Published",
      value: publishedEvents,
      description: "Event yang sudah tayang",
      icon: "published",
      tone: "published",
    },
    {
      label: "Pendaftaran",
      value: totalRegistrations,
      description: "Seluruh status pendaftaran",
      icon: "registrations",
      tone: "registrations",
    },
    ...additionalMetrics,
  ];

  return (
    <div className="zas-admin-shared-header">
      <AdminNavigation items={getAdminNavigationItems(session)} />
      {showSummary && (
        <AdminSummaryCards
          ariaLabel={ariaLabel}
          className={summaryClassName}
          metrics={metrics}
        />
      )}
    </div>
  );
}
