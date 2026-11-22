"use client";

import Link from "next/link";
import { login, type LoginFormState } from "@/app/admin/actions";
import { usePreservedActionState } from "@/components/admin/use-preserved-action-state";

const initialState: LoginFormState = {};

export function AdminLoginForm() {
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(login, initialState);

  return (
    <form action={formAction} className="zas-admin-login-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor="admin-email">Email address</label>
      <input
        autoComplete="username"
        id="admin-email"
        name="email"
        type="email"
        maxLength={320}
        required
      />

      <label htmlFor="admin-password">Password</label>
      <input
        autoComplete="current-password"
        id="admin-password"
        name="password"
        type="password"
        maxLength={256}
        required
      />

      {state.error && (
        <p className="zas-admin-login-error" role="alert">
          {state.error}
        </p>
      )}

      <button disabled={pending} type="submit">
        {pending ? "Signing in..." : "Sign in"}
      </button>
      <Link className="zas-admin-text-link" href="/forgot-password">
        Forgot Password?
      </Link>
    </form>
  );
}
