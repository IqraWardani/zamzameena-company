import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { KeyVisualManagement } from "@/components/admin/key-visual-management";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { prisma } from "@/lib/db";

type EventKeyVisualPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventKeyVisualPage({ params }: EventKeyVisualPageProps) {
  const { eventId } = await params;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.update,
    `/admin/events/${eventId}/key-visual`,
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      eventAssignments: { some: { adminUserId: session.id } },
    },
    select: { id: true, name: true, slug: true },
  });
  if (!event) notFound();

  const visuals = await prisma.eventKeyVisual.findMany({
    where: { eventId: event.id },
    select: {
      id: true,
      originalFilename: true,
      contentType: true,
      byteSize: true,
      url: true,
      isActive: true,
      createdAt: true,
      deletedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const items = visuals.map((item) => ({
    ...item,
    byteSize: Number(item.byteSize),
    url: `/admin/events/${event.id}/key-visual/image`,
    createdAt: item.createdAt.toISOString(),
    deletedAt: item.deletedAt?.toISOString() ?? null,
  }));
  const activeVisual = items.find((item) => item.isActive && !item.deletedAt) ?? null;

  return (
    <main className="zas-admin-page zas-key-visual-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT ASSET MANAGEMENT</p>
          <h1>Key Visual Management</h1>
          <div className="zas-key-visual-event-context">
            <span>{event.name}</span>
            <code>/{event.slug}</code>
          </div>
        </div>
        <div className="zas-admin-header-actions">
          <Link className="zas-admin-text-link" href={`/admin/events/${event.id}`}>
            Kembali ke Kelola Event
          </Link>
        </div>
      </header>
      <AdminSharedDashboard session={session} />
      <KeyVisualManagement
        activeVisual={activeVisual}
        eventId={event.id}
        history={items}
      />
    </main>
  );
}
