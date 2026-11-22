import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";

export default async function AdminEventsPage() {
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.read,
    "/admin/events",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const events = await prisma.event.findMany({
    where: { eventAssignments: { some: { adminUserId: session.id } } },
    select: {
      id: true,
      slug: true,
      name: true,
      startsAt: true,
      timezone: true,
      status: true,
      keyVisuals: {
        where: { isActive: true, deletedAt: null },
        select: { url: true },
        take: 1,
      },
      _count: { select: { ticketTypes: true, registrations: true } },
    },
    orderBy: [{ startsAt: "desc" }, { name: "asc" }],
  });

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">ZAS EVENT ADMINISTRATION</p>
          <h1>Events</h1>
          <p>Showing only events assigned to your account.</p>
        </div>
        <div className="zas-admin-header-actions">
          {session.permissions.includes(EVENT_PERMISSIONS.create) && (
            <Link className="zas-admin-primary-link" href="/admin/events/new">Create event</Link>
          )}
          <form action={logout}>
            <button className="zas-admin-logout" type="submit">Sign out</button>
          </form>
        </div>
      </header>

      <AdminSharedDashboard session={session} />

      {events.length === 0 ? (
        <section className="zas-admin-card">
          <h2>No assigned events</h2>
          <p>Events appear here after an authorized administrator assigns them to your account.</p>
        </section>
      ) : (
        <div className={`zas-admin-table-wrap${events.length > 10 ? " zas-data-list-scroll" : ""}`}>
          <table className="zas-admin-table">
            <thead>
              <tr>
                <th scope="col">Event</th>
                <th scope="col">Starts</th>
                <th scope="col">Status</th>
                <th scope="col">Ticket types</th>
                <th scope="col">Registrations</th>
                <th scope="col"><span className="zas-admin-visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="zas-admin-event-summary">
                      {event.keyVisuals[0] &&
                      (event.status === "published" ||
                        session.permissions.includes(EVENT_PERMISSIONS.update)) ? (
                        <Image
                          alt={`Key Visual ${event.name}`}
                          className="zas-admin-event-thumbnail"
                          height={48}
                          src={session.permissions.includes(EVENT_PERMISSIONS.update)
                            ? `/admin/events/${event.id}/key-visual/image`
                            : event.keyVisuals[0].url}
                          unoptimized
                          width={80}
                        />
                      ) : (
                        <span
                          aria-label={event.keyVisuals[0]
                            ? `Pratinjau Key Visual ${event.name} tidak tersedia untuk akun ini`
                            : `Belum ada Key Visual untuk ${event.name}`}
                          className="zas-admin-event-thumbnail is-empty"
                        >
                          {event.keyVisuals[0] ? "Preview" : "No KV"}
                        </span>
                      )}
                      <span>
                        <strong>{event.name}</strong>
                        <span className="zas-admin-table-secondary">/{event.slug}</span>
                      </span>
                    </div>
                  </td>
                  <td>{event.startsAt.toLocaleString("en", { timeZone: event.timezone })}</td>
                  <td><span className={`zas-admin-status is-${event.status}`}>{event.status}</span></td>
                  <td>{event._count.ticketTypes}</td>
                  <td>{event._count.registrations}</td>
                  <td>
                    <Link className="zas-admin-text-link" href={`/admin/events/${event.id}`}>Open</Link>
                    {session.permissions.includes(EVENT_PERMISSIONS.update) && (
                      <>
                        {" · "}
                        {event.status === "draft" ? (
                          <Link
                            className="zas-admin-text-link"
                            href={`/admin/events/${event.id}/edit`}
                          >
                            Edit
                          </Link>
                        ) : (
                          <button
                            aria-label={`Edit ${event.name} (available for draft events only)`}
                            className="zas-admin-text-link zas-admin-disabled-action"
                            disabled
                            title="Only draft events can be edited."
                            type="button"
                          >
                            Edit
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
