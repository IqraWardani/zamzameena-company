import { AdminNavigation } from "@/components/admin/admin-navigation";
import {
  AdminSummaryCards,
  type AdminSummaryMetric,
} from "@/components/admin/admin-summary-cards";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import type { AdminSession } from "@/lib/admin/authorization";
import {
  getAdminDashboardSummary,
  type AdminDashboardSummary,
} from "@/lib/admin/dashboard-summary";
import { getAdminNavigationItems } from "@/lib/admin/navigation-items";

export async function AdminSharedDashboard({
  session,
  summary: providedSummary,
  additionalMetrics = [],
  ariaLabel = "Ringkasan Event",
  summaryClassName = "",
  showSummary = false,
}: {
  session: AdminSession;
  summary?: AdminDashboardSummary | null;
  additionalMetrics?: AdminSummaryMetric[];
  ariaLabel?: string;
  summaryClassName?: string;
  showSummary?: boolean;
}) {
  const canReadEvents = session.permissions.includes(EVENT_PERMISSIONS.read);
  const eventIds = [...session.eventIds];
  const summary =
    providedSummary === undefined && showSummary && canReadEvents
      ? await getAdminDashboardSummary(eventIds)
      : providedSummary;

  const metrics: AdminSummaryMetric[] = [
    {
      label: "Total Event",
      value: summary?.totalEvents ?? null,
      description: "Event dalam penugasan Anda",
      icon: "events",
      tone: "events",
    },
    {
      label: "Draft",
      value: summary?.draftEvents ?? null,
      description: "Event yang masih disiapkan",
      icon: "draft",
      tone: "draft",
    },
    {
      label: "Published",
      value: summary?.publishedEvents ?? null,
      description: "Event yang sudah tayang",
      icon: "published",
      tone: "published",
    },
    {
      label: "Pendaftaran",
      value: summary?.totalRegistrations ?? null,
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
