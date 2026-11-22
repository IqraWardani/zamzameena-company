import { redirect } from "next/navigation";
import { createEvent } from "@/app/admin/events/actions";
import { EventWizard } from "@/components/admin/event-create-wizard";
import { AdminSharedDashboard } from "@/components/admin/admin-shared-dashboard";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { requireAdminPermission } from "@/lib/admin/authorization";

export default async function NewAdminEventPage() {
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.create,
    "/admin/events/new",
  );
  if (!session) redirect("/admin/login");
  if (!decision.allowed) redirect("/admin/access-denied");

  return (
    <main className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <p className="zas-admin-eyebrow">PENGELOLAAN EVENT</p>
          <h1>Buat Event Baru</h1>
          <p>
            Lengkapi informasi dasar dan waktu/lokasi. Event disimpan sebagai draft
            dan dapat dikelola lebih lanjut setelah tersimpan.
          </p>
        </div>
      </header>
      <AdminSharedDashboard session={session} />
      <section className="zas-admin-card zas-admin-wide-card">
        <EventWizard action={createEvent} />
      </section>
    </main>
  );
}
