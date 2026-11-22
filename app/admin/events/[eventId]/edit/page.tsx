import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateEvent } from "@/app/admin/events/actions";
import { EventWizard } from "@/components/admin/event-create-wizard";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";

type EditEventPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EditAdminEventPage({ params }: EditEventPageProps) {
  const { eventId } = await params;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.update,
    `/admin/events/${eventId}/edit`,
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      eventAssignments: { some: { adminUserId: session.id } },
    },
    include: {
      keyVisuals: {
        where: { isActive: true, deletedAt: null },
        select: { url: true, originalFilename: true },
        take: 1,
      },
    },
  });
  if (!event) notFound();
  if (event.status !== "draft") redirect(`/admin/events/${eventId}`);

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT MANAGEMENT</p>
          <h1>Edit event</h1>
          <p>
            <strong>{event.name}</strong>
            {" · "}/{event.slug}
            {" · "}Draft · ID {event.id}
          </p>
        </div>
        <Link className="zas-admin-text-link" href={`/admin/events/${event.id}`}>Back to event</Link>
      </header>
      <AdminSharedDashboard session={session} />
      <section className="zas-admin-card zas-admin-wide-card">
        <EventWizard
          action={updateEvent.bind(null, event.id)}
          values={event}
          keyVisual={event.keyVisuals[0]
            ? {
                ...event.keyVisuals[0],
                url: `/admin/events/${event.id}/key-visual/image`,
              }
            : null}
          mode="edit"
          cancelHref={`/admin/events/${event.id}`}
        />
      </section>
    </main>
  );
}
