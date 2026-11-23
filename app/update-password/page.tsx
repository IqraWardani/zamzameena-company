import type { Metadata } from "next";
import Link from "next/link";
import { UpdatePasswordForm } from "@/components/admin/update-password-form";

export const metadata: Metadata = {
  title: "Update Password",
  robots: { index: false, follow: false },
};

export default function UpdatePasswordPage() {
  return (
    <main className="zas-admin-page zas-admin-login-page">
      <section
        aria-labelledby="update-password-title"
        className="zas-admin-card zas-admin-login-card"
      >
        <p className="zas-admin-eyebrow">ZAMZAMEENA AINSA SYNERGY</p>
        <h1 id="update-password-title">Update Password</h1>
        <p>Choose a new password for your account.</p>
        <UpdatePasswordForm />
        <Link className="zas-admin-text-link" href="/admin/login">
          Back to Admin sign in
        </Link>
      </section>
    </main>
  );
}
