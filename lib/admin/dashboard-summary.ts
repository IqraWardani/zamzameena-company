import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/db";

export type AdminDashboardSummary = {
  totalEvents: number;
  draftEvents: number;
  publishedEvents: number;
  totalRegistrations: number;
};

// In-memory cache with 30-second TTL to make dashboard summary instantaneous
const summaryCache = new Map<
  string,
  { data: AdminDashboardSummary; timestamp: number }
>();
const CACHE_TTL_MS = 30000;

export const getAdminDashboardSummary = cache(
  async function (eventIds: string[]): Promise<AdminDashboardSummary | null> {
    if (eventIds.length === 0) return null;

    const cacheKey = eventIds.slice().sort().join(",");
    const cached = summaryCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

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

    const data: AdminDashboardSummary = {
      totalEvents: eventStatusCounts.reduce(
        (total, row) => total + row._count._all,
        0,
      ),
      draftEvents: countForStatus("draft"),
      publishedEvents: countForStatus("published"),
      totalRegistrations,
    };

    summaryCache.set(cacheKey, { data, timestamp: now });
    return data;
  },
);
