import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { SalesMemberForm } from "@/components/admin/sales-member-form";
import {
  SalesDashboardSections,
  type SalesPageSearchParams,
} from "@/components/admin/sales-dashboard-sections";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";
import { saveSalesMember } from "@/lib/sales/actions";
import type { SalesPosition } from "@/lib/sales/labels";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function SalesManagementPage({
  searchParams,
}: {
  searchParams: Promise<SalesPageSearchParams>;
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
  const sequenceRowsPromise = canManage
    ? prisma.salesReferralSequence.findMany({
      where: { eventId: event.id },
      select: { position: true, lastValue: true },
    })
    : Promise.resolve([]);
  const [supervisorRows, sequenceRows] = await Promise.all([
    prisma.salesMember.findMany({
      where: { eventId: event.id, status: "active" },
      select: {
        id: true,
        position: true,
        person: { select: { fullName: true } },
      },
      orderBy: [{ position: "asc" }, { person: { fullName: "asc" } }],
    }),
    sequenceRowsPromise,
  ]);
  const supervisors = supervisorRows.map((member) => ({
    id: member.id,
    fullName: member.person.fullName,
    position: member.position,
  }));
  const counts: Record<SalesPosition, number> = {
    director: 0,
    arm: 0,
    branch_manager: 0,
    sales: 0,
  };
  for (const supervisor of supervisors) {
    counts[supervisor.position] += 1;
  }
  const totalMembers = Object.values(counts).reduce((total, count) => total + count, 0);
  const nextSequenceByPosition = Object.fromEntries(
    sequenceRows.map(({ position, lastValue }) => [position, lastValue + 1]),
  ) as Partial<Record<SalesPosition, number>>;
  const addMemberAction = saveSalesMember.bind(null, event.id, null);

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
            eventId={event.id}
            formId="sales-member-create"
            nextSequenceByPosition={nextSequenceByPosition}
            supervisors={supervisors}
          />
        </details>
      )}

      <SalesDashboardSections
        canManage={canManage}
        event={event}
        query={query}
        supervisors={supervisors}
      />
    </main>
  );
}
