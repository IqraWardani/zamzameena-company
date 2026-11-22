"use client";

import {
  updateContactStatus,
} from "@/app/admin/contacts/actions";
import {
  AdminFieldError,
  fieldA11yProps,
  usePreservedActionState,
} from "@/components/admin/use-preserved-action-state";

export function ContactStatusForm({
  contactId,
  status,
}: {
  contactId: string;
  status: string;
}) {
  const action = updateContactStatus.bind(null, contactId);
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {});
  return (
    <form action={formAction} className="zas-contact-status-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor={`contact-status-${contactId}`}>Status</label>
      <select {...fieldA11yProps(`contact-status-${contactId}`, state.fieldErrors?.status)} id={`contact-status-${contactId}`} name="status" defaultValue={status}>
        <option value="new">New</option>
        <option value="in_progress">In progress</option>
        <option value="resolved">Resolved</option>
        <option value="spam">Spam</option>
      </select>
      <AdminFieldError id={`contact-status-${contactId}`} message={state.fieldErrors?.status} />
      <button disabled={pending} type="submit">
        {pending ? "Saving..." : "Update status"}
      </button>
      {state.error && <p className="zas-registration-error" role="alert">{state.error}</p>}
      {state.message && <p className="zas-payment-message" role="status">{state.message}</p>}
    </form>
  );
}
