import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { prisma } from "@/lib/db";

export default async function AdminKeyVisualEventsPage() {
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.update,
    "/admin/key-visual",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const events = await prisma.event.findMany({
    where: {
      eventAssignments: { some: { adminUserId: session.id } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      keyVisuals: {
        where: { isActive: true, deletedAt: null },
        select: { originalFilename: true },
        take: 1,
      },
    },
    orderBy: [{ startsAt: "desc" }, { name: "asc" }],
  });

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT ASSET MANAGEMENT</p>
          <h1>Key Visual Management</h1>
          <p>Pilih Event yang ditugaskan kepada Anda untuk mengelola Key Visual.</p>
        </div>
        <Link className="zas-admin-text-link" href="/admin/events">
          Kembali ke Daftar Event
        </Link>
      </header>

      <AdminSharedDashboard session={session} />

      {events.length === 0 ? (
        <section className="zas-admin-card">
          <h2>Belum ada Event yang ditugaskan</h2>
          <p>Event yang dapat Anda kelola akan muncul di halaman ini.</p>
        </section>
      ) : (
        <section className="zas-admin-card zas-admin-wide-card">
          <div className="zas-admin-recent-list">
            {events.map((event) => (
              <article className="zas-admin-recent-event" key={event.id}>
                <div>
                  <h2>{event.name}</h2>
                  <p>/{event.slug} · {event.status}</p>
                  <p>{event.keyVisuals[0]?.originalFilename ?? "Belum ada Key Visual aktif"}</p>
                </div>
                <Link
                  className="zas-admin-small-button"
                  href={`/admin/events/${event.id}/key-visual`}
                >
                  Kelola Key Visual
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
