"use client";

import { useState, type FormEvent } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = new URL("/update-password", window.location.origin).toString();
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo },
      );
      if (requestError) {
        console.error("Supabase password recovery request failed.", requestError.message);
        setError("Unable to send the reset link. Check the email and try again.");
        return;
      }

      setMessage(
        "If an account exists for this email, a password reset link will be sent.",
      );
    } catch (requestError) {
      console.error(
        "Password recovery request could not be completed.",
        requestError instanceof Error ? requestError.message : "Unknown error",
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send the reset link. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="zas-admin-login-form" onSubmit={handleSubmit}>
      <label htmlFor="recovery-email">Email address</label>
      <input
        autoComplete="email"
        id="recovery-email"
        maxLength={320}
        onChange={(event) => setEmail(event.currentTarget.value)}
        required
        type="email"
        value={email}
      />
      {error && (
        <p className="zas-admin-login-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="zas-password-recovery-message is-success" role="status">
          {message}
        </p>
      )}
      <button disabled={pending} type="submit">
        {pending ? "Sending..." : "Send Reset Link"}
      </button>
    </form>
  );
}
