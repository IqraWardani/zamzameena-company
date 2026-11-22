"use client";

import {
  collectByInvitationCode,
  collectByParticipantSearch,
  createInvitationCode,
} from "@/app/admin/invitations/actions";
import {
  AdminFieldError,
  fieldA11yProps,
  usePreservedActionState,
} from "@/components/admin/use-preserved-action-state";

export function InvitationCodeCollectionForm({ eventId }: { eventId: string }) {
  const action = collectByInvitationCode.bind(null, eventId);
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {});
  return (
    <form action={formAction} className="zas-invitation-operation-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor="invitation-code">Invitation code</label>
      <input {...fieldA11yProps("invitation-code", state.fieldErrors?.code)} id="invitation-code" name="code" autoComplete="off" maxLength={80} required />
      <AdminFieldError id="invitation-code" message={state.fieldErrors?.code} />
      {state.error && <p className="zas-registration-error" role="alert">{state.error}</p>}
      {state.message && <p className="zas-payment-message" role="status">{state.message}</p>}
      <button disabled={pending} type="submit">
        {pending ? "Checking..." : "Collect by code"}
      </button>
    </form>
  );
}

export function ParticipantInvitationActions({
  eventId,
  registrationId,
}: {
  eventId: string;
  registrationId: string;
}) {
  const createAction = createInvitationCode.bind(null, eventId, registrationId);
  const {
    state: codeState,
    formAction: createFormAction,
    pending: creating,
    formRef: createFormRef,
    handleSubmit: handleCreateSubmit,
  } = usePreservedActionState(createAction, {});

  return (
    <div className="zas-invitation-participant-actions">
      <ParticipantInvitationCollectionAction
        eventId={eventId}
        registrationId={registrationId}
      />
      <form action={createFormAction} className="zas-invitation-operation-form" onSubmit={handleCreateSubmit} ref={createFormRef}>
        <label htmlFor={`invite-expiry-${registrationId}`}>Code expiry (optional, UTC)</label>
        <input {...fieldA11yProps(`invite-expiry-${registrationId}`, codeState.fieldErrors?.expiresAt)} id={`invite-expiry-${registrationId}`} name="expiresAt" type="datetime-local" />
        <AdminFieldError id={`invite-expiry-${registrationId}`} message={codeState.fieldErrors?.expiresAt} />
        <button disabled={creating} type="submit">
          {creating ? "Creating..." : "Create invitation code"}
        </button>
        {codeState.error && <p className="zas-registration-error" role="alert">{codeState.error}</p>}
        {codeState.invitationCode && (
          <p role="status">
            Invitation code: <strong>{codeState.invitationCode}</strong>
          </p>
        )}
      </form>
    </div>
  );
}

export function ParticipantInvitationCollectionAction({
  eventId,
  registrationId,
  buttonLabel = "Record invitation collection",
}: {
  eventId: string;
  registrationId: string;
  buttonLabel?: string;
}) {
  const action = collectByParticipantSearch.bind(null, eventId, registrationId);
  const {
    state,
    formAction,
    pending,
    formRef,
    handleSubmit,
  } = usePreservedActionState(action, {});

  return (
    <form
      action={formAction}
      className="zas-invitation-operation-form"
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <button disabled={pending} type="submit">
        {pending ? "Recording..." : buttonLabel}
      </button>
      {state.error && <p className="zas-registration-error" role="alert">{state.error}</p>}
      {state.message && <p className="zas-payment-message" role="status">{state.message}</p>}
    </form>
  );
}
