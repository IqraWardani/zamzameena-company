import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/admin/authorization";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <main className="zas-admin-page zas-admin-login-page">
      <section aria-labelledby="admin-login-title" className="zas-admin-card zas-admin-login-card">
        <p className="zas-admin-eyebrow">ZAMZAMEENA AINSA SYNERGY</p>
        <h1 id="admin-login-title">Admin sign in</h1>
        <p>Sign in with an authorized administrator account.</p>
        <AdminLoginForm />
      </section>
    </main>
  );
}
