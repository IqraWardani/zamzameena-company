"use client";

import { useState, type FormEvent } from "react";
import {
  AdminPendingButton,
  AdminFieldError,
  fieldA11yProps,
  usePreservedActionState,
} from "@/components/admin/use-preserved-action-state";
import { AdminSuccessPopup } from "@/components/admin/admin-success-popup";
import type { EventFormState } from "@/app/admin/events/actions";
import {
  dateTimeInputValues,
  DEFAULT_EVENT_TIMEZONE,
  localDateTimeToOffsetIso,
} from "@/lib/admin/event-datetime";

type EventFormAction = (
  previousState: EventFormState,
  formData: FormData,
) => Promise<EventFormState>;

type EventFormValues = {
  slug?: string;
  name?: string;
  description?: string | null;
  startsAt?: Date | string;
  endsAt?: Date | string;
  timezone?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  registrationOpensAt?: Date | string | null;
  registrationClosesAt?: Date | string | null;
};

function isoValue(value?: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function ErrorMessage({ state }: { state: EventFormState }) {
  return (
    <>
      {state.error && <p className="zas-admin-login-error" role="alert">{state.error}</p>}
      {state.message && <p className="zas-admin-form-success" role="status">{state.message}</p>}
    </>
  );
}

export function EventForm({
  action,
  values = {},
  submitLabel,
}: {
  action: EventFormAction;
  values?: EventFormValues;
  submitLabel: string;
}) {
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {});
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="zas-admin-data-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor="event-slug">Slug</label>
      <input {...fieldA11yProps("event-slug", errors.slug)} id="event-slug" name="slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={values.slug} />
      <AdminFieldError id="event-slug" message={errors.slug} />

      <label htmlFor="event-name">Event name</label>
      <input {...fieldA11yProps("event-name", errors.name)} id="event-name" name="name" required maxLength={200} defaultValue={values.name} />
      <AdminFieldError id="event-name" message={errors.name} />

      <label htmlFor="event-description">Description</label>
      <textarea {...fieldA11yProps("event-description", errors.description)} id="event-description" name="description" rows={4} maxLength={10000} defaultValue={values.description ?? ""} />
      <AdminFieldError id="event-description" message={errors.description} />

      <label htmlFor="event-starts-at">Starts at (ISO 8601 with timezone)</label>
      <input {...fieldA11yProps("event-starts-at", errors.startsAt)} id="event-starts-at" name="startsAt" type="text" required placeholder="2026-12-01T09:00:00+08:00" defaultValue={isoValue(values.startsAt)} />
      <AdminFieldError id="event-starts-at" message={errors.startsAt} />

      <label htmlFor="event-ends-at">Ends at (ISO 8601 with timezone)</label>
      <input {...fieldA11yProps("event-ends-at", errors.endsAt)} id="event-ends-at" name="endsAt" type="text" required placeholder="2026-12-01T17:00:00+08:00" defaultValue={isoValue(values.endsAt)} />
      <AdminFieldError id="event-ends-at" message={errors.endsAt} />

      <label htmlFor="event-timezone">Event timezone</label>
      <input {...fieldA11yProps("event-timezone", errors.timezone)} id="event-timezone" name="timezone" required maxLength={64} defaultValue={values.timezone ?? "Asia/Makassar"} />
      <AdminFieldError id="event-timezone" message={errors.timezone} />

      <label htmlFor="event-venue">Venue name</label>
      <input {...fieldA11yProps("event-venue", errors.venueName)} id="event-venue" name="venueName" maxLength={200} defaultValue={values.venueName ?? ""} />
      <AdminFieldError id="event-venue" message={errors.venueName} />

      <label htmlFor="event-venue-address">Venue address</label>
      <textarea {...fieldA11yProps("event-venue-address", errors.venueAddress)} id="event-venue-address" name="venueAddress" rows={3} maxLength={10000} defaultValue={values.venueAddress ?? ""} />
      <AdminFieldError id="event-venue-address" message={errors.venueAddress} />

      <label htmlFor="event-registration-opens">Registration opens at (optional ISO 8601)</label>
      <input {...fieldA11yProps("event-registration-opens", errors.registrationOpensAt)} id="event-registration-opens" name="registrationOpensAt" type="text" placeholder="2026-10-01T09:00:00+08:00" defaultValue={isoValue(values.registrationOpensAt)} />
      <AdminFieldError id="event-registration-opens" message={errors.registrationOpensAt} />

      <label htmlFor="event-registration-closes">Registration closes at (optional ISO 8601)</label>
      <input {...fieldA11yProps("event-registration-closes", errors.registrationClosesAt)} id="event-registration-closes" name="registrationClosesAt" type="text" placeholder="2026-11-30T23:59:00+08:00" defaultValue={isoValue(values.registrationClosesAt)} />
      <AdminFieldError id="event-registration-closes" message={errors.registrationClosesAt} />

      <ErrorMessage state={state} />
      {state.message && <AdminSuccessPopup key={state.message} message={state.message} />}
      <button disabled={pending} type="submit">{pending ? "Saving..." : submitLabel}</button>
    </form>
  );
}

type TicketTypeValues = {
  id?: string;
  code?: string;
  name?: string;
  description?: string | null;
  priceAmount?: string;
  currency?: string;
  capacity?: number | null;
  salesOpensAt?: Date | string | null;
  salesClosesAt?: Date | string | null;
  isActive?: boolean;
};

type TicketAction = (
  previousState: EventFormState,
  formData: FormData,
) => Promise<EventFormState>;
type StaffAction = (
  previousState: EventFormState,
  formData: FormData,
) => Promise<EventFormState>;
type ServerMutationAction = (formData: FormData) => Promise<void>;

function TicketTypeForm({
  action,
  values = {},
  submitLabel,
}: {
  action: TicketAction;
  values?: TicketTypeValues;
  submitLabel: string;
}) {
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {});
  const errors = state.fieldErrors ?? {};
  const [scheduleErrors, setScheduleErrors] = useState<Record<string, string>>({});
  const opening = dateTimeInputValues(values.salesOpensAt, DEFAULT_EVENT_TIMEZONE);
  const closing = dateTimeInputValues(values.salesClosesAt, DEFAULT_EVENT_TIMEZONE);
  const openingError = scheduleErrors.salesOpensAt ?? errors.salesOpensAt;
  const closingError = scheduleErrors.salesClosesAt ?? errors.salesClosesAt;

  function handleTicketSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const openingDate = String(formData.get("salesOpensDate") ?? "");
    const openingTime = String(formData.get("salesOpensTime") ?? "");
    const closingDate = String(formData.get("salesClosesDate") ?? "");
    const closingTime = String(formData.get("salesClosesTime") ?? "");
    const nextErrors: Record<string, string> = {};

    const openingValue =
      openingDate && openingTime
        ? localDateTimeToOffsetIso(
            `${openingDate}T${openingTime}`,
            DEFAULT_EVENT_TIMEZONE,
          )
        : null;
    const closingValue =
      closingDate && closingTime
        ? localDateTimeToOffsetIso(
            `${closingDate}T${closingTime}`,
            DEFAULT_EVENT_TIMEZONE,
          )
        : null;

    if ((openingDate || openingTime) && !openingValue) {
      nextErrors.salesOpensAt = "Pilih tanggal dan waktu pembukaan yang valid.";
    }
    if ((closingDate || closingTime) && !closingValue) {
      nextErrors.salesClosesAt = "Pilih tanggal dan waktu penutupan yang valid.";
    }
    if (
      openingValue &&
      closingValue &&
      Date.parse(closingValue) <= Date.parse(openingValue)
    ) {
      nextErrors.salesClosesAt =
        "Waktu penutupan harus setelah waktu pembukaan.";
    }

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      setScheduleErrors(nextErrors);
      return;
    }

    const openingHidden = form.elements.namedItem("salesOpensAt");
    const closingHidden = form.elements.namedItem("salesClosesAt");
    if (openingHidden instanceof HTMLInputElement) {
      openingHidden.value = openingValue ?? "";
    }
    if (closingHidden instanceof HTMLInputElement) {
      closingHidden.value = closingValue ?? "";
    }
    setScheduleErrors({});
    handleSubmit(event);
  }

  return (
    <form action={formAction} className="zas-admin-data-form zas-admin-ticket-form" onSubmit={handleTicketSubmit} ref={formRef}>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-code-${values.id ?? "new"}`}>Code</label>
        <input {...fieldA11yProps(`ticket-code-${values.id ?? "new"}`, errors.code)} id={`ticket-code-${values.id ?? "new"}`} name="code" required maxLength={80} defaultValue={values.code} />
        <AdminFieldError id={`ticket-code-${values.id ?? "new"}`} message={errors.code} />
      </div>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-name-${values.id ?? "new"}`}>Ticket name</label>
        <input {...fieldA11yProps(`ticket-name-${values.id ?? "new"}`, errors.name)} id={`ticket-name-${values.id ?? "new"}`} name="name" required maxLength={160} defaultValue={values.name} />
        <AdminFieldError id={`ticket-name-${values.id ?? "new"}`} message={errors.name} />
      </div>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-description-${values.id ?? "new"}`}>Description</label>
        <textarea {...fieldA11yProps(`ticket-description-${values.id ?? "new"}`, errors.description)} id={`ticket-description-${values.id ?? "new"}`} name="description" rows={2} maxLength={10000} defaultValue={values.description ?? ""} />
        <AdminFieldError id={`ticket-description-${values.id ?? "new"}`} message={errors.description} />
      </div>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-price-${values.id ?? "new"}`}>Price</label>
        <input {...fieldA11yProps(`ticket-price-${values.id ?? "new"}`, errors.priceAmount)} id={`ticket-price-${values.id ?? "new"}`} name="priceAmount" type="number" min="0" max="999999999999.99" step="0.01" required defaultValue={values.priceAmount ?? "0"} />
        <AdminFieldError id={`ticket-price-${values.id ?? "new"}`} message={errors.priceAmount} />
      </div>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-currency-${values.id ?? "new"}`}>Currency</label>
        <input {...fieldA11yProps(`ticket-currency-${values.id ?? "new"}`, errors.currency)} id={`ticket-currency-${values.id ?? "new"}`} name="currency" maxLength={3} required defaultValue={values.currency ?? "IDR"} />
        <AdminFieldError id={`ticket-currency-${values.id ?? "new"}`} message={errors.currency} />
      </div>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-capacity-${values.id ?? "new"}`}>Capacity (blank means unlimited)</label>
        <input {...fieldA11yProps(`ticket-capacity-${values.id ?? "new"}`, errors.capacity)} id={`ticket-capacity-${values.id ?? "new"}`} name="capacity" type="number" min="1" step="1" defaultValue={values.capacity ?? ""} />
        <AdminFieldError id={`ticket-capacity-${values.id ?? "new"}`} message={errors.capacity} />
      </div>
      <div className="zas-admin-ticket-field zas-admin-ticket-schedule">
        <label htmlFor={`ticket-sales-opens-date-${values.id ?? "new"}`}>Sales opening (optional)</label>
        <div className="zas-admin-ticket-date-time">
          <label className="zas-admin-ticket-subfield">
            <span>Date</span>
            <input
              {...fieldA11yProps(`ticket-sales-opens-date-${values.id ?? "new"}`, openingError)}
              aria-label="Sales opening date"
              id={`ticket-sales-opens-date-${values.id ?? "new"}`}
              name="salesOpensDate"
              type="date"
              defaultValue={opening.date}
            />
          </label>
          <label className="zas-admin-ticket-subfield">
            <span>Time</span>
            <input
              {...fieldA11yProps(`ticket-sales-opens-date-${values.id ?? "new"}`, openingError)}
              aria-label="Sales opening time"
              name="salesOpensTime"
              type="time"
              defaultValue={opening.time}
            />
          </label>
        </div>
        <input name="salesOpensAt" type="hidden" />
        <AdminFieldError id={`ticket-sales-opens-date-${values.id ?? "new"}`} message={openingError} />
      </div>
      <div className="zas-admin-ticket-field zas-admin-ticket-schedule">
        <label htmlFor={`ticket-sales-closes-date-${values.id ?? "new"}`}>Sales closing (optional)</label>
        <div className="zas-admin-ticket-date-time">
          <label className="zas-admin-ticket-subfield">
            <span>Date</span>
            <input
              {...fieldA11yProps(`ticket-sales-closes-date-${values.id ?? "new"}`, closingError)}
              aria-label="Sales closing date"
              id={`ticket-sales-closes-date-${values.id ?? "new"}`}
              name="salesClosesDate"
              type="date"
              defaultValue={closing.date}
            />
          </label>
          <label className="zas-admin-ticket-subfield">
            <span>Time</span>
            <input
              {...fieldA11yProps(`ticket-sales-closes-date-${values.id ?? "new"}`, closingError)}
              aria-label="Sales closing time"
              name="salesClosesTime"
              type="time"
              defaultValue={closing.time}
            />
          </label>
        </div>
        <input name="salesClosesAt" type="hidden" />
        <AdminFieldError id={`ticket-sales-closes-date-${values.id ?? "new"}`} message={closingError} />
      </div>
      <p className="zas-admin-timezone-note">
        Timezone: Asia/Makassar (WITA, UTC+8)
      </p>
      <div className="zas-admin-ticket-field">
        <label htmlFor={`ticket-active-${values.id ?? "new"}`}>Ticket status</label>
        <select {...fieldA11yProps(`ticket-active-${values.id ?? "new"}`, errors.isActive)} id={`ticket-active-${values.id ?? "new"}`} name="isActive" defaultValue={values.isActive === false ? "false" : "true"}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <AdminFieldError id={`ticket-active-${values.id ?? "new"}`} message={errors.isActive} />
      </div>
      <ErrorMessage state={state} />
      <button disabled={pending} type="submit">{pending ? "Saving..." : submitLabel}</button>
    </form>
  );
}

export function CreateTicketTypeForm({
  action,
}: {
  action: TicketAction;
}) {
  return <TicketTypeForm action={action} submitLabel="Add ticket type" />;
}

export function EditTicketTypeForm({
  action,
  values,
}: {
  action: TicketAction;
  values: TicketTypeValues;
}) {
  return <TicketTypeForm action={action} values={values} submitLabel="Save ticket type" />;
}

export function AssignStaffForm({ action }: { action: StaffAction }) {
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {});
  const error = state.fieldErrors?.email;

  return (
    <form action={formAction} className="zas-admin-staff-form" onSubmit={handleSubmit} ref={formRef}>
      <label htmlFor="staff-email">Administrator email</label>
      <input {...fieldA11yProps("staff-email", error)} id="staff-email" name="email" type="email" maxLength={320} required />
      <AdminFieldError id="staff-email" message={error} />
      <ErrorMessage state={state} />
      <button disabled={pending} type="submit">{pending ? "Assigning..." : "Assign staff"}</button>
    </form>
  );
}

export function RemoveStaffForm({
  action,
  adminUserId,
}: {
  action: ServerMutationAction;
  adminUserId: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="adminUserId" value={adminUserId} />
      <AdminPendingButton className="zas-admin-small-button" pendingLabel="Removing...">
        Remove
      </AdminPendingButton>
    </form>
  );
}
