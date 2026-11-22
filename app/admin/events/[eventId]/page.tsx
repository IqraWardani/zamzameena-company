import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  assignEventStaff,
  createTicketType,
  removeEventStaff,
  transitionEventStatus,
  updateTicketType,
} from "@/app/admin/events/actions";
import { AssignStaffForm, CreateTicketTypeForm, EditTicketTypeForm, RemoveStaffForm } from "@/components/admin/event-forms";
import { AdminPendingButton } from "@/components/admin/use-preserved-action-state";
import { AdminSuccessPopup } from "@/components/admin/admin-success-popup";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import {
  availableEventTransitions,
  EVENT_PERMISSIONS,
  type EventStatus,
  getMissingEventPublishFields,
  permissionForEventTransition,
} from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";

type EventDetailPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ notice?: string; kvCleanup?: string }>;
};

const transitionLabels: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Publikasikan Event",
  closed: "Tutup Pendaftaran",
  cancelled: "Batalkan Event",
  archived: "Arsipkan Event",
};

const eventStatusLabels: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Ditutup",
  cancelled: "Dibatalkan",
  archived: "Diarsipkan",
};

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: EventDetailPageProps) {
  const [{ eventId }, query] = await Promise.all([params, searchParams]);
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.read,
    `/admin/events/${eventId}`,
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
      eventAssignments: {
        include: {
          adminUser: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { assignedAt: "asc" },
      },
      ticketTypes: {
        include: { _count: { select: { registrations: true } } },
        orderBy: { createdAt: "asc" },
      },
      keyVisuals: {
        where: { isActive: true, deletedAt: null },
        select: { url: true, originalFilename: true },
        take: 1,
      },
      _count: { select: { registrations: true } },
    },
  });
  if (!event) notFound();

  const missingPublishFields = getMissingEventPublishFields(event);
  const canEdit = event.status === "draft" &&
    session.permissions.includes(EVENT_PERMISSIONS.update);
  const canManageStaff = session.permissions.includes(EVENT_PERMISSIONS.manageStaff);
  const canManageTickets =
    ["draft", "published"].includes(event.status) &&
    session.permissions.includes(EVENT_PERMISSIONS.manageTickets);

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT MANAGEMENT</p>
          <h1>{event.name}</h1>
          <p>
            <span className={`zas-admin-status is-${event.status}`}>{eventStatusLabels[event.status]}</span>
            {" · "}{event.slug}
          </p>
        </div>
        <div className="zas-admin-header-actions">
          <Link className="zas-admin-text-link" href="/admin/events">Kembali ke Daftar Event</Link>
          {canEdit && <Link className="zas-admin-primary-link" href={`/admin/events/${event.id}/edit`}>Edit Event</Link>}
          {session.permissions.includes(EVENT_PERMISSIONS.update) && (
            <Link className="zas-admin-text-link" href={`/admin/events/${event.id}/key-visual`}>
              Kelola Key Visual
            </Link>
          )}
        </div>
      </header>

      <AdminSharedDashboard session={session} />

      <section className="zas-admin-card zas-admin-wide-card">
        <h2>Detail Event</h2>
        {query.notice === "published" && (
          <AdminSuccessPopup message="Event berhasil dipublikasikan." />
        )}
        {query.notice === "updated" && (
          <AdminSuccessPopup message="Event berhasil diperbarui." />
        )}
        {query.notice === "updated" && query.kvCleanup === "1" && (
          <p className="zas-admin-publish-hint" role="status">
            Event berhasil diperbarui dan Key Visual sudah dilepas dari website, tetapi file lama belum berhasil dibersihkan dari storage.
          </p>
        )}
        {query.notice === "publish-incomplete" && (
          <p className="zas-admin-publish-hint" role="alert">
            Event belum dapat dipublikasikan. Lengkapi semua informasi wajib terlebih dahulu.
          </p>
        )}
        {event.description && <p>{event.description}</p>}
        {event.status === "draft" && missingPublishFields.length > 0 && (
          <p className="zas-admin-publish-hint">
            Lengkapi {missingPublishFields.join(", ")} sebelum event dapat dipublikasikan.
          </p>
        )}
        <dl className="zas-admin-details">
          <div><dt>Mulai</dt><dd>{event.startsAt.toLocaleString("id-ID", { timeZone: event.timezone })}</dd></div>
          <div><dt>Selesai</dt><dd>{event.endsAt.toLocaleString("id-ID", { timeZone: event.timezone })}</dd></div>
          <div><dt>Timezone</dt><dd>{event.timezone}</dd></div>
          <div><dt>Nama Venue</dt><dd>{event.venueName || "Belum diisi"}</dd></div>
          <div><dt>Alamat Venue</dt><dd>{event.venueAddress || "Belum diisi"}</dd></div>
          <div><dt>Pendaftaran</dt><dd>
            {event.registrationOpensAt?.toLocaleString("id-ID", { timeZone: event.timezone }) ?? "Kapan saja"}
            {" — "}
            {event.registrationClosesAt?.toLocaleString("id-ID", { timeZone: event.timezone }) ?? "Tanpa batas waktu"}
          </dd></div>
          <div><dt>Jumlah Pendaftaran</dt><dd>{event._count.registrations}</dd></div>
        </dl>

        {availableEventTransitions(event.status).length > 0 && (
          <div className="zas-admin-transition-actions" aria-label="Event status actions">
            {availableEventTransitions(event.status).map((nextStatus) => {
              const permission = permissionForEventTransition(nextStatus);
              if (!permission || !session.permissions.includes(permission)) return null;
              if (nextStatus === "published" && missingPublishFields.length > 0) return null;
              return (
                <form action={transitionEventStatus.bind(null, event.id)} key={nextStatus}>
                  <input type="hidden" name="status" value={nextStatus} />
                  <AdminPendingButton
                    className={nextStatus === "cancelled" ? "zas-admin-danger-button" : "zas-admin-small-button"}
                    pendingLabel="Menyimpan..."
                  >
                    {transitionLabels[nextStatus]}
                  </AdminPendingButton>
                </form>
              );
            })}
          </div>
        )}
      </section>

      <section className="zas-admin-card zas-admin-wide-card">
        <h2>Jenis Tiket</h2>
        {event.ticketTypes.length === 0 ? (
          <p>Belum ada jenis tiket. Tambahkan tiket setelah draft event tersimpan.</p>
        ) : (
          <div className={`zas-admin-ticket-list${event.ticketTypes.length > 10 ? " zas-data-list-scroll" : ""}`}>
            {event.ticketTypes.map((ticket) => {
              const editAction = updateTicketType.bind(null, event.id, ticket.id);
              return (
                <article className="zas-admin-ticket-item" key={ticket.id}>
                  <div className="zas-admin-ticket-summary">
                    <div>
                      <h3>{ticket.name}</h3>
                      <p>{ticket.code} · {ticket.priceAmount.toFixed(2)} {ticket.currency} · {ticket.isActive ? "Aktif" : "Nonaktif"}</p>
                      <p>{ticket._count.registrations} pendaftaran · kapasitas {ticket.capacity ?? "tanpa batas"}</p>
                    </div>
                  </div>
                  {canManageTickets && (
                    <EditTicketTypeForm
                      action={editAction}
                      values={{
                        id: ticket.id,
                        code: ticket.code,
                        name: ticket.name,
                        description: ticket.description,
                        priceAmount: ticket.priceAmount.toFixed(2),
                        currency: ticket.currency.trim(),
                        capacity: ticket.capacity,
                        salesOpensAt: ticket.salesOpensAt,
                        salesClosesAt: ticket.salesClosesAt,
                        isActive: ticket.isActive,
                      }}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
        {canManageTickets && (
          <div className="zas-admin-ticket-create">
            <h3>Tambah Jenis Tiket</h3>
            <CreateTicketTypeForm action={createTicketType.bind(null, event.id)} />
          </div>
        )}
      </section>

      <section className="zas-admin-card zas-admin-wide-card">
        <h2>Event staff</h2>
        <ul className="zas-admin-staff-list">
          {event.eventAssignments.map(({ adminUser }) => (
            <li key={adminUser.id}>
              <span><strong>{adminUser.fullName}</strong> · {adminUser.email}</span>
              {canManageStaff && adminUser.id !== session.id && (
                <RemoveStaffForm
                  action={removeEventStaff.bind(null, event.id)}
                  adminUserId={adminUser.id}
                />
              )}
            </li>
          ))}
        </ul>
        {canManageStaff && (
          <AssignStaffForm action={assignEventStaff.bind(null, event.id)} />
        )}
      </section>
    </main>
  );
}
