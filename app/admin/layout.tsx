import type { Metadata } from "next";
import { DashboardBackLink } from "@/components/admin/dashboard-back-link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="zas-admin-route">
      {children}
      <DashboardBackLink />
    </div>
  );
}
