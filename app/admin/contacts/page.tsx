import { redirect } from "next/navigation";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { ContactStatusForm } from "@/components/admin/contact-status-form";
import type { AdminSummaryMetric } from "@/components/admin/admin-summary-cards";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import {
  REGISTRATION_DETAIL_ANSWER_KEYS,
  REGISTRATION_QUESTIONS,
} from "@/lib/registration/validation";
import { getParticipantPaymentStatus, getParticipantPaymentWhere } from "@/lib/payments/participant-status";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

type AdminContactsPageProps = {
  searchParams: Promise<{
    eventId?: string;
    participantQ?: string;
    participantPayment?: string;
    participantPage?: string;
    status?: string;
    q?: string;
  }>;
};

const CONTACT_STATUSES = ["new", "in_progress", "resolved", "spam"] as const;
const PAYMENT_FILTERS = ["paid", "unpaid"] as const;
const PER_PAGE = 25;

function isContactStatus(value?: string): value is (typeof CONTACT_STATUSES)[number] {
  return CONTACT_STATUSES.some((status) => status === value);
}

function isPaymentFilter(value?: string): value is (typeof PAYMENT_FILTERS)[number] {
  return PAYMENT_FILTERS.some((status) => status === value);
}

function getAnswerText(answer: Prisma.JsonValue): string {
  if (typeof answer === "string") return answer;
  if (answer === null || typeof answer === "number" || typeof answer === "boolean") {
    return answer === null ? "" : String(answer);
  }
  return JSON.stringify(answer);
}

function paymentStatusLabel(status: ReturnType<typeof getParticipantPaymentStatus>) {
  switch (status) {
    case "paid": return "Paid";
    case "unpaid": return "Belum Paid";
    case "free": return "Gratis";
    case "inactive": return "Tidak aktif";
  }
}

function registrationStatusLabel(status: string) {
  switch (status) {
    case "pending_payment": return "Menunggu pembayaran";
    case "payment_submitted": return "Pembayaran diajukan";
    case "payment_rejected": return "Pembayaran ditolak";
    case "confirmed": return "Terkonfirmasi";
    case "cancelled": return "Dibatalkan";
    case "expired": return "Kedaluwarsa";
    default: return status;
  }
}

function displayValue(value: string | null | undefined) {
  return value?.trim() || "—";
}

function formatDateTime(value: Date | null | undefined, timezone: string) {
  return value?.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }) ?? "—";
}

export default async function AdminContactsPage({
  searchParams,
}: AdminContactsPageProps) {
  const params = await searchParams;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.manageContacts,
    "/admin/contacts",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const assignedEvents = session.eventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: [...session.eventIds] } },
        select: { id: true, name: true, slug: true, timezone: true },
        orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      })
    : [];
  const defaultEvent = assignedEvents.find((event) => event.slug === "synergy-preneur-summit-2027")
    ?? assignedEvents[0];
  const selectedEvent = assignedEvents.find((event) => event.id === params.eventId) ?? defaultEvent;
  const status = isContactStatus(params.status) ? params.status : undefined;
  const contactQuery = params.q?.trim().slice(0, 120) ?? "";
  const participantQuery = params.participantQ?.trim().slice(0, 120) ?? "";
  const requestedPayment = isPaymentFilter(params.participantPayment)
    ? params.participantPayment
    : undefined;
  const requestedPage = Math.max(1, Number.parseInt(params.participantPage ?? "1", 10) || 1);
  const registrationBaseWhere: Prisma.RegistrationWhereInput = selectedEvent
    ? { eventId: selectedEvent.id }
    : {};
  const participantConditions: Prisma.RegistrationWhereInput[] = [registrationBaseWhere];
  if (requestedPayment) {
    participantConditions.push(getParticipantPaymentWhere(requestedPayment));
  }
  if (participantQuery) {
    const participantSearchWhere: Prisma.RegistrationWhereInput = {
      OR: [
        {
          participantProfile: {
            fullName: { contains: participantQuery, mode: "insensitive" },
          },
        },
        { participantProfile: { phone: { contains: participantQuery } } },
        {
          participantProfile: {
            city: { contains: participantQuery, mode: "insensitive" },
          },
        },
        {
          invoices: {
            some: {
              OR: [
                { invoiceNumber: { contains: participantQuery, mode: "insensitive" } },
                { legacyInvoiceNumber: { contains: participantQuery, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    };
    participantConditions.push(participantSearchWhere);
  }
  const participantWhere: Prisma.RegistrationWhereInput = { AND: participantConditions };

  const [
    participantTotal,
    paidCount,
    unpaidCount,
    submissions,
  ] = await Promise.all([
    selectedEvent ? prisma.registration.count({ where: registrationBaseWhere }) : 0,
    selectedEvent
      ? prisma.registration.count({
          where: { AND: [registrationBaseWhere, getParticipantPaymentWhere("paid")] },
        })
      : 0,
    selectedEvent
      ? prisma.registration.count({
          where: { AND: [registrationBaseWhere, getParticipantPaymentWhere("unpaid")] },
        })
      : 0,
    prisma.contactSubmission.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(contactQuery
          ? {
              OR: [
                { name: { contains: contactQuery, mode: "insensitive" as const } },
                { email: { contains: contactQuery, mode: "insensitive" as const } },
                { subject: { contains: contactQuery, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        resolvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const filteredParticipantCount = requestedPayment || participantQuery
    ? await prisma.registration.count({ where: participantWhere })
    : participantTotal;
  const participantPageCount = Math.max(1, Math.ceil(filteredParticipantCount / PER_PAGE));
  const participantPage = Math.min(requestedPage, participantPageCount);
  const registrations = selectedEvent
    ? await prisma.registration.findMany({
        where: participantWhere,
        orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
        skip: (participantPage - 1) * PER_PAGE,
        take: PER_PAGE,
        select: {
          id: true,
          registrationNumber: true,
          registeredAt: true,
          status: true,
          referralCodeSnapshot: true,
          participantProfile: {
            select: {
              fullName: true,
              email: true,
              phone: true,
              organizationName: true,
              jobTitle: true,
              city: true,
              countryCode: true,
            },
          },
          ticketType: { select: { name: true, priceAmount: true } },
          salesMember: { select: { fullName: true } },
          tickets: { select: { ticketCode: true, status: true } },
          answers: {
            where: {
              fieldKey: {
                in: [
                  ...REGISTRATION_QUESTIONS.map(({ key }) => key),
                  ...REGISTRATION_DETAIL_ANSWER_KEYS,
                ],
              },
            },
            select: { fieldKey: true, answer: true },
          },
          invoices: {
            orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
            select: {
              invoiceNumber: true,
              legacyInvoiceNumber: true,
              status: true,
              paidAt: true,
              payments: { select: { status: true, paidAt: true } },
            },
          },
        },
      })
    : [];

  const participantMetrics: AdminSummaryMetric[] = [
    {
      label: "Total Peserta",
      value: participantTotal,
      description: selectedEvent?.name ?? "Pendaftaran pada event terpilih",
      icon: "participants",
      tone: "participants",
    },
    {
      label: "Paid",
      value: paidCount,
      description: "Pembayaran terkonfirmasi",
      icon: "paid",
      tone: "paid",
    },
    {
      label: "Belum Paid",
      value: unpaidCount,
      description: "Pendaftaran berbayar yang belum lunas",
      icon: "unpaid",
      tone: "unpaid",
    },
  ];

  function participantPageHref(page: number) {
    const query = new URLSearchParams();
    if (selectedEvent) query.set("eventId", selectedEvent.id);
    if (participantQuery) query.set("participantQ", participantQuery);
    if (requestedPayment) query.set("participantPayment", requestedPayment);
    if (status) query.set("status", status);
    if (contactQuery) query.set("q", contactQuery);
    query.set("participantPage", String(page));
    return `/admin/contacts?${query.toString()}`;
  }

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">EVENT CONTACTS</p>
          <h1>Kontak &amp; Peserta</h1>
          <p>Data peserta berasal dari pendaftaran event yang ditugaskan kepada akun Anda.</p>
        </div>
      </header>

      <AdminSharedDashboard
        ariaLabel="Ringkasan peserta dan event"
        additionalMetrics={participantMetrics}
        session={session}
      />

      <section className="zas-admin-card zas-admin-wide-card">
        <div className="zas-admin-section-heading">
          <div>
            <p className="zas-admin-eyebrow">REGISTRATIONS</p>
            <h2>Daftar Peserta</h2>
          </div>
          {selectedEvent && <p>{selectedEvent.name}</p>}
        </div>
        <form action="/admin/contacts" className="zas-invitation-search-form">
          <label htmlFor="participant-event">Event</label>
          <select
            id="participant-event"
            name="eventId"
            defaultValue={selectedEvent?.id ?? ""}
            disabled={assignedEvents.length === 0}
          >
            {assignedEvents.map((event) => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
          <label htmlFor="participant-query">Nama, telepon, kota, atau nomor invoice</label>
          <input
            id="participant-query"
            name="participantQ"
            defaultValue={participantQuery}
            maxLength={120}
          />
          <label htmlFor="participant-payment-filter">Status pembayaran</label>
          <select
            id="participant-payment-filter"
            name="participantPayment"
            defaultValue={requestedPayment ?? ""}
          >
            <option value="">Semua</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid / Pending</option>
          </select>
          <button disabled={!selectedEvent} type="submit">Cari peserta</button>
        </form>

        {!selectedEvent ? (
          <p>Belum ada event yang ditugaskan ke akun Anda.</p>
        ) : registrations.length === 0 ? (
          <p>Tidak ada peserta yang cocok dengan pencarian atau filter.</p>
        ) : (
          <>
            <div className="zas-contact-participant-list">
              {registrations.map((registration, index) => {
                const answers = new Map(
                  registration.answers.map(({ fieldKey, answer }) => [
                    fieldKey,
                    getAnswerText(answer),
                  ]),
                );
                const invoices = registration.invoices;
                const hasApprovedPayment = invoices.some((invoice) =>
                  invoice.payments.some((payment) => payment.status === "approved"),
                );
                const paidInvoice = invoices.find((invoice) =>
                  invoice.status === "paid" ||
                  invoice.payments.some((payment) => payment.status === "approved"),
                );
                const invoice = paidInvoice ?? invoices[0] ?? null;
                const paymentStatus = getParticipantPaymentStatus({
                  registrationStatus: registration.status,
                  invoiceStatus: invoices.some((item) => item.status === "paid")
                    ? "paid"
                    : invoice?.status ?? null,
                  hasApprovedPayment,
                  ticketPrice: registration.ticketType.priceAmount.toString(),
                });
                const domicileAddress = answers.get("domicile_address") ?? "";
                const identityAddress = answers.get("identity_address") ?? "";
                const address = domicileAddress || identityAddress;
                const paymentTime = invoice?.payments.find((payment) =>
                  payment.status === "approved" && payment.paidAt,
                )?.paidAt ?? invoice?.paidAt;
                const ticket = registration.tickets[0];
                const detailGroups = [
                  {
                    id: "personal",
                    title: "Data Pribadi",
                    fields: [
                      { label: "Nama Lengkap", value: displayValue(registration.participantProfile.fullName) },
                      { label: "Email", value: displayValue(registration.participantProfile.email) },
                      { label: "Nomor WhatsApp", value: displayValue(registration.participantProfile.phone) },
                      { label: "Alamat Domisili", value: displayValue(domicileAddress) },
                      { label: "Alamat sesuai KTP", value: displayValue(identityAddress) },
                    ],
                  },
                  {
                    id: "professional",
                    title: "Data Profesional",
                    fields: [
                      { label: "Perusahaan", value: displayValue(registration.participantProfile.organizationName) },
                      { label: "Jabatan", value: displayValue(registration.participantProfile.jobTitle) },
                      { label: "Kota", value: displayValue(registration.participantProfile.city) },
                      { label: "Kode Negara", value: displayValue(registration.participantProfile.countryCode) },
                      { label: "Catatan Bisnis", value: displayValue(answers.get("business_comment")) },
                    ],
                  },
                  {
                    id: "registration",
                    title: "Data Tiket & Registrasi",
                    fields: [
                      { label: "Nomor Registrasi", value: displayValue(registration.registrationNumber) },
                      { label: "Nomor Invoice", value: displayValue(invoice?.invoiceNumber ?? invoice?.legacyInvoiceNumber) },
                      { label: "Jenis Tiket", value: displayValue(registration.ticketType.name) },
                      { label: "Status Pembayaran", value: paymentStatusLabel(paymentStatus) },
                      { label: "Status Pendaftaran", value: registrationStatusLabel(registration.status) },
                      { label: "Kode Tiket", value: displayValue(ticket?.ticketCode) },
                      { label: "Status Tiket", value: displayValue(ticket?.status) },
                      { label: "Kode Referral", value: displayValue(registration.referralCodeSnapshot) },
                      { label: "Penjual", value: displayValue(registration.salesMember?.fullName) },
                      { label: "Waktu Pendaftaran", value: formatDateTime(registration.registeredAt, selectedEvent.timezone) },
                      { label: "Waktu Pembayaran", value: formatDateTime(paymentTime, selectedEvent.timezone) },
                      { label: "Tujuan Mengikuti Event", value: displayValue(answers.get("event_goals")) },
                      { label: "Kebutuhan Aksesibilitas / Diet", value: displayValue(answers.get("accessibility_needs")) },
                    ],
                  },
                ];

                return (
                  <details className="zas-contact-participant" key={registration.id}>
                    <summary className="zas-contact-participant-summary">
                      <span className="zas-contact-participant-cell">
                        <small>No.</small>
                        {(participantPage - 1) * PER_PAGE + index + 1}
                      </span>
                      <span className="zas-contact-participant-cell">
                        <small>Nama</small>
                        <strong>{registration.participantProfile.fullName}</strong>
                      </span>
                      <span className="zas-contact-participant-cell">
                        <small>Nomor Telepon</small>
                        {displayValue(registration.participantProfile.phone)}
                      </span>
                      <span className="zas-contact-participant-cell">
                        <small>Alamat</small>
                        {displayValue(address)}
                      </span>
                      <span className="zas-contact-participant-cell">
                        <small>Kota</small>
                        {displayValue(registration.participantProfile.city)}
                      </span>
                      <span className="zas-contact-participant-cell">
                        <small>Status Pembayaran</small>
                        <span className={`zas-admin-payment-badge is-${paymentStatus}`}>
                          {paymentStatusLabel(paymentStatus)}
                        </span>
                      </span>
                      <span className="zas-contact-participant-cell zas-contact-detail-cell">
                        <small>Detail</small>
                        <span className="zas-contact-detail-toggle">
                          Detail <span aria-hidden="true">⌄</span>
                        </span>
                      </span>
                    </summary>
                    <div className="zas-contact-participant-detail">
                      {detailGroups.map((group) => (
                        <section
                          aria-labelledby={`participant-${group.id}-${registration.id}`}
                          key={group.id}
                        >
                          <h3 id={`participant-${group.id}-${registration.id}`}>{group.title}</h3>
                          <dl>
                            {group.fields.map((field) => (
                              <div key={field.label}>
                                <dt>{field.label}</dt>
                                <dd>{field.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
            <nav aria-label="Halaman daftar peserta" className="zas-admin-pagination">
              <span>
                Menampilkan {(participantPage - 1) * PER_PAGE + 1}–{Math.min(participantPage * PER_PAGE, filteredParticipantCount)} dari {filteredParticipantCount}
              </span>
              <a
                aria-disabled={participantPage <= 1}
                className={participantPage <= 1 ? "is-disabled" : undefined}
                href={participantPage <= 1 ? undefined : participantPageHref(participantPage - 1)}
              >
                Sebelumnya
              </a>
              <span>Halaman {participantPage} dari {participantPageCount}</span>
              <a
                aria-disabled={participantPage >= participantPageCount}
                className={participantPage >= participantPageCount ? "is-disabled" : undefined}
                href={participantPage >= participantPageCount ? undefined : participantPageHref(participantPage + 1)}
              >
                Berikutnya
              </a>
            </nav>
          </>
        )}
      </section>

      <section className="zas-admin-card zas-admin-wide-card">
        <div className="zas-admin-section-heading">
          <div>
            <p className="zas-admin-eyebrow">PUBLIC CONTACT INBOX</p>
            <h2>Kiriman Form Kontak</h2>
          </div>
        </div>
        <form action="/admin/contacts" className="zas-invitation-search-form">
          {selectedEvent && <input name="eventId" type="hidden" value={selectedEvent.id} />}
          {participantQuery && <input name="participantQ" type="hidden" value={participantQuery} />}
          {requestedPayment && (
            <input name="participantPayment" type="hidden" value={requestedPayment} />
          )}
          <label htmlFor="contact-status-filter">Status kiriman</label>
          <select id="contact-status-filter" name="status" defaultValue={status ?? ""}>
            <option value="">Semua status</option>
            <option value="new">Baru</option>
            <option value="in_progress">Sedang diproses</option>
            <option value="resolved">Selesai</option>
            <option value="spam">Spam</option>
          </select>
          <label htmlFor="contact-query">Nama, email, atau subjek</label>
          <input id="contact-query" name="q" defaultValue={contactQuery} maxLength={120} />
          <button type="submit">Cari kiriman</button>
        </form>
      </section>

      {submissions.length === 0 ? (
        <section className="zas-admin-card"><p>Tidak ada kiriman form kontak.</p></section>
      ) : (
        <div className="zas-contact-submission-list">
          {submissions.map((submission) => (
            <article className="zas-admin-card zas-admin-wide-card" key={submission.id}>
              <p className="zas-admin-eyebrow">
                {submission.status.replaceAll("_", " ")} · {submission.createdAt.toLocaleString("id-ID")}
              </p>
              <h3>{submission.subject}</h3>
              <dl className="zas-admin-details">
                <div><dt>Nama</dt><dd>{submission.name}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${submission.email}`}>{submission.email}</a></dd></div>
                {submission.phone && <div><dt>Telepon</dt><dd>{submission.phone}</dd></div>}
                {submission.resolvedAt && (
                  <div><dt>Diselesaikan</dt><dd>{submission.resolvedAt.toLocaleString("id-ID")}</dd></div>
                )}
              </dl>
              <p className="zas-contact-submission-message">{submission.message}</p>
              <ContactStatusForm contactId={submission.id} status={submission.status} />
            </article>
          ))}
        </div>
      )}
      {submissions.length === 50 && (
        <p className="zas-registration-privacy">
          Menampilkan 50 kiriman terbaru. Gunakan pencarian atau filter status untuk mempersempit daftar.
        </p>
      )}
    </main>
  );
}
