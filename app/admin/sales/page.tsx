import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import {
  ReferralCopyButtons,
  SalesMemberActions,
} from "@/components/admin/sales-member-actions";
import {
  SalesMemberForm,
  type SalesMemberFormValues,
} from "@/components/admin/sales-member-form";
import { SalesCharts } from "@/components/admin/sales-charts";
import { SalesAttributionForm } from "@/components/admin/sales-attribution-form";
import { saveSalesMember } from "@/lib/sales/actions";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";
import { SALES_POSITION_LABELS, type SalesPosition } from "@/lib/sales/labels";
import { calculateSalesTargetAchievement } from "@/lib/sales/target-achievement";

type SearchParams = {
  eventId?: string;
  q?: string;
  position?: string;
  supervisorId?: string;
  region?: string;
  status?: string;
};

type SalesPerformanceRow = {
  sales_member_id: string;
  paid_orders: bigint;
  paid_tickets: bigint;
  paid_amount: Prisma.Decimal;
  commission_net: Prisma.Decimal;
};

type SalesTrendRow = {
  sale_date: string;
  sales_member_id: string | null;
  paid_tickets: number;
};

function getPaymentBadge(
  registrationStatus: string,
  invoiceStatus: string | null,
  attributionCorrected = false,
) {
  if (registrationStatus === "confirmed" || invoiceStatus === "paid") {
    const isPaid = invoiceStatus === "paid";
    return {
      label: isPaid ? "PAID" : "CONFIRMED",
      className: isPaid
        ? `is-paid is-status-centered${attributionCorrected ? " is-attribution-corrected" : ""}`
        : "is-paid",
    };
  }

  if (registrationStatus === "payment_submitted" || invoiceStatus === "payment_submitted") {
    return { label: "PENDING", className: "is-pending" };
  }

  if (registrationStatus === "payment_rejected" || invoiceStatus === "rejected") {
    return { label: "REJECTED", className: "is-unpaid" };
  }

  if (invoiceStatus === "pending" || registrationStatus === "pending_payment") {
    return { label: "UNPAID", className: "is-unpaid is-status-centered" };
  }

  if (invoiceStatus === "void" || invoiceStatus === "expired") {
    return {
      label: invoiceStatus.toUpperCase(),
      className: "is-free",
    };
  }

  if (registrationStatus === "cancelled" || registrationStatus === "expired") {
    return {
      label: registrationStatus.toUpperCase(),
      className: "is-free",
    };
  }

  return { label: "NO INVOICE", className: "is-free" };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formatIdr(amount: Prisma.Decimal | string | number): string {
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formValues(member: {
  personId: string;
  position: SalesPosition;
  fullName: string;
  memberCode: string;
  phone: string;
  email: string | null;
  region: string;
  supervisorMemberId: string | null;
  joinedAt: Date;
  referralCode: string;
  quotaAmount: Prisma.Decimal;
}): SalesMemberFormValues {
  return {
    personId: member.personId,
    position: member.position,
    fullName: member.fullName,
    memberCode: member.memberCode,
    phone: member.phone,
    email: member.email,
    region: member.region,
    supervisorMemberId: member.supervisorMemberId,
    joinedAt: member.joinedAt.toISOString().slice(0, 10),
    referralCode: member.referralCode,
    quotaAmount: member.quotaAmount.toString(),
  };
}

export default async function SalesManagementPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const { session, decision } = await requireAdminPermission(
    "sales.read",
    "/admin/sales",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  const assignedEvents = session.eventIds.length
    ? await prisma.event.findMany({
      where: { id: { in: [...session.eventIds] } },
      select: { id: true, name: true, slug: true, eventCode: true, timezone: true },
        orderBy: [{ startsAt: "desc" }, { name: "asc" }],
      })
    : [];
  const selectedEventId = UUID_PATTERN.test(query.eventId ?? "")
    ? query.eventId
    : assignedEvents[0]?.id;
  const event = assignedEvents.find((item) => item.id === selectedEventId);
  if (!event) {
    return (
      <main className="zas-admin-page zas-sales-page">
        <header className="zas-admin-header">
          <div>
            <p className="zas-admin-eyebrow">ZAS SALES MANAGEMENT</p>
            <h1>Manajemen Penjual</h1>
            <p>Data penjualan hanya tersedia untuk event yang ditugaskan ke akun Anda.</p>
          </div>
        </header>
        <AdminSharedDashboard session={session} />
        <section className="zas-admin-card zas-admin-wide-card">
          <h2>Belum ada event yang ditugaskan</h2>
          <p>Hubungi administrator agar event ditambahkan ke penugasan akun Anda.</p>
        </section>
      </main>
    );
  }

  const canManage =
    session.permissions.includes("sales.manage") &&
    !session.roleCodes?.includes("marketing_director");
  const positionFilter = ["director", "arm", "branch_manager", "sales"].includes(query.position ?? "")
    ? query.position as SalesPosition
    : undefined;
  const statusFilter = query.status === "inactive" ? "inactive" : "active";
  const supervisorFilter = UUID_PATTERN.test(query.supervisorId ?? "")
    ? query.supervisorId
    : undefined;
  const search = query.q?.trim().slice(0, 100);
  const region = query.region?.trim().slice(0, 160);
  const memberWhere = {
    eventId: event.id,
    ...(positionFilter ? { position: positionFilter } : {}),
    ...(statusFilter ? { status: statusFilter as "active" | "inactive" } : {}),
    ...(supervisorFilter ? { supervisorMemberId: supervisorFilter } : {}),
    ...(region ? { region: { contains: region, mode: "insensitive" as const } } : {}),
    ...(search
      ? {
          OR: [
            { person: { is: { fullName: { contains: search, mode: "insensitive" as const } } } },
            { person: { is: { memberCode: { contains: search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };
  const [allMembers, members, registrations, countRows, performanceRows, trendRows, ledger, people, sequenceRows, eventTicketCapacities, paidTicketAggregate] = await Promise.all([
    prisma.salesMember.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        position: true,
        status: true,
        person: { select: { fullName: true } },
      },
    }),
    prisma.salesMember.findMany({
      where: memberWhere,
      select: {
        id: true,
        personId: true,
        position: true,
        person: {
          select: { fullName: true, memberCode: true, phone: true, email: true },
        },
        region: true,
        status: true,
        joinedAt: true,
        referralCode: true,
        quotaAmount: true,
        supervisorMemberId: true,
        supervisor: {
          select: {
            id: true,
            position: true,
            person: { select: { fullName: true } },
          },
        },
        _count: { select: { subordinates: true, registrations: true } },
      },
      orderBy: [{ position: "asc" }, { person: { fullName: "asc" } }],
    }),
    prisma.registration.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        registrationNumber: true,
        status: true,
        registeredAt: true,
        referralCodeSnapshot: true,
        participantProfile: { select: { fullName: true } },
        salesMember: {
          select: { person: { select: { fullName: true, memberCode: true } } },
        },
        ticketType: { select: { name: true } },
        invoices: {
          select: { amountDue: true, status: true },
          orderBy: [{ issuedAt: "desc" }],
          take: 1,
        },
        salesCommissions: { select: { amount: true } },
      },
      orderBy: [{ registeredAt: "desc" }, { id: "desc" }],
      take: 30,
    }),
    prisma.salesMember.groupBy({
      by: ["position"],
      where: { eventId: event.id, status: "active" },
      _count: { _all: true },
    }),
    prisma.$queryRaw<SalesPerformanceRow[]>(Prisma.sql`
      SELECT
        member.id AS sales_member_id,
        COUNT(DISTINCT registration.id) FILTER (
          WHERE invoice.status = 'paid' AND invoice.paid_at IS NOT NULL
        ) AS paid_orders,
        COALESCE(SUM(invoice.quantity) FILTER (
          WHERE invoice.status = 'paid' AND invoice.paid_at IS NOT NULL
        ), 0) AS paid_tickets,
        COALESCE(SUM(invoice.amount_due) FILTER (
          WHERE invoice.status = 'paid' AND invoice.paid_at IS NOT NULL
        ), 0)::numeric(14, 2) AS paid_amount,
        COALESCE(commission.total, 0)::numeric(14, 2) AS commission_net
      FROM sales_members AS member
      LEFT JOIN registrations AS registration
        ON registration.seller_member_id = member.id
      LEFT JOIN invoices AS invoice ON invoice.registration_id = registration.id
      LEFT JOIN (
        SELECT sales_member_id, SUM(amount) AS total
        FROM sales_commissions
        GROUP BY sales_member_id
      ) AS commission ON commission.sales_member_id = member.id
      WHERE member.event_id = ${event.id}::uuid
      GROUP BY member.id, commission.total
    `),
    prisma.$queryRaw<SalesTrendRow[]>(Prisma.sql`
      SELECT
        TO_CHAR(
          DATE_TRUNC('day', invoice.paid_at AT TIME ZONE ${event.timezone}),
          'YYYY-MM-DD'
        ) AS sale_date,
        registration.seller_member_id AS sales_member_id,
        COALESCE(SUM(invoice.quantity), 0)::int AS paid_tickets
      FROM invoices AS invoice
      INNER JOIN registrations AS registration
        ON registration.id = invoice.registration_id
      WHERE registration.event_id = ${event.id}::uuid
        AND invoice.status = 'paid'
        AND invoice.paid_at IS NOT NULL
      GROUP BY registration.seller_member_id, sale_date
      ORDER BY sale_date ASC, sales_member_id ASC
    `),
    prisma.salesCommission.findMany({
      where: { salesMember: { eventId: event.id } },
      select: {
        id: true,
        entryType: true,
        amount: true,
        currency: true,
        note: true,
        createdAt: true,
        salesMember: {
          select: { person: { select: { fullName: true, memberCode: true } } },
        },
        registration: { select: { registrationNumber: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 50,
    }),
    prisma.salesPerson.findMany({
      where: { memberships: { none: { eventId: event.id } } },
      select: { id: true, fullName: true, memberCode: true },
      orderBy: [{ fullName: "asc" }, { memberCode: "asc" }],
    }),
    prisma.salesReferralSequence.findMany({
      where: { eventId: event.id },
      select: { position: true, lastValue: true },
    }),
    prisma.ticketType.findMany({
      where: { eventId: event.id },
      select: { capacity: true },
    }),
    prisma.invoice.aggregate({
      where: {
        status: "paid",
        paidAt: { not: null },
        registration: { is: { eventId: event.id } },
      },
      _sum: { quantity: true },
    }),
  ]);
  const correctedRegistrationRows = registrations.length
    ? await prisma.auditLog.findMany({
      where: {
        eventId: event.id,
        entityType: "registration",
        action: "sales_attribution_corrected",
        entityId: { in: registrations.map(({ id }) => id) },
      },
      select: { entityId: true },
    })
    : [];
  const correctedRegistrationIds = new Set(
    correctedRegistrationRows
      .map(({ entityId }) => entityId)
      .filter((entityId): entityId is string => entityId !== null),
  );
  const activeCounts = new Map(
    countRows.map(({ position, _count }) => [position, _count._all]),
  );
  const performance = new Map(
    performanceRows.map((row) => [row.sales_member_id, row]),
  );
  const counts = {
    director: activeCounts.get("director") ?? 0,
    arm: activeCounts.get("arm") ?? 0,
    branch_manager: activeCounts.get("branch_manager") ?? 0,
    sales: activeCounts.get("sales") ?? 0,
  };
  const totalMembers = counts.director + counts.arm + counts.branch_manager + counts.sales;
  const hasUnlimitedTicketType = eventTicketCapacities.some(
    ({ capacity }) => capacity === null,
  );
  const eventQuota = eventTicketCapacities.length > 0 && !hasUnlimitedTicketType
    ? eventTicketCapacities.reduce((total, { capacity }) => total + (capacity ?? 0), 0)
    : null;
  const paidTickets = paidTicketAggregate._sum.quantity ?? 0;
  const targetAchievement = calculateSalesTargetAchievement(paidTickets, eventQuota);
  const formatTicketCount = (count: number) => new Intl.NumberFormat("id-ID").format(count);
  const supervisors = allMembers
    .filter((member) => member.status === "active")
    .map((member) => ({
      id: member.id,
      fullName: member.person.fullName,
      position: member.position,
    }));
  const addMemberAction = saveSalesMember.bind(null, event.id, null);
  const performers = allMembers.map((member) => ({
    id: member.id,
    name: member.person.fullName,
    position: member.position,
    tickets: Number(performance.get(member.id)?.paid_tickets ?? 0),
  }));
  const nextSequenceByPosition = Object.fromEntries(
    sequenceRows.map(({ position, lastValue }) => [position, lastValue + 1]),
  ) as Partial<Record<SalesPosition, number>>;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: event.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <main className="zas-admin-page zas-sales-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">ZAS SALES MANAGEMENT</p>
          <h1>Manajemen Penjual</h1>
          <p>Struktur, kuota, atribusi referral, dan performa penjualan.</p>
        </div>
        <Link className="zas-admin-primary-link" href="/admin/events">Daftar Event</Link>
      </header>
      <AdminSharedDashboard session={session} showSummary={false} />

      <section className="zas-admin-card zas-admin-wide-card zas-sales-toolbar">
        <form action="/admin/sales" className="zas-sales-event-filter">
          <label htmlFor="sales-event">Event yang dipantau</label>
          <div className="zas-sales-event-controls">
            <select defaultValue={event.id} id="sales-event" name="eventId">
              {assignedEvents.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            <button className="zas-admin-primary-link" type="submit">Buka</button>
          </div>
        </form>
        <div className="zas-sales-structure-summary">
          <span><small>Direktur Pemasaran</small><strong>{counts.director}<em> / 1</em></strong></span>
          <span><small>ARM</small><strong>{counts.arm}<em> / 5</em></strong></span>
          <span><small>Kepala Cabang</small><strong>{counts.branch_manager}<em> / 25</em></strong></span>
          <span><small>Sales</small><strong>{counts.sales}<em> / 50</em></strong></span>
          <span><small>Total anggota</small><strong>{totalMembers}<em> / 81</em></strong></span>
        </div>
      </section>

      {canManage && (
        <details className="zas-admin-card zas-admin-wide-card zas-sales-add-panel">
          <summary>Tambah Anggota</summary>
          <p>Harga tiket dikelola di Daftar Event dan tidak dapat diubah dari modul ini.</p>
          <SalesMemberForm
            action={addMemberAction}
            eventCode={event.eventCode}
            formId="sales-member-create"
            nextSequenceByPosition={nextSequenceByPosition}
            people={people}
            supervisors={supervisors}
          />
        </details>
      )}

      <section
        aria-labelledby="sales-target-achievement-title"
        className="zas-admin-card zas-admin-wide-card zas-sales-target-achievement"
      >
        <div className="zas-sales-target-heading">
          <div>
            <h2 id="sales-target-achievement-title">Sales Target Achievement</h2>
            <p>{event.name}</p>
          </div>
          <strong>
            {targetAchievement.percentage === null
              ? "—"
              : `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(targetAchievement.percentage)}%`}
          </strong>
        </div>
        <div
          aria-label="Pencapaian target penjualan tiket"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={targetAchievement.progressPercent}
          aria-valuetext={targetAchievement.percentage === null
            ? "Target tidak tersedia atau tanpa batas"
            : `${targetAchievement.percentage.toFixed(1)}% tercapai`}
          className="zas-sales-target-progress"
          role="progressbar"
        >
          <span style={{ width: `${targetAchievement.progressPercent}%` }} />
        </div>
        <div className="zas-sales-target-metrics">
          <div>
            <span>Terjual (PAID)</span>
            <strong>{formatTicketCount(paidTickets)} tiket</strong>
          </div>
          <div>
            <span>Total kuota tiket</span>
            <strong>
              {hasUnlimitedTicketType
                ? "Tanpa batas"
                : eventTicketCapacities.length === 0
                  ? "Belum ditentukan"
                  : `${formatTicketCount(eventQuota ?? 0)} tiket`}
            </strong>
          </div>
          <div>
            <span>Sisa target</span>
            <strong>
              {targetAchievement.remaining === null
                ? "—"
                : `${formatTicketCount(targetAchievement.remaining)} tiket`}
            </strong>
          </div>
        </div>
      </section>

      <SalesCharts
        performers={performers}
        today={today}
        trend={trendRows.map((row) => ({
          date: row.sale_date,
          salesMemberId: row.sales_member_id,
          tickets: row.paid_tickets,
        }))}
      />

      <section className="zas-admin-card zas-admin-wide-card">
        <h2>Struktur Penjualan</h2>
        <form action="/admin/sales" className="zas-sales-filter-form">
          <input name="eventId" type="hidden" value={event.id} />
          <label>
            Cari nama atau kode
            <input defaultValue={query.q ?? ""} maxLength={100} name="q" />
          </label>
          <label>
            Jabatan
            <select defaultValue={positionFilter ?? ""} name="position">
              <option value="">Semua jabatan</option>
              <option value="director">Direktur Pemasaran</option>
              <option value="arm">ARM</option>
              <option value="branch_manager">Kepala Cabang</option>
              <option value="sales">Sales</option>
            </select>
          </label>
          <label>
            Atasan
            <select defaultValue={supervisorFilter ?? ""} name="supervisorId">
              <option value="">Semua atasan</option>
              {supervisors.map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>{supervisor.fullName}</option>
              ))}
            </select>
          </label>
          <label>
            Wilayah
            <input defaultValue={query.region ?? ""} maxLength={160} name="region" />
          </label>
          <label>
            Status
            <select defaultValue={statusFilter} name="status">
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </label>
          <div className="zas-sales-filter-actions">
            <button className="zas-admin-primary-link" type="submit">Terapkan filter</button>
            <Link className="zas-admin-secondary-button" href={`/admin/sales?eventId=${event.id}`}>Reset filter</Link>
          </div>
        </form>
        {members.length === 0 ? (
          <p className="zas-sales-empty">Belum ada anggota yang cocok dengan filter ini.</p>
        ) : (
          <div className={`zas-admin-table-wrap${members.length > 10 ? " zas-data-list-scroll" : ""}`}>
            <table aria-label="Struktur anggota penjualan" className="zas-admin-table zas-sales-table">
              <thead>
                <tr>
                  <th>Nama / kode</th>
                  <th>Jabatan</th>
                  <th>Atasan langsung</th>
                  <th>Wilayah kerja</th>
                  <th>Kuota Penjualan</th>
                  <th>Status</th>
                  <th>Performa</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const stats = performance.get(member.id);
                  const paidTickets = stats?.paid_tickets ?? BigInt(0);
                  const percent = member.quotaAmount.isZero()
                    ? 0
                    : Math.min(
                        100,
                        new Prisma.Decimal(paidTickets.toString())
                          .div(member.quotaAmount)
                          .mul(100)
                          .toNumber(),
                      );
                  const referralUrl =
                    `/events/${event.slug}/register?ref=${encodeURIComponent(member.referralCode)}`;
                  const editAction = saveSalesMember.bind(null, event.id, member.id);
                  return (
                    <tr key={member.id}>
                      <td>
                        <strong>{member.person.fullName}</strong>
                        <span className="zas-admin-table-secondary">{member.person.memberCode}</span>
                      </td>
                      <td>
                        <span>{SALES_POSITION_LABELS[member.position]}</span>
                      </td>
                      <td>
                        <span className="zas-admin-table-secondary">
                          {member.supervisor?.person.fullName ?? "Direktur Pemasaran"}
                        </span>
                      </td>
                      <td>{member.region}</td>
                      <td>
                        <strong>{member.quotaAmount.toString()} tiket</strong>
                      </td>
                      <td>
                        <span className={`zas-admin-status is-${member.status}`}>{member.status === "active" ? "Aktif" : "Nonaktif"}</span>
                      </td>
                      <td>
                        {paidTickets.toString()} tiket
                        <span className="zas-admin-table-secondary">
                          {Number(stats?.paid_orders ?? BigInt(0))} order · {percent.toFixed(0)}% target · komisi {formatIdr(stats?.commission_net ?? new Prisma.Decimal(0))}
                        </span>
                      </td>
                      <td>
                        <details className="zas-sales-member-detail">
                          <summary>Detail</summary>
                          <div>
                            <p><strong>Telepon:</strong> {member.person.phone}</p>
                            <p><strong>Email:</strong> {member.person.email ?? "—"}</p>
                            <p><strong>Bergabung:</strong> {member.joinedAt.toLocaleDateString("id-ID", { timeZone: "UTC" })}</p>
                            <p><strong>Kuota penjualan:</strong> {member.quotaAmount.toString()} tiket</p>
                            <p><strong>Referral:</strong></p>
                            <ReferralCopyButtons code={member.referralCode} link={referralUrl} />
                            {canManage && (
                              <>
                                <SalesMemberActions
                                  active={member.status === "active"}
                                  eventId={event.id}
                                  memberId={member.id}
                                  memberName={member.person.fullName}
                                />
                                <details className="zas-sales-edit-details">
                                  <summary>Edit anggota</summary>
                                  <SalesMemberForm
                                    action={editAction}
                                    eventCode={event.eventCode}
                                    formId={`sales-member-${member.id}`}
                                    supervisors={supervisors}
                                    values={formValues({
                                      personId: member.personId,
                                      position: member.position,
                                      fullName: member.person.fullName,
                                      memberCode: member.person.memberCode,
                                      phone: member.person.phone,
                                      email: member.person.email,
                                      region: member.region,
                                      supervisorMemberId: member.supervisorMemberId,
                                      joinedAt: member.joinedAt,
                                      referralCode: member.referralCode,
                                      quotaAmount: member.quotaAmount,
                                    })}
                                  />
                                </details>
                              </>
                            )}
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="zas-admin-card zas-admin-wide-card">
        <h2>Atribusi dan Transaksi Terbaru</h2>
        <p>Referral tersimpan pada registrasi dan tidak berubah jika kode anggota diperbarui. Koreksi Admin dicatat pada audit log.</p>
        <div className={`zas-admin-table-wrap${registrations.length > 10 ? " zas-data-list-scroll" : ""}`}>
          <table aria-label="Atribusi dan transaksi terbaru" className="zas-admin-table zas-sales-table">
            <thead>
              <tr>
                <th>Peserta / registrasi</th>
                <th>Tiket dan pembayaran</th>
                <th>Penjual / kode referral</th>
                <th>Nilai transaksi</th>
                <th>Komisi tercatat</th>
                {canManage && <th>Koreksi atribusi</th>}
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration) => {
                const paymentBadge = getPaymentBadge(
                  registration.status,
                  registration.invoices[0]?.status ?? null,
                  correctedRegistrationIds.has(registration.id),
                );
                return (
                  <tr key={registration.id}>
                    <td>
                      <strong>{registration.participantProfile.fullName}</strong>
                      <span className="zas-admin-table-secondary">
                        {registration.registrationNumber} · {registration.registeredAt.toLocaleString(
                          "id-ID",
                          { timeZone: "Asia/Jakarta" },
                        )}
                      </span>
                    </td>
                    <td>
                      {registration.ticketType.name}
                      <span className={`zas-admin-payment-badge ${paymentBadge.className}`}>
                        {paymentBadge.label}
                      </span>
                    </td>
                    <td>
                      {registration.salesMember?.person.fullName ?? "Tanpa referral"}
                      <span className="zas-admin-table-secondary">
                        {registration.referralCodeSnapshot ?? "—"}
                      </span>
                    </td>
                    <td>
                      {registration.invoices[0] ? (
                        <>
                          <strong>{formatIdr(registration.invoices[0].amountDue)}</strong>
                          <span className="zas-admin-table-secondary">
                            {registration.invoices[0].status.replaceAll("_", " ")}
                          </span>
                        </>
                      ) : "Gratis / belum ada invoice"}
                    </td>
                    <td>
                      {formatIdr(registration.salesCommissions.reduce(
                        (total, entry) => total.add(entry.amount),
                        new Prisma.Decimal(0),
                      ))}
                    </td>
                    {canManage && (
                      <td>
                        <SalesAttributionForm
                          currentReferralCode={registration.referralCodeSnapshot}
                          eventId={event.id}
                          registrationId={registration.id}
                        />
                      </td>
                    )}
                  </tr>
                );
              })}
              {registrations.length === 0 && (
                <tr><td colSpan={canManage ? 6 : 5}>Belum ada registrasi pada event ini.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="zas-admin-card zas-admin-wide-card">
        <h2>Ledger Komisi</h2>
        <p>Entri earned dibuat setelah pembayaran disetujui. Entri adjustment menyimpan koreksi tanpa menghapus riwayat.</p>
        <div className={`zas-admin-table-wrap${ledger.length > 10 ? " zas-data-list-scroll" : ""}`}>
          <table className="zas-admin-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Penjual</th>
                <th>Registrasi</th>
                <th>Jenis</th>
                <th>Nominal</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.createdAt.toLocaleString("id-ID", { timeZone: "UTC" })}</td>
                  <td>
                    {entry.salesMember.person.fullName}
                    <span className="zas-admin-table-secondary">{entry.salesMember.person.memberCode}</span>
                  </td>
                  <td>{entry.registration.registrationNumber}</td>
                  <td>{entry.entryType}</td>
                  <td>{formatIdr(entry.amount)} {entry.currency.trim()}</td>
                  <td>{entry.note ?? "—"}</td>
                </tr>
              ))}
              {ledger.length === 0 && <tr><td colSpan={6}>Belum ada komisi tercatat.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
