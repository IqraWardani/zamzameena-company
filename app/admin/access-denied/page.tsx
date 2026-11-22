import type { Metadata } from "next";
import { logout } from "@/app/admin/actions";

export const metadata: Metadata = {
  title: "Access Denied",
  robots: { index: false, follow: false },
};

export default function AdminAccessDeniedPage() {
  return (
    <main className="zas-admin-page">
      <section aria-labelledby="access-denied-title" className="zas-admin-card">
        <p className="zas-admin-eyebrow">ZAS EVENT ADMINISTRATION</p>
        <h1 id="access-denied-title">Access denied</h1>
        <p>Your account does not have permission to access this area.</p>
        <form action={logout}>
          <button className="zas-admin-logout" type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}
