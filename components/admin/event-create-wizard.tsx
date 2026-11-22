"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import type { EventFormState } from "@/app/admin/events/actions";
import {
  isSupportedKeyVisualMetadata,
  MAX_KEY_VISUAL_BYTES,
  MAX_KEY_VISUAL_RESOLUTION_LABEL,
} from "@/lib/key-visual/validation";
import {
  dateTimeInputValues,
  DEFAULT_EVENT_TIMEZONE,
  localDateTimeToIso,
  slugifyEventName,
} from "@/lib/admin/event-datetime";
import {
  AdminFieldError,
  fieldA11yProps,
  usePreservedActionState,
} from "@/components/admin/use-preserved-action-state";

type EventWizardValues = {
  slug?: string;
  eventCode?: string | null;
  name?: string;
  description?: string | null;
  startsAt?: Date | string;
  endsAt?: Date | string;
  timezone?: string;
  venueName?: string | null;
  venueAddress?: string | null;
  registrationOpensAt?: Date | string | null;
  registrationClosesAt?: Date | string | null;
  keyVisual?: { url: string; originalFilename: string } | null;
};

function localDateTime(value: Date | string | null | undefined, timezone: string) {
  return dateTimeInputValues(value, timezone);
}

export function EventWizard({
  action,
  values = {},
  keyVisual = null,
  mode = "create",
  cancelHref = "/admin",
}: {
  action: (
    previousState: EventFormState,
    formData: FormData,
  ) => Promise<EventFormState>;
  values?: EventWizardValues;
  keyVisual?: { url: string; originalFilename: string } | null;
  mode?: "create" | "edit";
  cancelHref?: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const actionWithStepHandling = async (
    previousState: EventFormState,
    formData: FormData,
  ) => {
    const result = await action(previousState, formData);
    if (
      result.fieldErrors?.name ||
      result.fieldErrors?.slug ||
      result.fieldErrors?.eventCode ||
      result.fieldErrors?.description
    ) {
      setStep(1);
    }
    return result;
  };
  const { state, formAction, pending, formRef, handleSubmit: preserveSubmit } =
    usePreservedActionState(actionWithStepHandling, {});
  const [name, setName] = useState(values.name ?? "");
  const [slug, setSlug] = useState(values.slug ?? "");
  const [eventCode, setEventCode] = useState(values.eventCode ?? "");
  const [description, setDescription] = useState(values.description ?? "");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [timezone, setTimezone] = useState(values.timezone ?? DEFAULT_EVENT_TIMEZONE);
  const [formError, setFormError] = useState("");
  const [selectedKeyVisual, setSelectedKeyVisual] = useState<File | null>(null);
  const [keyVisualPreview, setKeyVisualPreview] = useState<string | null>(null);
  const [keyVisualError, setKeyVisualError] = useState("");
  const [removeCurrentKeyVisual, setRemoveCurrentKeyVisual] = useState(false);
  const firstStep = useRef<HTMLFieldSetElement>(null);
  const keyVisualInput = useRef<HTMLInputElement>(null);
  const startsAtInput = useRef<HTMLInputElement>(null);
  const endsAtInput = useRef<HTMLInputElement>(null);
  const startsAtHidden = useRef<HTMLInputElement>(null);
  const endsAtHidden = useRef<HTMLInputElement>(null);
  const registrationOpensDate = useRef<HTMLInputElement>(null);
  const registrationOpensTime = useRef<HTMLInputElement>(null);
  const registrationClosesDate = useRef<HTMLInputElement>(null);
  const registrationClosesTime = useRef<HTMLInputElement>(null);
  const registrationOpensHidden = useRef<HTMLInputElement>(null);
  const registrationClosesHidden = useRef<HTMLInputElement>(null);

  const startsAt = localDateTime(values.startsAt, timezone);
  const endsAt = localDateTime(values.endsAt, timezone);
  const registrationOpensAt = localDateTime(values.registrationOpensAt, timezone);
  const registrationClosesAt = localDateTime(values.registrationClosesAt, timezone);

  useEffect(() => {
    if (!keyVisualPreview) return;
    return () => URL.revokeObjectURL(keyVisualPreview);
  }, [keyVisualPreview]);

  function chooseKeyVisual(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0] ?? null;
    setKeyVisualError("");
    if (!file) {
      setSelectedKeyVisual(null);
      setKeyVisualPreview(null);
      return;
    }
    if (!isSupportedKeyVisualMetadata(file.name, file.type)) {
      setKeyVisualError("Pilih file PNG, JPG, atau WEBP yang valid.");
      event.currentTarget.value = "";
      setSelectedKeyVisual(null);
      setKeyVisualPreview(null);
      return;
    }
    if (!file.size || file.size > MAX_KEY_VISUAL_BYTES) {
      setKeyVisualError("Ukuran Key Visual harus 1 byte hingga 8 MB.");
      event.currentTarget.value = "";
      setSelectedKeyVisual(null);
      setKeyVisualPreview(null);
      return;
    }
    setSelectedKeyVisual(file);
    setKeyVisualPreview(URL.createObjectURL(file));
    setRemoveCurrentKeyVisual(false);
  }

  function cancelKeyVisualSelection() {
    setSelectedKeyVisual(null);
    setKeyVisualPreview(null);
    setKeyVisualError("");
    if (keyVisualInput.current) keyVisualInput.current.value = "";
  }

  function continueToSchedule() {
    if (firstStep.current?.reportValidity()) {
      setFormError("");
      setStep(2);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    preserveSubmit(event);
    const startsAt = localDateTimeToIso(startsAtInput.current?.value ?? "", timezone);
    const endsAt = localDateTimeToIso(endsAtInput.current?.value ?? "", timezone);
    const registrationOpensDateValue = registrationOpensDate.current?.value ?? "";
    const registrationOpensTimeValue = registrationOpensTime.current?.value ?? "";
    const registrationClosesDateValue = registrationClosesDate.current?.value ?? "";
    const registrationClosesTimeValue = registrationClosesTime.current?.value ?? "";
    const registrationOpens =
      registrationOpensDateValue && registrationOpensTimeValue
        ? localDateTimeToIso(
            `${registrationOpensDateValue}T${registrationOpensTimeValue}`,
            timezone,
          )
        : null;
    const registrationCloses =
      registrationClosesDateValue && registrationClosesTimeValue
        ? localDateTimeToIso(
            `${registrationClosesDateValue}T${registrationClosesTimeValue}`,
            timezone,
          )
        : null;
    const hasPartialRegistrationWindow =
      Boolean(registrationOpensDateValue) !== Boolean(registrationOpensTimeValue) ||
      Boolean(registrationClosesDateValue) !== Boolean(registrationClosesTimeValue);
    if (
      !startsAt ||
      !endsAt ||
      hasPartialRegistrationWindow ||
      (registrationOpensDateValue && registrationOpensTimeValue && !registrationOpens) ||
      (registrationClosesDateValue && registrationClosesTimeValue && !registrationCloses)
    ) {
      event.preventDefault();
      setFormError(
        "Periksa kembali tanggal, jam, dan zona waktu. Waktu yang tidak lengkap atau tidak valid belum dapat disimpan.",
      );
      return;
    }
    if (startsAtHidden.current) startsAtHidden.current.value = startsAt;
    if (endsAtHidden.current) endsAtHidden.current.value = endsAt;
    if (registrationOpensHidden.current) {
      registrationOpensHidden.current.value = registrationOpens ?? "";
    }
    if (registrationClosesHidden.current) {
      registrationClosesHidden.current.value = registrationCloses ?? "";
    }
    setFormError("");
  }

  return (
    <form action={formAction} className="zas-admin-data-form zas-admin-event-wizard" onSubmit={handleSubmit} ref={formRef}>
      <nav aria-label={mode === "edit" ? "Langkah edit event" : "Langkah pembuatan event"} className="zas-admin-wizard-steps">
        <span aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "is-current" : ""}>
          <strong>1</strong> Informasi Dasar
        </span>
        <span aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "is-current" : ""}>
          <strong>2</strong> Waktu &amp; Lokasi
        </span>
        <span><strong>3</strong> Tiket setelah disimpan</span>
      </nav>

      <fieldset className="zas-admin-wizard-panel" disabled={step !== 1} hidden={step !== 1} ref={firstStep}>
        <legend>Langkah 1 — Informasi Dasar</legend>
        <label htmlFor="event-name">Nama Event</label>
        <input
          {...fieldA11yProps("event-name", state.fieldErrors?.name)}
          autoComplete="off"
          id="event-name"
          maxLength={200}
          name="name"
          onChange={(event) => {
            const nextName = event.currentTarget.value;
            setName(nextName);
            if (mode === "create" && !slugEdited) setSlug(slugifyEventName(nextName));
          }}
          required
          value={name}
        />
        <AdminFieldError id="event-name" message={state.fieldErrors?.name} />
        <label htmlFor="event-slug">Slug</label>
        <input
          {...fieldA11yProps("event-slug", state.fieldErrors?.slug)}
          autoComplete="off"
          id="event-slug"
          maxLength={160}
          name="slug"
          onChange={(event) => {
            const nextSlug = event.currentTarget.value.toLowerCase();
            setSlug(nextSlug);
            setSlugEdited(nextSlug !== slugifyEventName(name));
          }}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          required
          value={slug}
        />
        <AdminFieldError id="event-slug" message={state.fieldErrors?.slug} />
        <label htmlFor="event-code">Kode event</label>
        <input
          {...fieldA11yProps("event-code", state.fieldErrors?.eventCode)}
          autoComplete="off"
          id="event-code"
          maxLength={12}
          name="eventCode"
          onChange={(event) => setEventCode(event.currentTarget.value.toUpperCase())}
          pattern="[A-Za-z0-9]{2,12}"
          placeholder="Contoh: SPS"
          required
          readOnly={mode === "edit" && Boolean(values.eventCode)}
          value={eventCode}
        />
        <AdminFieldError id="event-code" message={state.fieldErrors?.eventCode} />
        <small>
          {values.eventCode
            ? "Kode event sudah ditetapkan dan tidak dapat diubah."
            : "Tetapkan kode unik sebelum membuat referral pertama."}
        </small>
        <small>
          {mode === "edit"
            ? "Slug tetap dan hanya berubah jika Anda menyuntingnya."
            : "Slug dibuat otomatis dari nama dan dapat disunting."}
        </small>
        <label htmlFor="event-description">Ringkasan / deskripsi singkat</label>
        <textarea
          {...fieldA11yProps("event-description", state.fieldErrors?.description)}
          id="event-description"
          maxLength={10000}
          name="description"
          onChange={(event) => setDescription(event.currentTarget.value)}
          rows={4}
          value={description}
        />
        <AdminFieldError id="event-description" message={state.fieldErrors?.description} />
        {mode === "create" && (
          <p className="zas-admin-wizard-note">
            Status awal selalu Draft. Event tidak akan ditayangkan ke publik saat disimpan.
          </p>
        )}
        <button onClick={continueToSchedule} type="button">Lanjut ke Waktu &amp; Lokasi</button>
      </fieldset>

      <fieldset className="zas-admin-wizard-panel" disabled={step !== 2} hidden={step !== 2}>
        <legend>Langkah 2 — Waktu dan Lokasi</legend>
        <label htmlFor="event-starts-local">Tanggal dan jam mulai</label>
        <input
          {...fieldA11yProps("event-starts-local", formError || state.fieldErrors?.startsAt)}
          id="event-starts-local"
          name="startsAtLocal"
          ref={startsAtInput}
          required
          type="datetime-local"
          defaultValue={startsAt.date && startsAt.time ? `${startsAt.date}T${startsAt.time}` : ""}
        />
        <AdminFieldError id="event-starts-local" message={formError || state.fieldErrors?.startsAt} />
        <input name="startsAt" ref={startsAtHidden} type="hidden" />
        <label htmlFor="event-ends-local">Tanggal dan jam selesai</label>
        <input
          {...fieldA11yProps("event-ends-local", state.fieldErrors?.endsAt)}
          id="event-ends-local"
          name="endsAtLocal"
          ref={endsAtInput}
          required
          type="datetime-local"
          defaultValue={endsAt.date && endsAt.time ? `${endsAt.date}T${endsAt.time}` : ""}
        />
        <AdminFieldError id="event-ends-local" message={state.fieldErrors?.endsAt} />
        <input name="endsAt" ref={endsAtHidden} type="hidden" />
        <label htmlFor="event-timezone">Timezone</label>
        <input
          {...fieldA11yProps("event-timezone", state.fieldErrors?.timezone)}
          id="event-timezone"
          maxLength={64}
          name="timezone"
          onChange={(event) => setTimezone(event.currentTarget.value)}
          required
          value={timezone}
        />
        <AdminFieldError id="event-timezone" message={state.fieldErrors?.timezone} />
        <label htmlFor="event-venue">Nama venue</label>
        <input {...fieldA11yProps("event-venue", state.fieldErrors?.venueName)} defaultValue={values.venueName ?? ""} id="event-venue" maxLength={200} name="venueName" />
        <AdminFieldError id="event-venue" message={state.fieldErrors?.venueName} />
        <label htmlFor="event-venue-address">Alamat venue</label>
        <textarea {...fieldA11yProps("event-venue-address", state.fieldErrors?.venueAddress)} defaultValue={values.venueAddress ?? ""} id="event-venue-address" maxLength={10000} name="venueAddress" rows={3} />
        <AdminFieldError id="event-venue-address" message={state.fieldErrors?.venueAddress} />

        <section className="zas-key-visual-upload zas-admin-event-key-visual" aria-labelledby="event-key-visual-title">
          <p className="zas-admin-eyebrow">EVENT ASSET</p>
          <h2 id="event-key-visual-title">Key Visual</h2>
          <p>Format PNG, JPG, JPEG, atau WEBP. Ukuran maksimal 8 MB. Resolusi maksimal {MAX_KEY_VISUAL_RESOLUTION_LABEL}.</p>
          {keyVisualPreview ? (
            <div className="zas-key-visual-selected">
              <div className="zas-key-visual-image is-preview">
                <Image
                  alt="Pratinjau Key Visual yang dipilih"
                  fill
                  sizes="(max-width: 680px) 100vw, 680px"
                  src={keyVisualPreview}
                  unoptimized
                />
              </div>
              <p><strong>{selectedKeyVisual?.name}</strong></p>
            </div>
          ) : keyVisual && !removeCurrentKeyVisual ? (
            <div className="zas-key-visual-selected">
              <div className="zas-key-visual-image">
                <Image
                  alt={`Key Visual saat ini: ${keyVisual.originalFilename}`}
                  fill
                  sizes="(max-width: 680px) 100vw, 680px"
                  src={keyVisual.url}
                  unoptimized
                />
              </div>
              <p><strong>{keyVisual.originalFilename}</strong> · KV saat ini</p>
            </div>
          ) : (
            <div className="zas-key-visual-empty">
              <p>{removeCurrentKeyVisual ? "Key Visual akan dihapus setelah perubahan disimpan." : "Belum ada Key Visual untuk Event ini."}</p>
            </div>
          )}
          <label htmlFor="event-key-visual-file">
            {mode === "edit" && keyVisual ? "Replace Image" : "Upload Image"}
          </label>
          <input
            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
            disabled={pending}
            id="event-key-visual-file"
            onChange={chooseKeyVisual}
            ref={keyVisualInput}
            type="file"
            name="keyVisual"
          />
          {keyVisualError && <p className="zas-key-visual-feedback is-error" role="alert">{keyVisualError}</p>}
          {keyVisual && (
            <div className="zas-key-visual-actions">
              {removeCurrentKeyVisual ? (
                <button
                  className="zas-admin-secondary-button"
                  disabled={pending}
                  onClick={() => setRemoveCurrentKeyVisual(false)}
                  type="button"
                >
                  Keep Current Image
                </button>
              ) : (
                <button
                  className="zas-admin-danger-button"
                  disabled={pending}
                  onClick={() => {
                    cancelKeyVisualSelection();
                    setRemoveCurrentKeyVisual(true);
                  }}
                  type="button"
                >
                  Remove Image
                </button>
              )}
              {selectedKeyVisual && (
                <button
                  className="zas-admin-secondary-button"
                  disabled={pending}
                  onClick={cancelKeyVisualSelection}
                  type="button"
                >
                  Cancel Replacement
                </button>
              )}
            </div>
          )}
          <input
            name="removeKeyVisual"
            type="hidden"
            value={removeCurrentKeyVisual ? "true" : "false"}
          />
        </section>

        <fieldset className="zas-admin-wizard-panel">
          <legend>Pendaftaran (opsional)</legend>
          <label htmlFor="event-registration-opens-date">Tanggal pendaftaran dibuka</label>
          <input
            {...fieldA11yProps("event-registration-opens-date", state.fieldErrors?.registrationOpensAt)}
            id="event-registration-opens-date"
            name="registrationOpensDate"
            ref={registrationOpensDate}
            type="date"
            defaultValue={registrationOpensAt.date}
          />
          <label htmlFor="event-registration-opens-time">Jam pendaftaran dibuka</label>
          <input
            {...fieldA11yProps("event-registration-opens-time", state.fieldErrors?.registrationOpensAt)}
            id="event-registration-opens-time"
            name="registrationOpensTime"
            ref={registrationOpensTime}
            type="time"
            defaultValue={registrationOpensAt.time}
          />
          <input name="registrationOpensAt" ref={registrationOpensHidden} type="hidden" />
          <AdminFieldError
            id="event-registration-opens-date"
            message={state.fieldErrors?.registrationOpensAt}
          />
          <label htmlFor="event-registration-closes-date">Tanggal pendaftaran ditutup</label>
          <input
            {...fieldA11yProps("event-registration-closes-date", state.fieldErrors?.registrationClosesAt)}
            id="event-registration-closes-date"
            name="registrationClosesDate"
            ref={registrationClosesDate}
            type="date"
            defaultValue={registrationClosesAt.date}
          />
          <label htmlFor="event-registration-closes-time">Jam pendaftaran ditutup</label>
          <input
            {...fieldA11yProps("event-registration-closes-time", state.fieldErrors?.registrationClosesAt)}
            id="event-registration-closes-time"
            name="registrationClosesTime"
            ref={registrationClosesTime}
            type="time"
            defaultValue={registrationClosesAt.time}
          />
          <input name="registrationClosesAt" ref={registrationClosesHidden} type="hidden" />
          <AdminFieldError id="event-registration-closes-date" message={state.fieldErrors?.registrationClosesAt} />
        </fieldset>
        <p className="zas-admin-wizard-note">
          Tanggal, jam, timezone, dan informasi venue perlu dilengkapi sebelum event dapat dipublikasikan.
        </p>
        {state.error && <p className="zas-admin-login-error" role="alert">{state.error}</p>}
        <div className="zas-admin-wizard-actions">
          <button className="zas-admin-small-button" onClick={() => setStep(1)} type="button">
            Kembali
          </button>
          <button disabled={pending} type="submit">
            {pending
              ? "Menyimpan…"
              : mode === "edit" ? "Simpan Perubahan" : "Simpan sebagai Draft"}
          </button>
        </div>
      </fieldset>

      {step === 2 && (
        <>
          <input name="name" type="hidden" value={name} />
          <input name="slug" type="hidden" value={slug} />
          <input name="eventCode" type="hidden" value={eventCode} />
          <input name="description" type="hidden" value={description} />
        </>
      )}
      <Link className="zas-admin-text-link" href={cancelHref}>
        {mode === "edit" ? "Batal dan kembali ke Event" : "Batal dan kembali ke Dashboard"}
      </Link>
    </form>
  );
}

export const EventCreateWizard = EventWizard;
