import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/admin/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="zas-admin-page zas-admin-login-page">
      <section
        aria-labelledby="forgot-password-title"
        className="zas-admin-card zas-admin-login-card"
      >
        <p className="zas-admin-eyebrow">ZAMZAMEENA AINSA SYNERGY</p>
        <h1 id="forgot-password-title">Forgot Password</h1>
        <p>Enter your administrator email and we will send a password reset link.</p>
        <ForgotPasswordForm />
        <Link className="zas-admin-text-link" href="/admin/login">
          Back to Admin sign in
        </Link>
      </section>
    </main>
  );
}
