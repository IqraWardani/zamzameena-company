"use client";

import { useActionState } from "react";
import {
  submitPaymentProof,
  type PaymentSubmissionState,
} from "@/app/participant/actions";
import { FormFieldLabel } from "@/components/form-field-label";

export function PaymentProofForm({
  registrationId,
}: {
  registrationId: string;
}) {
  const action = submitPaymentProof.bind(null, registrationId);
  const [state, formAction, pending] = useActionState<PaymentSubmissionState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="zas-registration-form zas-payment-proof-form">
      {state.error && <p className="zas-registration-error" role="alert">{state.error}</p>}
      {state.message && <p className="zas-payment-message" role="status">{state.message}</p>}

      <FormFieldLabel htmlFor={`sender-name-${registrationId}`} required>Name on transfer</FormFieldLabel>
      <input id={`sender-name-${registrationId}`} name="senderName" maxLength={160} required />

      <label htmlFor={`sender-bank-${registrationId}`}>Sending bank</label>
      <input id={`sender-bank-${registrationId}`} name="senderBank" maxLength={120} />

      <FormFieldLabel htmlFor={`amount-paid-${registrationId}`} required>Amount paid</FormFieldLabel>
      <input
        id={`amount-paid-${registrationId}`}
        name="amountPaid"
        type="number"
        min="0.01"
        max="999999999999.99"
        step="0.01"
        required
      />

      <label htmlFor={`reference-${registrationId}`}>Transfer reference</label>
      <input id={`reference-${registrationId}`} name="referenceNumber" maxLength={120} />

      <label htmlFor={`paid-at-${registrationId}`}>Transfer date</label>
      <input id={`paid-at-${registrationId}`} name="paidAt" type="date" />

      <FormFieldLabel htmlFor={`proof-${registrationId}`} required>Payment proof (JPEG, PNG, or PDF; up to 5 MB)</FormFieldLabel>
      <input
        accept="image/jpeg,image/png,application/pdf"
        id={`proof-${registrationId}`}
        name="proof"
        required
        type="file"
      />

      <p className="zas-registration-privacy">
        This file is stored in private object storage. Only you and assigned payment reviewers can access it.
      </p>
      <button disabled={pending} type="submit">
        {pending ? "Uploading securely..." : "Submit payment proof"}
      </button>
    </form>
  );
}
