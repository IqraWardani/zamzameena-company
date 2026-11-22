"use client";

import { useState } from "react";
import {
  checkInByCodeAction,
  checkInByParticipantAction,
  type CheckInOperationState,
} from "@/app/admin/check-in/actions";
import {
  AdminFieldError,
  fieldA11yProps,
  usePreservedActionState,
} from "@/components/admin/use-preserved-action-state";

function CheckInResult({ state }: { state: CheckInOperationState }) {
  if (!state.message && !state.error) return null;
  const isSuccess =
    state.status === "checked_in" || state.status === "already_checked_in";
  return (
    <div
      className={isSuccess ? "zas-check-in-result is-success" : "zas-check-in-result is-error"}
      role={isSuccess ? "status" : "alert"}
    >
      <p>{state.message ?? state.error}</p>
      {state.checkedInAt && (
        <p>Recorded at {new Date(state.checkedInAt).toLocaleString("en")}</p>
      )}
    </div>
  );
}

export function TicketCodeCheckInForm({ eventId }: { eventId: string }) {
  const [merchandiseConfirmed, setMerchandiseConfirmed] = useState(false);
  const action = checkInByCodeAction.bind(null, eventId);
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {}, {
      isSuccess: (result) =>
        result.status === "checked_in" || result.status === "already_checked_in",
      onSuccess: () => setMerchandiseConfirmed(false),
    });
  return (
    <form action={formAction} className="zas-check-in-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor="ticket-code">Ticket code</label>
      <input
        {...fieldA11yProps("ticket-code", state.fieldErrors?.ticketCode)}
        id="ticket-code"
        name="ticketCode"
        autoComplete="off"
        maxLength={80}
        required
      />
      <AdminFieldError id="ticket-code" message={state.fieldErrors?.ticketCode} />
      <label className="zas-admin-confirm-checkbox">
        <input
          checked={merchandiseConfirmed}
          name="merchandiseReceived"
          onChange={(event) =>
            setMerchandiseConfirmed(event.currentTarget.checked)
          }
          required
          type="checkbox"
          value="confirmed"
        />
        Telah menerima merchandise
      </label>
      <button disabled={!merchandiseConfirmed || pending} type="submit">
        {pending ? "Checking..." : "Check in"}
      </button>
      <CheckInResult state={state} />
    </form>
  );
}

export function ParticipantCheckInButton({
  eventId,
  registrationId,
  participantName,
  registrationNumber,
  checkedInAt,
  buttonLabel = "Check in participant",
}: {
  eventId: string;
  registrationId: string;
  participantName: string;
  registrationNumber: string;
  checkedInAt: Date | null;
  buttonLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [merchandiseConfirmed, setMerchandiseConfirmed] = useState(false);
  const action = checkInByParticipantAction.bind(null, eventId, registrationId);
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {}, {
      isSuccess: (result) =>
        result.status === "checked_in" || result.status === "already_checked_in",
      onSuccess: () => {
        setIsOpen(false);
        setMerchandiseConfirmed(false);
      },
    });
  const closeDialog = () => {
    if (pending) return;
    setIsOpen(false);
    setMerchandiseConfirmed(false);
  };

  return (
    <div className="zas-participant-check-in">
      {state.status === "checked_in" || state.status === "already_checked_in" ? (
        <CheckInResult state={state} />
      ) : checkedInAt ? (
        <p className="zas-check-in-result is-success" role="status">
          Already checked in at {checkedInAt.toLocaleString("en")}.
        </p>
      ) : (
        <>
          <button
            className="zas-admin-small-button"
            onClick={() => setIsOpen(true)}
            type="button"
          >
            {buttonLabel}
          </button>
          {isOpen && (
            <div
              aria-labelledby={`check-in-confirm-title-${registrationId}`}
              aria-describedby={`check-in-confirm-question-${registrationId}`}
              aria-modal="true"
              className="zas-admin-dialog-backdrop"
              onClick={(event) => {
                if (event.target === event.currentTarget) closeDialog();
              }}
              role="dialog"
            >
              <section className="zas-admin-dialog">
                <header>
                  <div>
                    <p className="zas-admin-eyebrow">KONFIRMASI PESERTA</p>
                    <h2 id={`check-in-confirm-title-${registrationId}`}>
                      Konfirmasi Check-in
                    </h2>
                  </div>
                </header>
                <dl className="zas-admin-details">
                  <div>
                    <dt>Nama</dt>
                    <dd>{participantName}</dd>
                  </div>
                  <div>
                    <dt>Nomor Registrasi</dt>
                    <dd>{registrationNumber}</dd>
                  </div>
                </dl>
                <p id={`check-in-confirm-question-${registrationId}`}>
                  Apakah Anda yakin ingin melakukan check-in untuk peserta ini?
                </p>
                <form
                  action={formAction}
                  className="zas-payment-review-form zas-payment-review-dialog-form zas-check-in-confirmation-form"
                  onSubmit={handleSubmit}
                  ref={formRef}
                >
                  <label className="zas-admin-confirm-checkbox">
                    <input
                      checked={merchandiseConfirmed}
                      name="merchandiseReceived"
                      onChange={(event) =>
                        setMerchandiseConfirmed(event.currentTarget.checked)
                      }
                      required
                      type="checkbox"
                      value="confirmed"
                    />
                    Telah menerima merchandise
                  </label>
                  <CheckInResult state={state} />
                  <footer>
                    <button
                      className="zas-admin-secondary-button"
                      disabled={pending}
                      onClick={closeDialog}
                      type="button"
                    >
                      Batal
                    </button>
                    <button
                      className="zas-admin-confirm-payment-button"
                      disabled={!merchandiseConfirmed || pending}
                      type="submit"
                    >
                      {pending ? "Mencatat check-in..." : "Konfirmasi Check-in"}
                    </button>
                  </footer>
                </form>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
