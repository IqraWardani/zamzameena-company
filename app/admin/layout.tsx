import type { Metadata } from "next";
import { AdminPageTransition } from "@/components/admin/admin-page-transition";
import { DashboardBackLink } from "@/components/admin/dashboard-back-link";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="zas-admin-route">
      <AdminPageTransition>
        {children}
        <DashboardBackLink />
      </AdminPageTransition>
    </div>
  );
}
