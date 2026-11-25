import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { getAdminDashboardSummary } from "@/lib/admin/dashboard-summary";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { prisma } from "@/lib/db";

const eventStatusLabels: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Ditutup",
  cancelled: "Dibatalkan",
  archived: "Diarsipkan",
};

type CombinedDashboardEvent = {
  id: string;
  name: string;
  status: string;
  startsAt: Date;
  timezone: string;
  recentRank: number;
};

function formatEventDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export default async function AdminDashboard() {
  const { session, decision } = await requireAdminPermission(
    "admin.dashboard.view",
    "/admin",
  );

  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const canReadEvents = session.permissions.includes(EVENT_PERMISSIONS.read);
  const canReviewPayments = session.permissions.includes(
    EVENT_PERMISSIONS.reviewPayments,
  );
  const eventIds = [...session.eventIds];
  const canCombineEventQueries =
    canReadEvents && canReviewPayments && eventIds.length > 0;

  const [
    combinedEvents,
    fallbackRecentEvents,
    recentRegistrations,
    pendingVerificationCount,
    fallbackExportEvents,
    combinedRegistrationCount,
    fallbackSummary,
  ] = await Promise.all([
    canCombineEventQueries
      ? prisma.$queryRaw<CombinedDashboardEvent[]>(Prisma.sql`
          SELECT
            event.id,
            event.name,
            event.status::text AS status,
            event.starts_at AS "startsAt",
            event.timezone,
            (ROW_NUMBER() OVER (
              ORDER BY event.created_at DESC, event.name ASC
            ))::integer AS "recentRank"
          FROM events AS event
          WHERE event.id IN (${Prisma.join(
            eventIds.map((eventId) => Prisma.sql`${eventId}::uuid`),
          )})
          ORDER BY event.starts_at DESC, event.name ASC
        `)
      : Promise.resolve(null),
    canReadEvents && eventIds.length > 0 && !canCombineEventQueries
      ? prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: {
            id: true,
            name: true,
            status: true,
            startsAt: true,
            timezone: true,
          },
          orderBy: [{ createdAt: "desc" }, { name: "asc" }],
          take: 5,
        })
      : Promise.resolve([]),
    canReviewPayments && eventIds.length > 0
      ? prisma.registration.findMany({
          where: { eventId: { in: eventIds } },
          select: {
            id: true,
            registeredAt: true,
            participantProfile: { select: { fullName: true } },
            ticketType: { select: { name: true, priceAmount: true } },
            invoices: {
              select: {
                invoiceNumber: true,
                status: true,
                issuedAt: true,
                payments: {
                  select: { status: true, submittedAt: true },
                  orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
                  take: 1,
                },
              },
              orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
              take: 1,
            },
          },
          orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
          take: 8,
        })
      : Promise.resolve([]),
    canReviewPayments && eventIds.length > 0
      ? prisma.payment.count({
          where: {
            status: "submitted",
            invoice: { registration: { eventId: { in: eventIds } } },
          },
        })
      : Promise.resolve(null),
    canReviewPayments && eventIds.length > 0 && !canCombineEventQueries
      ? prisma.event.findMany({
          where: { id: { in: eventIds } },
          select: { id: true, name: true },
          orderBy: [{ startsAt: "desc" }, { name: "asc" }],
        })
      : Promise.resolve([]),
    canCombineEventQueries
      ? prisma.registration.count({ where: { eventId: { in: eventIds } } })
      : Promise.resolve(null),
    canReadEvents && !canCombineEventQueries
      ? getAdminDashboardSummary(eventIds)
      : Promise.resolve(null),
  ]);
  const recentEvents = combinedEvents
    ? combinedEvents
        .filter((event) => event.recentRank <= 5)
        .sort((first, second) => first.recentRank - second.recentRank)
        .map(({ id, name, status, startsAt, timezone }) => ({
          id,
          name,
          status,
          startsAt,
          timezone,
        }))
    : fallbackRecentEvents;
  const exportEvents = combinedEvents
    ? combinedEvents.map(({ id, name }) => ({ id, name }))
    : fallbackExportEvents;
  const summary = combinedEvents
    ? {
        totalEvents: combinedEvents.length,
        draftEvents: combinedEvents.filter(
          (event) => event.status === "draft",
        ).length,
        publishedEvents: combinedEvents.filter(
          (event) => event.status === "published",
        ).length,
        totalRegistrations: combinedRegistrationCount ?? 0,
      }
    : fallbackSummary;

  return (
    <main className="zas-admin-page zas-admin-dashboard">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">ZAS EVENT ADMINISTRATION</p>
          <h1>Dashboard</h1>
          <p>Selamat datang, {session.fullName}.</p>
        </div>
        <div className="zas-admin-header-actions">
          {session.permissions.includes(EVENT_PERMISSIONS.create) && (
            <Link className="zas-admin-primary-link" href="/admin/events/new">
              Buat Event Baru
            </Link>
          )}
          <form action={logout}>
            <button className="zas-admin-logout" type="submit">Keluar</button>
          </form>
        </div>
      </header>

      <AdminSharedDashboard session={session} summary={summary} />

      <section aria-labelledby="admin-latest-registrations-title" className="zas-admin-card zas-admin-wide-card zas-admin-registrations-card">
        <div className="zas-admin-section-heading">
          <div>
            <p className="zas-admin-eyebrow">AKTIVITAS PESERTA</p>
            <h2 id="admin-latest-registrations-title">Pendaftaran Terbaru</h2>
            {pendingVerificationCount !== null && pendingVerificationCount > 0 && (
              <p className="zas-admin-pending-summary">
                {pendingVerificationCount} pembayaran menunggu verifikasi
              </p>
            )}
          </div>
          {canReviewPayments && (
            <Link className="zas-admin-text-link" href="/admin/payments">
              Lihat Semua Verifikasi
            </Link>
          )}
        </div>

        {!canReviewPayments ? (
          <p className="zas-admin-registrations-note">
            Anda memerlukan izin verifikasi pembayaran untuk melihat informasi pendaftar.
          </p>
        ) : recentRegistrations.length === 0 ? (
          <p className="zas-admin-registrations-note">Belum ada pendaftaran pada event yang ditugaskan.</p>
        ) : (
          <div className="zas-admin-table-wrap">
            <table className="zas-admin-table zas-admin-registration-table">
              <thead>
                <tr>
                  <th scope="col">Peserta</th>
                  <th scope="col">Nomor Invoice</th>
                  <th scope="col">Jenis Tiket</th>
                  <th scope="col">Tanggal Registrasi</th>
                  <th scope="col">Status Pembayaran</th>
                </tr>
              </thead>
              <tbody>
                {recentRegistrations.map((registration) => {
                  const invoice = registration.invoices[0];
                  const payment = invoice?.payments[0];
                  const isPaid =
                    payment?.status === "approved" || invoice?.status === "paid";
                  const isRejected =
                    payment?.status === "rejected" || invoice?.status === "rejected";
                  const isFree = registration.ticketType.priceAmount.isZero();
                  const statusLabel = isPaid
                    ? "PAID"
                    : isRejected
                      ? "Ditolak"
                      : isFree
                        ? "Gratis"
                        : payment?.status === "submitted"
                          ? "Menunggu verifikasi"
                          : "Menunggu pembayaran";
                  const statusClass = isPaid
                    ? "is-paid"
                    : isRejected
                      ? "is-rejected"
                      : "is-pending";

                  return (
                    <tr key={registration.id}>
                      <td><strong>{registration.participantProfile.fullName}</strong></td>
                      <td>{invoice?.invoiceNumber ?? "—"}</td>
                      <td>{registration.ticketType.name}</td>
                      <td>{formatEventDate(registration.registeredAt, "Asia/Makassar")}</td>
                      <td>
                        <span className={`zas-admin-payment-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canReviewPayments && (
        <section aria-labelledby="admin-participant-export-title" className="zas-admin-card zas-admin-wide-card">
          <div className="zas-admin-section-heading">
            <div>
              <p className="zas-admin-eyebrow">DATA PESERTA</p>
              <h2 id="admin-participant-export-title">Download Data Peserta</h2>
            </div>
          </div>
          {exportEvents.length > 0 ? (
            <form action="/admin/participants.xlsx" className="zas-participant-export-form" method="get">
              <label htmlFor="participant-export-event">Pilih event</label>
              <select id="participant-export-event" name="eventId" required>
                <option value="">Pilih event yang akan diekspor</option>
                {exportEvents.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
              <button className="zas-participant-export-button" type="submit">
                <svg aria-hidden="true" fill="none" height="18" viewBox="0 0 24 24" width="18">
                  <path
                    d="M12 3.75v11.5m0 0 4.25-4.25M12 15.25 7.75 11M4.5 16v3.25h15V16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                  />
                </svg>
                <span>Download Data Peserta</span>
              </button>
            </form>
          ) : (
            <p className="zas-admin-registrations-note">Belum ada event yang ditugaskan untuk diekspor.</p>
          )}
        </section>
      )}

      <section aria-labelledby="admin-recent-events-title" className="zas-admin-card zas-admin-wide-card">
        <div className="zas-admin-section-heading">
          <div>
            <p className="zas-admin-eyebrow">KELOLA KEGIATAN</p>
            <h2 id="admin-recent-events-title">Event Terbaru</h2>
          </div>
          {canReadEvents && (
            <Link className="zas-admin-text-link" href="/admin/events">Lihat Semua Event</Link>
          )}
        </div>

        {!canReadEvents ? (
          <p>Akun Anda tidak memiliki izin untuk melihat daftar event.</p>
        ) : recentEvents.length === 0 ? (
          <div className="zas-admin-dashboard-empty">
            <h3>Belum ada event yang ditugaskan</h3>
            <p>Event yang dapat Anda kelola akan muncul di sini.</p>
            {session.permissions.includes(EVENT_PERMISSIONS.create) && (
              <Link className="zas-admin-primary-link" href="/admin/events/new">
                Buat Event Baru
              </Link>
            )}
          </div>
        ) : (
          <div className="zas-admin-recent-list">
            {recentEvents.map((event) => (
              <article className="zas-admin-recent-event" key={event.id}>
                <div>
                  <h3>{event.name}</h3>
                  <p>{formatEventDate(event.startsAt, event.timezone)}</p>
                </div>
                <span className={`zas-admin-status is-${event.status}`}>
                  {eventStatusLabels[event.status] ?? event.status}
                </span>
                <Link
                  aria-label={`Kelola ${event.name}`}
                  className="zas-admin-small-button"
                  href={`/admin/events/${event.id}`}
                >
                  Kelola
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>

    </main>
  );
}
