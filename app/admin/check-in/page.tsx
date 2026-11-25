import { redirect } from "next/navigation";
import { ParticipantCheckInButton, TicketCodeCheckInForm } from "@/components/admin/check-in-forms";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";

type CheckInPageProps = {
  searchParams: Promise<{
    eventId?: string;
    q?: string;
    readyPage?: string;
    historyPage?: string;
  }>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const READY_PAGE_SIZE = 20;
const HISTORY_PAGE_SIZE = 25;

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

export default async function AdminCheckInPage({ searchParams }: CheckInPageProps) {
  const {
    eventId: requestedEventId,
    q: rawQuery,
    readyPage: rawReadyPage,
    historyPage: rawHistoryPage,
  } = await searchParams;
  const { session, decision } = await requireAdminPermission(EVENT_PERMISSIONS.recordCheckIns, "/admin/check-in");
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
      await requireAdminPermission(EVENT_PERMISSIONS.recordCheckIns, "/admin/check-in", selectedEventId);
    }
    redirect("/admin/access-denied");
  }
  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const searchQuery = rawQuery?.trim().slice(0, 200) ?? "";
  const requestedReadyPage = parsePage(rawReadyPage);
  const requestedHistoryPage = parsePage(rawHistoryPage);

  const readyWhere = selectedEvent
    ? {
        eventId: selectedEvent.id,
        status: "confirmed" as const,
        tickets: { some: { status: "active" as const } },
        invoices: { some: { status: "paid" as const } },
        invitationCollection: { isNot: null },
        checkIn: { is: null },
      }
    : null;
  const readySkip = Math.max(0, (requestedReadyPage - 1) * READY_PAGE_SIZE);
  const historySkip = Math.max(0, (requestedHistoryPage - 1) * HISTORY_PAGE_SIZE);

  const [
    registrations,
    readyTotal,
    historyTotal,
    readyRegistrations,
    checkInHistory,
  ] = await Promise.all([
    selectedEvent && searchQuery.length >= 2
      ? prisma.registration.findMany({
          where: {
            eventId: selectedEvent.id,
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
            status: true,
            participantProfile: { select: { fullName: true, email: true } },
            ticketType: { select: { name: true } },
            tickets: {
              select: {
                id: true,
                ticketCode: true,
                status: true,
              },
              take: 1,
            },
            checkIn: { select: { checkedInAt: true } },
          },
          orderBy: { registeredAt: "desc" },
          take: 25,
        })
      : Promise.resolve([]),
    readyWhere ? prisma.registration.count({ where: readyWhere }) : Promise.resolve(0),
    selectedEvent
      ? prisma.checkIn.count({ where: { eventId: selectedEvent.id } })
      : Promise.resolve(0),
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
              },
            },
            invitationCollection: { select: { collectedAt: true } },
          },
          orderBy: [{ confirmedAt: "asc" }, { id: "asc" }],
          skip: readySkip,
          take: READY_PAGE_SIZE,
        })
      : Promise.resolve([]),
    selectedEvent
      ? prisma.checkIn.findMany({
          where: { eventId: selectedEvent.id },
          select: {
            id: true,
            checkedInAt: true,
            registration: {
              select: {
                registrationNumber: true,
                participantProfile: { select: { fullName: true } },
              },
            },
          },
          orderBy: [{ checkedInAt: "desc" }, { id: "desc" }],
          skip: historySkip,
          take: HISTORY_PAGE_SIZE,
        })
      : Promise.resolve([]),
  ]);
  const readyPageCount = Math.max(1, Math.ceil(readyTotal / READY_PAGE_SIZE));
  const readyPage = Math.min(requestedReadyPage, readyPageCount);
  const historyPageCount = Math.max(1, Math.ceil(historyTotal / HISTORY_PAGE_SIZE));
  const historyPage = Math.min(requestedHistoryPage, historyPageCount);
  const readyPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedEvent) params.set("eventId", selectedEvent.id);
    if (searchQuery) params.set("q", searchQuery);
    params.set("readyPage", String(page));
    return `/admin/check-in?${params.toString()}`;
  };
  const historyPageHref = (page: number) => {
    const params = new URLSearchParams();
    if (selectedEvent) params.set("eventId", selectedEvent.id);
    if (searchQuery) params.set("q", searchQuery);
    params.set("historyPage", String(page));
    return `/admin/check-in?${params.toString()}`;
  };

  return (
    <main className="zas-admin-page zas-check-in-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT OPERATIONS</p>
          <h1>Check-in</h1>
          <p>Check-in records are separate from invitation collection and never change ticket or payment status.</p>
        </div>
      </header>

      <AdminSharedDashboard session={session} />

      {events.length === 0 ? (
        <section className="zas-admin-card">
          <h2>No assigned events</h2>
          <p>Check-in requires the check-in permission and assignment to an event.</p>
        </section>
      ) : (
        <>
          <div className="zas-check-in-tools-grid">
            {selectedEvent && (
              <section className="zas-admin-card zas-admin-wide-card zas-check-in-tool-card">
                <h2>Validate ticket code</h2>
                <p>{selectedEvent.name}</p>
                <TicketCodeCheckInForm eventId={selectedEvent.id} />
              </section>
            )}

            <section className="zas-admin-card zas-admin-wide-card zas-check-in-tool-card">
              <h2>Find participant</h2>
              <form action="/admin/check-in" className="zas-invitation-search-form">
                <label htmlFor="check-in-event">Assigned event</label>
                <select id="check-in-event" name="eventId" defaultValue={selectedEventId}>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
                <label htmlFor="check-in-search">Name, email, or registration number</label>
                <input id="check-in-search" name="q" defaultValue={searchQuery} maxLength={200} minLength={2} autoComplete="off" />
                <button type="submit">Search event participants</button>
              </form>
            </section>
          </div>

          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="zas-registration-privacy" role="status">
              Enter at least two characters to search.
            </p>
          )}
          {selectedEvent && searchQuery.length >= 2 && (
            <section className="zas-admin-card zas-admin-wide-card">
              <h2>Search results</h2>
              {registrations.length === 0 ? (
                <p>No participants matched this search in the selected event.</p>
              ) : (
                <div className={`zas-admin-ticket-list${registrations.length > 10 ? " zas-data-list-scroll" : ""}`}>
                  {registrations.map((registration) => (
                    <article className="zas-admin-ticket-item" key={registration.id}>
                      <div className="zas-admin-ticket-summary">
                        <div>
                          <h3>{registration.participantProfile.fullName}</h3>
                          <p>
                            {registration.registrationNumber} · {registration.ticketType.name}
                          </p>
                          <p>{registration.participantProfile.email}</p>
                          <p>Registration: {registration.status.replaceAll("_", " ")}</p>
                          <p>
                            Ticket: {registration.tickets[0]?.status ?? "not issued"}
                            {registration.tickets[0] && ` · ${registration.tickets[0].ticketCode}`}
                          </p>
                        </div>
                      </div>
                      {registration.tickets[0]?.status === "active" && registration.status === "confirmed" ? (
                        <ParticipantCheckInButton
                          checkedInAt={registration.checkIn?.checkedInAt ?? null}
                          eventId={selectedEvent.id}
                          participantName={registration.participantProfile.fullName}
                          registrationId={registration.id}
                          registrationNumber={registration.registrationNumber}
                        />
                      ) : (
                        <p className="zas-check-in-result is-error" role="status">
                          This registration does not have a confirmed registration and active ticket.
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              )}
              {registrations.length === 25 && <p>Showing the first 25 matches. Refine the search to narrow results.</p>}
            </section>
          )}

          {selectedEvent && (
            <section aria-labelledby="check-in-ready-title" className="zas-admin-card zas-admin-wide-card">
              <div className="zas-admin-section-heading">
                <div>
                  <p className="zas-admin-eyebrow">OPERASIONAL CHECK-IN</p>
                  <h2 id="check-in-ready-title">Peserta Siap Check-in</h2>
                </div>
                <p className="zas-participant-result-count">{readyTotal.toLocaleString("id-ID")} peserta</p>
              </div>
              {readyRegistrations.length === 0 ? (
                <p>Belum ada peserta yang sudah mengambil undangan dan siap check-in.</p>
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
                        <th scope="col">Waktu Pengambilan</th>
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
                            <td>{invoice?.invoiceNumber ?? invoice?.legacyInvoiceNumber ?? "—"}</td>
                            <td>
                              <span className="zas-admin-payment-badge is-paid">PAID</span>
                            </td>
                            <td>
                              <span className="zas-invitation-status is-collected">Sudah Diambil</span>
                            </td>
                            <td>{registration.invitationCollection ? formatDateTime(registration.invitationCollection.collectedAt, selectedEvent.timezone) : "—"}</td>
                            <td>
                              <ParticipantCheckInButton
                                buttonLabel="Check-in"
                                checkedInAt={null}
                                eventId={selectedEvent.id}
                                participantName={registration.participantProfile.fullName}
                                registrationId={registration.id}
                                registrationNumber={registration.registrationNumber}
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
                <nav aria-label="Halaman peserta siap check-in" className="zas-admin-pagination">
                  <a aria-disabled={readyPage <= 1} className={readyPage <= 1 ? "is-disabled" : undefined} href={readyPage <= 1 ? undefined : readyPageHref(readyPage - 1)}>
                    Sebelumnya
                  </a>
                  <span>
                    Halaman {readyPage} dari {readyPageCount}
                  </span>
                  <a aria-disabled={readyPage >= readyPageCount} className={readyPage >= readyPageCount ? "is-disabled" : undefined} href={readyPage >= readyPageCount ? undefined : readyPageHref(readyPage + 1)}>
                    Berikutnya
                  </a>
                </nav>
              )}
            </section>
          )}

          {selectedEvent && (
            <section
              aria-labelledby="check-in-history-title"
              className="zas-admin-card zas-admin-wide-card"
            >
              <div className="zas-admin-section-heading">
                <div>
                  <p className="zas-admin-eyebrow">RIWAYAT CHECK-IN</p>
                  <h2 id="check-in-history-title">Daftar Sudah Check-in</h2>
                </div>
                <p className="zas-participant-result-count">
                  {historyTotal.toLocaleString("id-ID")} peserta
                </p>
              </div>
              {checkInHistory.length === 0 ? (
                <p>Belum ada peserta yang berhasil check-in untuk event ini.</p>
              ) : (
                <div
                  className={`zas-admin-table-wrap${checkInHistory.length > 10 ? " zas-data-list-scroll" : ""}`}
                >
                  <table className="zas-admin-table">
                    <thead>
                      <tr>
                        <th scope="col">Nama</th>
                        <th scope="col">Nomor Registrasi</th>
                        <th scope="col">Waktu Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {checkInHistory.map((checkIn) => (
                        <tr key={checkIn.id}>
                          <td>{checkIn.registration.participantProfile.fullName}</td>
                          <td>{checkIn.registration.registrationNumber}</td>
                          <td>
                            {formatDateTime(
                              checkIn.checkedInAt,
                              selectedEvent.timezone,
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {historyPageCount > 1 && (
                <nav aria-label="Halaman riwayat check-in" className="zas-admin-pagination">
                  <a
                    aria-disabled={historyPage <= 1}
                    className={historyPage <= 1 ? "is-disabled" : undefined}
                    href={historyPage <= 1 ? undefined : historyPageHref(historyPage - 1)}
                  >
                    Sebelumnya
                  </a>
                  <span>
                    Halaman {historyPage} dari {historyPageCount}
                  </span>
                  <a
                    aria-disabled={historyPage >= historyPageCount}
                    className={historyPage >= historyPageCount ? "is-disabled" : undefined}
                    href={historyPage >= historyPageCount ? undefined : historyPageHref(historyPage + 1)}
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
