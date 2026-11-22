"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { FormFieldLabel } from "@/components/form-field-label";
import { usePreservedActionState } from "@/components/admin/use-preserved-action-state";
import type { SalesMemberFormState } from "@/lib/sales/actions";
import { SALES_POSITION_LABELS, type SalesPosition } from "@/lib/sales/labels";

export type SalesMemberFormValues = {
  position: SalesPosition;
  personId: string;
  fullName: string;
  memberCode: string;
  phone: string;
  email: string | null;
  region: string;
  supervisorMemberId: string | null;
  joinedAt: string;
  referralCode: string;
  quotaAmount: string;
};

type SalesMemberFormAction = (state: SalesMemberFormState, formData: FormData) => Promise<SalesMemberFormState>;

const REFERRAL_PREFIX: Record<SalesPosition, string> = {
  director: "DIR",
  arm: "ARM",
  branch_manager: "KCB",
  sales: "SLS",
};

function requiredSupervisorPosition(position: SalesPosition): SalesPosition | null {
  if (position === "director") return null;
  if (position === "arm") return "director";
  if (position === "branch_manager") return "arm";
  return "branch_manager";
}

function nextSalesPosition(supervisors: Array<{ position: SalesPosition }>): SalesPosition {
  const activePositions = new Set(supervisors.map((supervisor) => supervisor.position));
  if (!activePositions.has("director")) return "director";
  if (!activePositions.has("arm")) return "arm";
  if (!activePositions.has("branch_manager")) return "branch_manager";
  return "sales";
}

export function SalesMemberForm({
  action,
  values,
  supervisors,
  formId,
  eventCode,
  people = [],
  nextSequenceByPosition,
}: {
  action: SalesMemberFormAction;
  values?: SalesMemberFormValues;
  supervisors: Array<{ id: string; fullName: string; position: SalesPosition }>;
  formId: string;
  eventCode: string | null;
  people?: Array<{ id: string; fullName: string; memberCode: string }>;
  nextSequenceByPosition?: Partial<Record<SalesPosition, number>>;
}) {
  const isEditing = Boolean(values);
  const [position, setPosition] = useState<SalesPosition>(
    values?.position ?? nextSalesPosition(supervisors),
  );
  const [personId, setPersonId] = useState("");
  const resetAddFormState = useCallback(() => {
    setPosition(nextSalesPosition(supervisors));
    setPersonId("");
  }, [supervisors]);
  const {
    state,
    formAction,
    pending,
    formRef,
    handleSubmit,
  } = usePreservedActionState(action, {}, {
    isSuccess: (nextState) => Boolean(nextState.message && nextState.codes),
    resetOnSuccess: !isEditing,
    onSuccess: isEditing ? undefined : resetAddFormState,
  });
  const [clientError, setClientError] = useState<string>();
  const [clientErrorDismissed, setClientErrorDismissed] = useState(false);
  const [dismissedState, setDismissedState] = useState<SalesMemberFormState | null>(null);
  const submissionLocked = useRef(false);
  const fieldErrors = state.fieldErrors ?? {};
  const previewCode = values?.referralCode ?? (eventCode ? `${REFERRAL_PREFIX[position]}-${eventCode}-${String(nextSequenceByPosition?.[position] ?? 1).padStart(3, "0")}` : "Atur kode event terlebih dahulu");
  const selectedPerson = people.find((person) => person.id === personId);
  const hasExistingPerson = isEditing || Boolean(selectedPerson);
  const expectedSupervisorPosition = requiredSupervisorPosition(position);
  const hasEligibleSupervisor = !expectedSupervisorPosition ||
    supervisors.some((supervisor) => supervisor.position === expectedSupervisorPosition);
  const notificationError = clientError ?? state.error;
  const notificationVisible = clientError
    ? !clientErrorDismissed
    : Boolean(state.error || state.message) && state !== dismissedState;

  useEffect(() => {
    if (!pending) submissionLocked.current = false;
  }, [pending]);

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending || submissionLocked.current) {
      event.preventDefault();
      return;
    }

    if (!event.currentTarget.checkValidity()) {
      event.preventDefault();
      event.currentTarget.reportValidity();
      const firstInvalidField = event.currentTarget.querySelector<HTMLElement>(":invalid");
      setClientError(
        firstInvalidField?.getAttribute("name") === "supervisorMemberId" &&
          expectedSupervisorPosition &&
          !hasEligibleSupervisor
          ? `Belum ada ${SALES_POSITION_LABELS[expectedSupervisorPosition]} aktif untuk jabatan ini. Tambahkan atasan tersebut terlebih dahulu.`
          : "Lengkapi semua field wajib dan periksa kembali format datanya.",
      );
      setClientErrorDismissed(false);
      return;
    }

    submissionLocked.current = true;
    setClientError(undefined);
    setClientErrorDismissed(false);
    setDismissedState(state);
    handleSubmit(event);
  }

  return (
    <form
      action={formAction}
      className="zas-sales-member-form"
      id={formId}
      noValidate
      onSubmit={handleFormSubmit}
      ref={formRef}
    >
      {notificationVisible && (
        <div
          aria-atomic="true"
          className={`zas-sales-notification ${notificationError ? "is-error" : "is-success"}`}
          role={notificationError ? "alert" : "status"}
        >
          <div>
            <h2>
              {notificationError
                ? isEditing ? "Gagal Menyimpan Perubahan" : "Gagal Menambahkan Anggota"
                : isEditing ? "Perubahan Berhasil Disimpan" : "Anggota Berhasil Ditambahkan"}
            </h2>
            <p>
              {notificationError ??
                (isEditing ? state.message : "Data anggota berhasil disimpan.")}
            </p>
            {!notificationError && state.codes && (
              <ul>
                <li><strong>Nama anggota:</strong> {state.codes.memberName}</li>
                <li><strong>Kode Anggota:</strong> {state.codes.memberCode}</li>
                <li><strong>Kode Referral Event:</strong> {state.codes.referralCode}</li>
              </ul>
            )}
          </div>
          <button
            aria-label="Tutup notifikasi"
            className="zas-sales-notification-close"
            onClick={() => {
              if (clientError) setClientErrorDismissed(true);
              else setDismissedState(state);
            }}
            type="button"
          >
            Tutup
          </button>
        </div>
      )}
      {!isEditing && (
        <div className="zas-sales-field zas-sales-person-picker">
          <label htmlFor={`${formId}-personId`}>Identitas anggota</label>
          <select
            aria-describedby={fieldErrors.personId ? `${formId}-personId-error` : undefined}
            aria-invalid={Boolean(fieldErrors.personId)}
            id={`${formId}-personId`}
            name="personId"
            onChange={(event) => setPersonId(event.currentTarget.value)}
            value={personId}
          >
            <option value="">Buat identitas baru</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.fullName} · {person.memberCode}
              </option>
            ))}
          </select>
          {fieldErrors.personId && (
            <span className="zas-sales-field-error" id={`${formId}-personId-error`}>
              {fieldErrors.personId}
            </span>
          )}
        </div>
      )}
      {hasExistingPerson ? (
        <>
          {isEditing ? (
            <>
              <div className="zas-sales-field">
                <FormFieldLabel htmlFor={`${formId}-fullName`} required showRequiredIndicator={isEditing}>
                  Nama lengkap
                </FormFieldLabel>
                <input
                  aria-describedby={fieldErrors.fullName ? `${formId}-fullName-error` : undefined}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  autoComplete="name"
                  defaultValue={values?.fullName ?? ""}
                  id={`${formId}-fullName`}
                  maxLength={160}
                  name="fullName"
                  placeholder="Masukkan nama lengkap"
                  required
                />
                {fieldErrors.fullName && (
                  <span className="zas-sales-field-error" id={`${formId}-fullName-error`}>
                    {fieldErrors.fullName}
                  </span>
                )}
              </div>
              <div className="zas-sales-field">
                <label htmlFor={`${formId}-memberCode`}>Kode Anggota</label>
                <input
                  defaultValue={values?.memberCode ?? ""}
                  id={`${formId}-memberCode`}
                  readOnly
                />
              </div>
              <div className="zas-sales-field">
                <FormFieldLabel htmlFor={`${formId}-phone`} required showRequiredIndicator={isEditing}>
                  Nomor telepon
                </FormFieldLabel>
                <input
                  aria-describedby={fieldErrors.phone ? `${formId}-phone-error` : undefined}
                  aria-invalid={Boolean(fieldErrors.phone)}
                  autoComplete="tel"
                  defaultValue={values?.phone ?? ""}
                  id={`${formId}-phone`}
                  maxLength={40}
                  name="phone"
                  placeholder="Contoh: +62 812-3456-7890"
                  required
                  type="tel"
                />
                {fieldErrors.phone && (
                  <span className="zas-sales-field-error" id={`${formId}-phone-error`}>
                    {fieldErrors.phone}
                  </span>
                )}
              </div>
              <div className="zas-sales-field">
                <label htmlFor={`${formId}-email`}>
                  Email <span>(opsional)</span>
                </label>
                <input
                  aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined}
                  aria-invalid={Boolean(fieldErrors.email)}
                  autoComplete="email"
                  defaultValue={values?.email ?? ""}
                  id={`${formId}-email`}
                  maxLength={320}
                  name="email"
                  placeholder="Email aktif"
                  type="email"
                />
                {fieldErrors.email && (
                  <span className="zas-sales-field-error" id={`${formId}-email-error`}>
                    {fieldErrors.email}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="zas-sales-field zas-sales-person-selected">
              <span>Identitas terpilih</span>
              <strong>{selectedPerson?.fullName}</strong>
              <small>{selectedPerson?.memberCode} · kontak dikelola pada identitas global</small>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="zas-sales-field">
            <FormFieldLabel htmlFor={`${formId}-fullName`} required showRequiredIndicator={isEditing}>
              Nama lengkap
            </FormFieldLabel>
            <input
              aria-describedby={fieldErrors.fullName ? `${formId}-fullName-error` : undefined}
              aria-invalid={Boolean(fieldErrors.fullName)}
              autoComplete="name"
              defaultValue=""
              id={`${formId}-fullName`}
              maxLength={160}
              name="fullName"
              placeholder="Masukkan nama lengkap"
              required
            />
            {fieldErrors.fullName && (
              <span className="zas-sales-field-error" id={`${formId}-fullName-error`}>
                {fieldErrors.fullName}
              </span>
            )}
          </div>
          <div className="zas-sales-field">
            <span className="zas-sales-field-caption">Kode Anggota</span>
            <p className="zas-sales-form-note">Dibuat otomatis oleh sistem setelah anggota disimpan.</p>
          </div>
          <div className="zas-sales-field">
            <FormFieldLabel htmlFor={`${formId}-phone`} required showRequiredIndicator={isEditing}>
              Nomor telepon
            </FormFieldLabel>
            <input
              aria-describedby={fieldErrors.phone ? `${formId}-phone-error` : undefined}
              aria-invalid={Boolean(fieldErrors.phone)}
              autoComplete="tel"
              defaultValue=""
              id={`${formId}-phone`}
              maxLength={40}
              name="phone"
              placeholder="Contoh: +62 812-3456-7890"
              required
              type="tel"
            />
            {fieldErrors.phone && (
              <span className="zas-sales-field-error" id={`${formId}-phone-error`}>
                {fieldErrors.phone}
              </span>
            )}
          </div>
          <div className="zas-sales-field">
            <label htmlFor={`${formId}-email`}>Email</label>
            <input
              aria-describedby={fieldErrors.email ? `${formId}-email-error` : undefined}
              aria-invalid={Boolean(fieldErrors.email)}
              autoComplete="email"
              defaultValue=""
              id={`${formId}-email`}
              maxLength={320}
              name="email"
              placeholder="Email aktif"
              type="email"
            />
            {fieldErrors.email && (
              <span className="zas-sales-field-error" id={`${formId}-email-error`}>
                {fieldErrors.email}
              </span>
            )}
          </div>
        </>
      )}
      <div className="zas-sales-field">
        <FormFieldLabel htmlFor={`${formId}-position`} required showRequiredIndicator={isEditing}>
          Jabatan pada event
        </FormFieldLabel>
        {isEditing && <input name="position" type="hidden" value={position} />}
        <select
          aria-describedby={fieldErrors.position ? `${formId}-position-error` : undefined}
          aria-invalid={Boolean(fieldErrors.position)}
          disabled={isEditing}
          id={`${formId}-position`}
          onChange={(event) => setPosition(event.currentTarget.value as SalesPosition)}
          value={position}
          name="position"
          required
        >
          {Object.entries(SALES_POSITION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {fieldErrors.position && (
          <span className="zas-sales-field-error" id={`${formId}-position-error`}>
            {fieldErrors.position}
          </span>
        )}
      </div>
      <div className="zas-sales-field">
        <FormFieldLabel htmlFor={`${formId}-region`} required showRequiredIndicator={isEditing}>
          Wilayah kerja
        </FormFieldLabel>
        <input
          aria-describedby={fieldErrors.region ? `${formId}-region-error` : undefined}
          aria-invalid={Boolean(fieldErrors.region)}
          defaultValue={values?.region ?? ""}
          id={`${formId}-region`}
          maxLength={160}
          name="region"
          placeholder="Masukkan wilayah kerja"
          required
        />
        {fieldErrors.region && (
          <span className="zas-sales-field-error" id={`${formId}-region-error`}>
            {fieldErrors.region}
          </span>
        )}
      </div>
      <div className="zas-sales-field">
        <FormFieldLabel htmlFor={`${formId}-supervisor`} required={position !== "director"} showRequiredIndicator={isEditing}>
          Atasan langsung
        </FormFieldLabel>
        {position === "director" ? (
          <>
            <input id={`${formId}-supervisor`} name="supervisorMemberId" type="hidden" value="" />
            <p className="zas-sales-form-note">Direktur Pemasaran adalah puncak struktur event.</p>
          </>
        ) : (
          <select
            aria-describedby={fieldErrors.supervisorMemberId ? `${formId}-supervisor-error` : undefined}
            aria-invalid={Boolean(fieldErrors.supervisorMemberId)}
            defaultValue={values?.supervisorMemberId ?? ""}
            id={`${formId}-supervisor`}
            name="supervisorMemberId"
            required
          >
            <option value="" disabled>
              Pilih atasan aktif
            </option>
            {supervisors
              .filter((supervisor) => supervisor.position === requiredSupervisorPosition(position))
              .map((supervisor) => (
                <option key={supervisor.id} value={supervisor.id}>
                  {supervisor.fullName} · {SALES_POSITION_LABELS[supervisor.position]}
                </option>
              ))}
          </select>
        )}
        {expectedSupervisorPosition && !hasEligibleSupervisor && (
          <p className="zas-sales-form-note">
              Belum ada {SALES_POSITION_LABELS[expectedSupervisorPosition]} aktif. Tambahkan atasan tersebut terlebih dahulu.
          </p>
        )}
        {fieldErrors.supervisorMemberId && (
          <span className="zas-sales-field-error" id={`${formId}-supervisor-error`}>
            {fieldErrors.supervisorMemberId}
          </span>
        )}
      </div>
      <div className="zas-sales-field">
        <FormFieldLabel htmlFor={`${formId}-joinedAt`} required showRequiredIndicator={isEditing}>
          Tanggal bergabung
        </FormFieldLabel>
        <input
          aria-describedby={fieldErrors.joinedAt ? `${formId}-joinedAt-error` : undefined}
          aria-invalid={Boolean(fieldErrors.joinedAt)}
          defaultValue={values?.joinedAt ?? ""}
          id={`${formId}-joinedAt`}
          name="joinedAt"
          required
          type="date"
        />
        {fieldErrors.joinedAt && (
          <span className="zas-sales-field-error" id={`${formId}-joinedAt-error`}>
            {fieldErrors.joinedAt}
          </span>
        )}
      </div>
      <div className="zas-sales-field">
        <label htmlFor={`${formId}-referralCode`}>Kode referral event</label>
        <input id={`${formId}-referralCode`} readOnly value={previewCode} />
        {!values && <small className="zas-sales-form-note">Dibuat otomatis dan dikunci setelah anggota disimpan.</small>}
      </div>
      <div className="zas-sales-field">
        <FormFieldLabel htmlFor={`${formId}-quotaAmount`} required showRequiredIndicator={isEditing}>
          Kuota Penjualan
        </FormFieldLabel>
        <div className="zas-sales-input-with-unit">
          <input
            aria-describedby={
              fieldErrors.quotaAmount
                ? `${formId}-quotaAmount-unit ${formId}-quotaAmount-error`
                : `${formId}-quotaAmount-unit`
            }
            aria-invalid={Boolean(fieldErrors.quotaAmount)}
            defaultValue={values?.quotaAmount ?? "0"}
            id={`${formId}-quotaAmount`}
            inputMode="numeric"
            min="0"
            name="quotaAmount"
            placeholder="Masukkan jumlah tiket"
            required
            step="1"
            type="number"
          />
          <span id={`${formId}-quotaAmount-unit`}>tiket</span>
        </div>
        {fieldErrors.quotaAmount && (
          <span className="zas-sales-field-error" id={`${formId}-quotaAmount-error`}>
            {fieldErrors.quotaAmount}
          </span>
        )}
      </div>
      <div className="zas-sales-form-actions">
        <button
          aria-busy={pending}
          className="zas-admin-primary-link"
          disabled={pending || !eventCode}
          type="submit"
        >
          {pending ? "Menyimpan..." : values ? "Simpan Perubahan" : "Tambah Anggota"}
        </button>
      </div>
    </form>
  );
}
