import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import type { ParticipantManagementRow } from "@/components/admin/participant-management-table";
import type { AdminSummaryMetric } from "@/components/admin/admin-summary-cards";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { getParticipantPaymentStatus, getParticipantPaymentWhere } from "@/lib/payments/participant-status";
import { REGISTRATION_DETAIL_ANSWER_KEYS } from "@/lib/registration/validation";
import { prisma } from "@/lib/db";

const ParticipantManagementTable = dynamic(
  () =>
    import("@/components/admin/participant-management-table").then(
      (mod) => mod.ParticipantManagementTable,
    ),
  {
    loading: () => (
      <div className="zas-admin-card zas-admin-wide-card">
        <div className="zas-admin-skeleton-table" style={{ minHeight: "360px" }}>
          <div className="zas-admin-skeleton-table-header" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div className="zas-admin-skeleton-table-row" key={i} />
          ))}
        </div>
      </div>
    ),
  },
);

export const metadata: Metadata = {
  title: "Manajemen Peserta",
  robots: { index: false, follow: false },
};

type AdminPaymentReviewPageProps = {
  searchParams: Promise<{
    q?: string;
    eventId?: string;
    payment?: string;
    invitation?: string;
    ticket?: string;
    page?: string;
    perPage?: string;
    notice?: string;
  }>;
};

const PAGE_SIZES = [10, 25, 50, 100] as const;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

export default async function AdminPaymentReviewPage({
  searchParams,
}: AdminPaymentReviewPageProps) {
  const params = await searchParams;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.reviewPayments,
    "/admin/payments",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const events = session.eventIds.length
    ? await prisma.event.findMany({
        where: { id: { in: [...session.eventIds] } },
        select: { id: true, name: true, slug: true, startsAt: true },
        orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      })
    : [];
  if (events.length === 0) {
    return (
      <main className="zas-admin-page">
        <header className="zas-admin-header">
          <div>
            <p className="zas-admin-eyebrow">MANAJEMEN PESERTA</p>
          <h1>Tidak ada event yang ditugaskan</h1>
          <p>Data peserta hanya tersedia untuk event yang ditugaskan ke akun Anda.</p>
          </div>
        </header>
        <AdminSharedDashboard session={session} />
      </main>
    );
  }

  const defaultEvent = events.find((event) => event.slug === "synergy-preneur-summit-2027") ??
    events[0];
  const selectedEventId = events.some((event) => event.id === params.eventId)
    ? params.eventId!
    : defaultEvent.id;
  const selectedEvent = events.find((event) => event.id === selectedEventId)!;
  const requestedPayment = params.payment === "paid" || params.payment === "unpaid"
    ? params.payment
    : "all";
  const requestedInvitation =
    params.invitation === "collected" || params.invitation === "uncollected"
      ? params.invitation
      : "all";
  const selectedTicketId = params.ticket &&
      UUID_PATTERN.test(params.ticket)
      ? params.ticket
      : "";
  const search = params.q?.trim().slice(0, 120) ?? "";
  const perPage = PAGE_SIZES.includes(Number(params.perPage) as (typeof PAGE_SIZES)[number])
    ? Number(params.perPage)
    : 25;
  const requestedPage = boundedInteger(params.page, 1, 1, 1_000_000);

  const [ticketTypes, summary] = await Promise.all([
    prisma.ticketType.findMany({
      where: { eventId: selectedEvent.id },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    Promise.all([
      prisma.registration.count({ where: { eventId: selectedEvent.id } }),
      prisma.registration.count({
        where: {
          eventId: selectedEvent.id,
          ...getParticipantPaymentWhere("paid"),
        },
      }),
      prisma.registration.count({
        where: {
          eventId: selectedEvent.id,
          ...getParticipantPaymentWhere("unpaid"),
        },
      }),
      prisma.registration.count({
        where: {
          eventId: selectedEvent.id,
          invitationCollection: { isNot: null },
        },
      }),
      prisma.registration.count({
        where: {
          eventId: selectedEvent.id,
          invitationCollection: { is: null },
        },
      }),
    ]),
  ]);
  const ticketId = ticketTypes.some(({ id }) => id === selectedTicketId)
    ? selectedTicketId
    : "";

  const where: Prisma.RegistrationWhereInput = {
    eventId: selectedEvent.id,
    ...(ticketId ? { ticketTypeId: ticketId } : {}),
    ...(requestedInvitation === "collected"
      ? { invitationCollection: { isNot: null } }
      : requestedInvitation === "uncollected"
        ? { invitationCollection: { is: null } }
        : {}),
    ...(requestedPayment !== "all"
      ? getParticipantPaymentWhere(requestedPayment)
      : {}),
    ...(search
      ? {
          OR: [
            {
              participantProfile: {
                fullName: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              participantProfile: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
            {
              participantProfile: {
                phone: { contains: search },
              },
            },
            {
              invoices: {
                some: {
                  OR: [
                    { invoiceNumber: { contains: search, mode: "insensitive" as const } },
                    { legacyInvoiceNumber: { contains: search, mode: "insensitive" as const } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (requestedPage - 1) * perPage;
  const [filteredTotal, registrations] = await Promise.all([
    prisma.registration.count({ where }),
    prisma.registration.findMany({
      where,
      orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
      skip,
      take: perPage,
      select: {
        id: true,
        registrationNumber: true,
        registeredAt: true,
        status: true,
        participantProfile: {
          select: {
            fullName: true,
            email: true,
            phone: true,
            organizationName: true,
            jobTitle: true,
            city: true,
          },
        },
        answers: {
          where: { fieldKey: { in: [...REGISTRATION_DETAIL_ANSWER_KEYS] } },
          select: { fieldKey: true, answer: true },
        },
        event: { select: { name: true } },
        ticketType: { select: { id: true, name: true, priceAmount: true, currency: true } },
        invoices: {
          orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
          select: {
            invoiceNumber: true,
            legacyInvoiceNumber: true,
            status: true,
            amountDue: true,
            currency: true,
            paidAt: true,
            payments: {
              orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
              take: 1,
              select: {
                id: true,
                status: true,
                amountPaid: true,
                paidAt: true,
                submittedAt: true,
                reviewedAt: true,
                reviewNote: true,
                reviewedBy: { select: { fullName: true } },
              },
            },
          },
        },
        invitationCollection: {
          select: {
            collectedAt: true,
            method: true,
            collectedBy: { select: { fullName: true } },
          },
        },
      },
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(filteredTotal / perPage));
  const page = Math.min(requestedPage, pageCount);

  const paymentIds = registrations.flatMap((registration) =>
    registration.invoices.flatMap((invoice) =>
      invoice.payments.map((payment) => payment.id),
    ),
  );
  const documents = paymentIds.length
    ? await prisma.privateDocument.findMany({
        where: {
          ownerType: "payment",
          ownerId: { in: paymentIds },
          kind: "payment_proof",
          deletedAt: null,
        },
        select: { id: true, ownerId: true, originalFilename: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      })
    : [];
  const documentsByPayment = new Map(
    documents.map((document) => [document.ownerId, document]),
  );

  const participants: ParticipantManagementRow[] = registrations.map((registration) => {
    const answers = new Map(
      registration.answers.map(({ fieldKey, answer }) => [
        fieldKey,
        typeof answer === "string" ? answer : JSON.stringify(answer) ?? "",
      ]),
    );
    const invoice =
      registration.invoices.find((item) =>
        item.status === "paid" ||
        item.payments.some((payment) => payment.status === "approved"),
      ) ??
      registration.invoices.find((item) =>
        item.payments.some((payment) => payment.status === "submitted"),
      ) ??
      registration.invoices[0] ??
      null;
    const payment = invoice?.payments[0] ?? null;
    const status = getParticipantPaymentStatus({
      registrationStatus: registration.status,
      invoiceStatus: registration.invoices.some((item) => item.status === "paid")
        ? "paid"
        : invoice?.status ?? null,
      hasApprovedPayment: registration.invoices.some((item) =>
        item.payments.some((claim) => claim.status === "approved"),
      ),
      ticketPrice: registration.ticketType.priceAmount.toString(),
    });
    const document = payment ? documentsByPayment.get(payment.id) : null;

    return {
      id: registration.id,
      participantName: registration.participantProfile.fullName,
      email: registration.participantProfile.email,
      phone: registration.participantProfile.phone,
      profileDetails: {
        organizationName: registration.participantProfile.organizationName,
        jobTitle: registration.participantProfile.jobTitle,
        city: registration.participantProfile.city,
      },
      registrationDetails: {
        domicileAddress: answers.get("domicile_address") ?? null,
        identityAddress: answers.get("identity_address") ?? null,
        businessComment: answers.get("business_comment") ?? null,
      },
      registrationNumber: registration.registrationNumber,
      registeredAt: registration.registeredAt.toISOString(),
      eventName: registration.event.name,
      ticketName: registration.ticketType.name,
      ticketPrice: registration.ticketType.priceAmount.toString(),
      ticketCurrency: registration.ticketType.currency.trim(),
      paymentStatus: status,
      invoice: invoice
        ? {
            number: invoice.invoiceNumber,
            legacyNumber: invoice.legacyInvoiceNumber,
            status: invoice.status,
            amountDue: invoice.amountDue.toString(),
            currency: invoice.currency.trim(),
          }
        : null,
      payment: payment
        ? {
            id: payment.id,
            status: payment.status,
            amountPaid: payment.amountPaid.toString(),
            paidAt: payment.paidAt?.toISOString() ?? null,
            submittedAt: payment.submittedAt.toISOString(),
            reviewedAt: payment.reviewedAt?.toISOString() ?? null,
            reviewNote: payment.reviewNote,
            reviewerName: payment.reviewedBy?.fullName ?? null,
            proof: document
              ? { id: document.id, filename: document.originalFilename }
              : null,
          }
        : null,
      invitation: registration.invitationCollection
        ? {
            collectedAt: registration.invitationCollection.collectedAt.toISOString(),
            method: registration.invitationCollection.method,
            collectorName: registration.invitationCollection.collectedBy.fullName,
          }
        : null,
    };
  });

  function pageHref(nextPage: number) {
    const query = new URLSearchParams({
      eventId: selectedEvent.id,
      page: String(nextPage),
      perPage: String(perPage),
    });
    if (search) query.set("q", search);
    if (requestedPayment !== "all") query.set("payment", requestedPayment);
    if (requestedInvitation !== "all") query.set("invitation", requestedInvitation);
    if (ticketId) query.set("ticket", ticketId);
    return `/admin/payments?${query.toString()}`;
  }

  const returnTo = pageHref(page);
  const summaryCards: AdminSummaryMetric[] = [
    {
      label: "Total Peserta",
      value: summary[0],
      description: "Total registrasi event",
      icon: "participants",
      tone: "participants",
    },
    {
      label: "Paid",
      value: summary[1],
      description: "Pembayaran terverifikasi",
      icon: "paid",
      tone: "paid",
    },
    {
      label: "Unpaid",
      value: summary[2],
      description: "Menunggu pembayaran",
      icon: "unpaid",
      tone: "unpaid",
    },
    {
      label: "Undangan Sudah Diambil",
      value: summary[3],
      description: "Peserta telah mengambil undangan",
      icon: "collected",
      tone: "collected",
    },
    {
      label: "Undangan Belum Diambil",
      value: summary[4],
      description: "Peserta belum mengambil undangan",
      icon: "uncollected",
      tone: "uncollected",
    },
  ];

  return (
    <main className="zas-admin-page zas-participant-management">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">ZAMZAMEENA · EVENT OPERATIONS</p>
          <h1>Manajemen Peserta</h1>
          <p>{selectedEvent.name} · Data peserta, pembayaran, dan pengambilan undangan.</p>
        </div>
      </header>
      {params.notice === "payment-confirmed" && (
        <p className="zas-payment-message zas-participant-success-notice" role="status">
          Pembayaran berhasil diverifikasi. Status peserta dan tiket telah diperbarui.
        </p>
      )}

      <AdminSharedDashboard
        additionalMetrics={summaryCards}
        ariaLabel="Ringkasan peserta"
        session={session}
        summaryClassName="zas-admin-payments-summary-grid"
      />

      <section aria-label="Filter peserta" className="zas-admin-card zas-admin-wide-card zas-participant-filter-card">
        <form action="/admin/payments" className="zas-participant-filter-form" role="search">
          <label className="zas-participant-search">
            <span>Cari peserta</span>
            <input
              autoComplete="off"
              defaultValue={search}
              maxLength={120}
              name="q"
              placeholder="Cari nama peserta, nomor invoice, email..."
              type="search"
            />
          </label>
          <label>
            <span>Event</span>
            <select defaultValue={selectedEvent.id} name="eventId">
              {events.map((event) => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Status Pembayaran</span>
            <select defaultValue={requestedPayment} name="payment">
              <option value="all">Semua</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </label>
          <label>
            <span>Status Undangan</span>
            <select defaultValue={requestedInvitation} name="invitation">
              <option value="all">Semua</option>
              <option value="collected">Sudah Diambil</option>
              <option value="uncollected">Belum Diambil</option>
            </select>
          </label>
          <label>
            <span>Jenis Tiket</span>
            <select defaultValue={ticketId} name="ticket">
              <option value="">Semua jenis tiket</option>
              {ticketTypes.map((ticket) => (
                <option key={ticket.id} value={ticket.id}>{ticket.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Baris per halaman</span>
            <select defaultValue={String(perPage)} name="perPage">
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>{size} baris</option>
              ))}
            </select>
          </label>
          <button className="zas-admin-primary-link" type="submit">Terapkan Filter</button>
        </form>
      </section>

      <section aria-labelledby="participant-list-title" className="zas-admin-card zas-admin-wide-card zas-participant-list-card">
        <div className="zas-admin-section-heading">
          <div>
            <p className="zas-admin-eyebrow">DATA PENDAFTARAN</p>
            <h2 id="participant-list-title">Daftar Peserta</h2>
          </div>
          <p className="zas-participant-result-count">
            {filteredTotal === 0
              ? "Tidak ada peserta"
              : `Menampilkan ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filteredTotal)} dari ${filteredTotal.toLocaleString("id-ID")} peserta`}
          </p>
        </div>
        {participants.length === 0 ? (
          <div className="zas-participant-empty-state">
            <h3>{search || requestedPayment !== "all" || requestedInvitation !== "all" || ticketId
              ? "Tidak ada peserta yang cocok"
              : "Belum ada peserta"}
            </h3>
            <p>Ubah filter atau kata pencarian untuk melihat peserta lainnya.</p>
          </div>
        ) : (
          <ParticipantManagementTable
            firstRowNumber={(page - 1) * perPage + 1}
            participants={participants}
            returnTo={returnTo}
          />
        )}
        {pageCount > 1 && (
          <nav aria-label="Halaman daftar peserta" className="zas-admin-pagination">
            <a
              aria-disabled={page <= 1}
              className={page <= 1 ? "is-disabled" : undefined}
              href={page <= 1 ? undefined : pageHref(page - 1)}
            >
              Sebelumnya
            </a>
            <span>Halaman {page} dari {pageCount}</span>
            <a
              aria-disabled={page >= pageCount}
              className={page >= pageCount ? "is-disabled" : undefined}
              href={page >= pageCount ? undefined : pageHref(page + 1)}
            >
              Berikutnya
            </a>
          </nav>
        )}
      </section>
    </main>
  );
}
