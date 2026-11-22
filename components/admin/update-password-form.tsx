"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearAdminSessionAfterPasswordReset } from "@/app/admin/actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

const RECOVERY_MARKER = "zas-password-recovery-at";
const RECOVERY_SESSION_MAX_AGE = 60 * 60 * 1000;
const INVALID_LINK_MESSAGE =
  "This password reset link is invalid or has expired. Request a new link and try again.";

type RecoveryStatus = "checking" | "ready" | "invalid";

function getRecoveryUrlParams(): URLSearchParams {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  for (const [key, value] of hashParams) {
    if (!params.has(key)) params.set(key, value);
  }
  return params;
}

function isValidRecoveryMarker(): boolean {
  const timestamp = Number(window.sessionStorage.getItem(RECOVERY_MARKER));
  return (
    Number.isFinite(timestamp) &&
    timestamp > 0 &&
    Date.now() - timestamp <= RECOVERY_SESSION_MAX_AGE
  );
}

export function UpdatePasswordForm() {
  const router = useRouter();
  const recoveryEventReceived = useRef(false);
  const [status, setStatus] = useState<RecoveryStatus>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const urlParams = getRecoveryUrlParams();
    if (
      urlParams.has("error") ||
      urlParams.has("error_code") ||
      urlParams.has("error_description")
    ) {
      const timer = window.setTimeout(() => {
        setStatus("invalid");
        setError(INVALID_LINK_MESSAGE);
      }, 0);
      return () => window.clearTimeout(timer);
      return;
    }

    let supabase;
    try {
      supabase = getSupabaseBrowserClient();
    } catch (clientError) {
      const timer = window.setTimeout(() => {
        setStatus("invalid");
        setError(
          clientError instanceof Error
            ? clientError.message
            : "Supabase Auth is not configured.",
        );
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const markerWasValid = isValidRecoveryMarker();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session) {
          recoveryEventReceived.current = true;
          window.sessionStorage.setItem(RECOVERY_MARKER, String(Date.now()));
          setStatus("ready");
          setError("");
          return;
        }

        if (event === "INITIAL_SESSION") {
          if (session && markerWasValid) {
            setStatus("ready");
            return;
          }
          window.setTimeout(() => {
            if (!recoveryEventReceived.current) {
              setStatus("invalid");
              setError(INVALID_LINK_MESSAGE);
            }
          }, 1200);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The password confirmation does not match.");
      return;
    }
    if (status !== "ready") {
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        console.error("Supabase password update failed.", updateError.message);
        if (updateError.status === 401) {
          setStatus("invalid");
          window.sessionStorage.removeItem(RECOVERY_MARKER);
          setError(INVALID_LINK_MESSAGE);
        } else {
          setError("Unable to update the password. Please try again.");
        }
        return;
      }

      try {
        await clearAdminSessionAfterPasswordReset();
      } catch (sessionError) {
        console.error(
          "Could not clear the current admin session after password recovery.",
          sessionError instanceof Error ? sessionError.message : "Unknown error",
        );
        setMessage(
          "Password updated. Close this browser session and sign in again with your new password.",
        );
        return;
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("Could not clear the Supabase recovery session.", signOutError.message);
      }
      window.sessionStorage.removeItem(RECOVERY_MARKER);
      router.replace("/admin/login?passwordUpdated=1");
    } catch (updateError) {
      console.error(
        "Password recovery could not be completed.",
        updateError instanceof Error ? updateError.message : "Unknown error",
      );
      setError("Unable to update the password. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (status === "checking") {
    return <p role="status">Verifying the password reset link...</p>;
  }

  if (status === "invalid") {
    return (
      <div>
        <p className="zas-admin-login-error" role="alert">
          {error || INVALID_LINK_MESSAGE}
        </p>
        <Link className="zas-admin-text-link" href="/forgot-password">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form className="zas-admin-login-form" onSubmit={handleSubmit}>
      <label htmlFor="new-password">New Password</label>
      <input
        autoComplete="new-password"
        id="new-password"
        maxLength={256}
        minLength={8}
        onChange={(event) => setNewPassword(event.currentTarget.value)}
        required
        type="password"
        value={newPassword}
      />

      <label htmlFor="confirm-new-password">Confirm New Password</label>
      <input
        autoComplete="new-password"
        id="confirm-new-password"
        maxLength={256}
        minLength={8}
        onChange={(event) => setConfirmPassword(event.currentTarget.value)}
        required
        type="password"
        value={confirmPassword}
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
        {pending ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}
