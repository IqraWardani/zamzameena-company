"use client";

import { useActionState } from "react";
import {
  correctRegistrationAttribution,
} from "@/lib/sales/actions";

export function SalesAttributionForm({
  eventId,
  registrationId,
  currentReferralCode,
}: {
  eventId: string;
  registrationId: string;
  currentReferralCode: string | null;
}) {
  const action = correctRegistrationAttribution.bind(null, eventId, registrationId);
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="zas-sales-attribution-form">
      <label>
        Koreksi kode referral
        <input
          autoCapitalize="characters"
          defaultValue={currentReferralCode ?? ""}
          maxLength={40}
          name="referralCode"
          pattern="[A-Za-z0-9][A-Za-z0-9_\-]{2,39}"
          placeholder="Kosongkan untuk menghapus atribusi"
        />
      </label>
      <button className="zas-admin-secondary-button" disabled={pending} type="submit">
        {pending ? "Menyimpan..." : "Simpan koreksi"}
      </button>
      {state.error && <span className="zas-sales-field-error" role="alert">{state.error}</span>}
      {state.message && <span role="status">{state.message}</span>}
    </form>
  );
}
