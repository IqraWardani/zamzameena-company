import { redirect } from "next/navigation";
import {
  InvitationCodeCollectionForm,
  ParticipantInvitationCollectionAction,
  ParticipantInvitationActions,
} from "@/components/admin/invitation-forms";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";

type InvitationsPageProps = {
  searchParams: Promise<{ eventId?: string; q?: string; readyPage?: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const READY_PAGE_SIZE = 20;

function parsePage(value?: string): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function formatDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(date);
}

export default async function AdminInvitationsPage({
  searchParams,
}: InvitationsPageProps) {
  const {
    eventId: requestedEventId,
    q: rawQuery,
    readyPage: rawReadyPage,
  } = await searchParams;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.collectInvitations,
    "/admin/invitations",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const events = session.eventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: [...session.eventIds] } },
        select: { id: true, name: true, startsAt: true, timezone: true },
        orderBy: { startsAt: "desc" },
      })
    : [];
  const selectedEventId = requestedEventId || events[0]?.id;
  if (selectedEventId && !session.eventIds.includes(selectedEventId)) {
    if (UUID_PATTERN.test(selectedEventId)) {
      await requireAdminPermission(
        EVENT_PERMISSIONS.collectInvitations,
        "/admin/invitations",
        selectedEventId,
      );
    }
    redirect("/admin/access-denied");
  }
  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const searchQuery = rawQuery?.trim().slice(0, 200) ?? "";
  const requestedReadyPage = parsePage(rawReadyPage);

  const readyWhere = selectedEvent
    ? {
        eventId: selectedEvent.id,
        status: "confirmed" as const,
        tickets: { some: { status: "active" as const } },
        invoices: { some: { status: "paid" as const } },
        invitationCollection: { is: null },
      }
    : null;
  const readySkip = Math.max(0, (requestedReadyPage - 1) * READY_PAGE_SIZE);

  const [registrations, readyTotal, readyRegistrations] = await Promise.all([
    selectedEvent && searchQuery.length >= 2
      ? prisma.registration.findMany({
          where: {
            eventId: selectedEvent.id,
            status: "confirmed",
            tickets: { some: { status: "active" } },
            invoices: { some: { status: "paid" } },
            invitationCollection: { is: null },
            OR: [
              {
                registrationNumber: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
              {
                participantProfile: {
                  fullName: { contains: searchQuery, mode: "insensitive" },
                },
              },
              {
                participantProfile: {
                  email: { contains: searchQuery, mode: "insensitive" },
                },
              },
            ],
          },
          select: {
            id: true,
            registrationNumber: true,
            confirmedAt: true,
            participantProfile: { select: { fullName: true, email: true } },
            ticketType: { select: { name: true } },
            tickets: {
              where: { status: "active" },
              select: { ticketCode: true },
              take: 1,
            },
          },
          orderBy: { confirmedAt: "asc" },
          take: 25,
        })
      : Promise.resolve([]),
    readyWhere ? prisma.registration.count({ where: readyWhere }) : Promise.resolve(0),
    readyWhere
      ? prisma.registration.findMany({
          where: readyWhere,
          select: {
            id: true,
            registrationNumber: true,
            participantProfile: { select: { fullName: true } },
            invoices: {
              where: { status: "paid" },
              orderBy: [{ paidAt: "desc" }, { issuedAt: "desc" }],
              take: 1,
              select: {
                invoiceNumber: true,
                legacyInvoiceNumber: true,
                status: true,
                paidAt: true,
              },
            },
          },
          orderBy: [{ confirmedAt: "asc" }, { id: "asc" }],
          skip: readySkip,
          take: READY_PAGE_SIZE,
        })
      : Promise.resolve([]),
  ]);

  const readyPageCount = Math.max(1, Math.ceil(readyTotal / READY_PAGE_SIZE));
  const readyPage = Math.min(requestedReadyPage, readyPageCount);
  const readyPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedEvent) params.set("eventId", selectedEvent.id);
    if (searchQuery) params.set("q", searchQuery);
    params.set("readyPage", String(page));
    return `/admin/invitations?${params.toString()}`;
  };

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT OPERATIONS</p>
          <h1>Invitation collection</h1>
          <p>Search is restricted to events assigned to your account and confirmed registrations.</p>
        </div>
      </header>

      <AdminSharedDashboard session={session} />

      {events.length === 0 ? (
        <section className="zas-admin-card">
          <h2>No assigned events</h2>
          <p>Invitation operations require an event assignment and invitation permission.</p>
        </section>
      ) : (
        <>
          <section className="zas-admin-card zas-admin-wide-card">
            <h2>Choose event and find a participant</h2>
            <form action="/admin/invitations" className="zas-invitation-search-form">
              <label htmlFor="eventId">Assigned event</label>
              <select id="eventId" name="eventId" defaultValue={selectedEventId}>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
              <label htmlFor="participant-search">Name, email, or registration number</label>
              <input
                id="participant-search"
                name="q"
                defaultValue={searchQuery}
                maxLength={200}
                minLength={2}
                autoComplete="off"
              />
              <button type="submit">Search confirmed participants</button>
            </form>
          </section>

          {selectedEvent && (
            <section className="zas-admin-card zas-admin-wide-card">
              <h2>Collect with invitation code</h2>
              <p>{selectedEvent.name}</p>
              <InvitationCodeCollectionForm eventId={selectedEvent.id} />
            </section>
          )}

          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="zas-registration-privacy" role="status">Enter at least two characters to search.</p>
          )}
          {selectedEvent && searchQuery.length >= 2 && (
            <section className="zas-admin-card zas-admin-wide-card">
              <h2>Eligible participants</h2>
              {registrations.length === 0 ? (
                <p>No uncollected confirmed registrations matched this search.</p>
              ) : (
                <div className={`zas-admin-ticket-list${registrations.length > 10 ? " zas-data-list-scroll" : ""}`}>
                  {registrations.map((registration) => (
                    <article className="zas-admin-ticket-item" key={registration.id}>
                      <div className="zas-admin-ticket-summary">
                        <div>
                          <h3>{registration.participantProfile.fullName}</h3>
                          <p>{registration.registrationNumber} · {registration.ticketType.name}</p>
                          <p>{registration.participantProfile.email}</p>
                          <p>Ticket: {registration.tickets[0]?.ticketCode}</p>
                        </div>
                      </div>
                      <ParticipantInvitationActions
                        eventId={selectedEvent.id}
                        registrationId={registration.id}
                      />
                    </article>
                  ))}
                </div>
              )}
              {registrations.length === 25 && <p>Showing the first 25 matches. Refine the search to narrow results.</p>}
            </section>
          )}

          {selectedEvent && (
            <section
              aria-labelledby="invitation-ready-title"
              className="zas-admin-card zas-admin-wide-card"
            >
              <div className="zas-admin-section-heading">
                <div>
                  <p className="zas-admin-eyebrow">OPERASIONAL UNDANGAN</p>
                  <h2 id="invitation-ready-title">Peserta Siap Mengambil Undangan</h2>
                </div>
                <p className="zas-participant-result-count">
                  {readyTotal.toLocaleString("id-ID")} peserta
                </p>
              </div>
              {readyRegistrations.length === 0 ? (
                <p>Belum ada peserta berstatus paid yang belum mengambil undangan.</p>
              ) : (
                <div className="zas-admin-table-wrap">
                  <table className="zas-admin-table zas-operational-participant-table">
                    <thead>
                      <tr>
                        <th scope="col">No.</th>
                        <th scope="col">Nama Peserta</th>
                        <th scope="col">Nomor Registrasi</th>
                        <th scope="col">Nomor Invoice</th>
                        <th scope="col">Status Pembayaran</th>
                        <th scope="col">Status Undangan</th>
                        <th scope="col">Waktu Pembayaran</th>
                        <th scope="col">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readyRegistrations.map((registration, index) => {
                        const invoice = registration.invoices[0];
                        return (
                          <tr key={registration.id}>
                            <td>{(readyPage - 1) * READY_PAGE_SIZE + index + 1}</td>
                            <td>{registration.participantProfile.fullName}</td>
                            <td>{registration.registrationNumber}</td>
                            <td>
                              {invoice?.invoiceNumber ??
                                invoice?.legacyInvoiceNumber ??
                                "—"}
                            </td>
                            <td>
                              <span className="zas-admin-payment-badge is-paid">PAID</span>
                            </td>
                            <td>
                              <span className="zas-invitation-status is-uncollected">
                                Belum Diambil
                              </span>
                            </td>
                            <td>
                              {invoice?.paidAt
                                ? formatDateTime(invoice.paidAt, selectedEvent.timezone)
                                : "—"}
                            </td>
                            <td>
                              <ParticipantInvitationCollectionAction
                                buttonLabel="Ambil Undangan"
                                eventId={selectedEvent.id}
                                registrationId={registration.id}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {readyPageCount > 1 && (
                <nav aria-label="Halaman peserta siap mengambil undangan" className="zas-admin-pagination">
                  <a
                    aria-disabled={readyPage <= 1}
                    className={readyPage <= 1 ? "is-disabled" : undefined}
                    href={readyPage <= 1 ? undefined : readyPageHref(readyPage - 1)}
                  >
                    Sebelumnya
                  </a>
                  <span>Halaman {readyPage} dari {readyPageCount}</span>
                  <a
                    aria-disabled={readyPage >= readyPageCount}
                    className={readyPage >= readyPageCount ? "is-disabled" : undefined}
                    href={readyPage >= readyPageCount ? undefined : readyPageHref(readyPage + 1)}
                  >
                    Berikutnya
                  </a>
                </nav>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
