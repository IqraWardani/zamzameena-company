import "server-only";

import { prisma } from "@/lib/db";

export type AdminDashboardSummary = {
  totalEvents: number;
  draftEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
};

export async function getAdminDashboardSummary(
  eventIds: string[],
): Promise<AdminDashboardSummary | null> {
  if (eventIds.length === 0) return null;

  const [eventStatusCounts, totalRegistrations] = await Promise.all([
    prisma.event.groupBy({
      by: ["status"],
      where: { id: { in: eventIds } },
      _count: { _all: true },
    }),
    prisma.registration.count({ where: { eventId: { in: eventIds } } }),
  ]);
  const countForStatus = (status: string) =>
    eventStatusCounts.find((row) => row.status === status)?._count._all ?? 0;

  return {
    totalEvents: eventStatusCounts.reduce(
      (total, row) => total + row._count._all,
      0,
    ),
    draftEvents: countForStatus("draft"),
    publishedEvents: countForStatus("published"),
    totalRegistrations,
  };
}
