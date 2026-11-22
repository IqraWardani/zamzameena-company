"use client";

import { useState } from "react";
import { confirmUnclaimedPayment } from "@/app/admin/payments/actions";
import { usePreservedActionState } from "@/components/admin/use-preserved-action-state";

export function ManualPaymentConfirmation({
  registrationId,
  participantName,
  invoiceNumber,
  amountDue,
  currency,
  returnTo,
}: {
  registrationId: string;
  participantName: string;
  invoiceNumber: string;
  amountDue: string;
  currency: string;
  returnTo: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const action = confirmUnclaimedPayment.bind(null, registrationId);
  const { state, formAction, pending, formRef, handleSubmit } = usePreservedActionState(action, {});

  return (
    <>
      <button className="zas-admin-small-button zas-admin-confirm-payment-button" onClick={() => setIsOpen(true)} type="button">
        Konfirmasi Pembayaran
      </button>
      {state.message && (
        <p className="zas-payment-message" role="status">
          {state.message}
        </p>
      )}
      {isOpen && (
        <div
          aria-labelledby={`manual-payment-title-${registrationId}`}
          aria-modal="true"
          className="zas-admin-dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          role="dialog"
        >
          <section className="zas-admin-dialog">
            <header>
              <div>
                <p className="zas-admin-eyebrow">KONFIRMASI MANUAL</p>
                <h2 id={`manual-payment-title-${registrationId}`}>Konfirmasi pembayaran peserta</h2>
              </div>
              <button aria-label="Tutup konfirmasi" className="zas-whatsapp-close" onClick={() => setIsOpen(false)} type="button">
                ×
              </button>
            </header>
            <dl className="zas-admin-details">
              <div>
                <dt>Peserta</dt>
                <dd>{participantName}</dd>
              </div>
              <div>
                <dt>Invoice</dt>
                <dd>{invoiceNumber}</dd>
              </div>
              <div>
                <dt>Nominal tagihan</dt>
                <dd>
                  {amountDue} {currency}
                </dd>
              </div>
            </dl>
            <p className="zas-registration-privacy">Lanjutkan hanya setelah dana benar-benar diterima dan nominalnya cocok dengan tagihan. Status Paid akan menerbitkan tiket, mencatat admin dan waktu verifikasi.</p>
            <form action={formAction} className="zas-payment-review-form zas-payment-review-dialog-form" onSubmit={handleSubmit} ref={formRef}>
              <input name="returnTo" type="hidden" value={returnTo} />
              <label htmlFor={`manual-payment-note-${registrationId}`}>Catatan verifikasi (misalnya no rekening yang dipakai)</label>
              <textarea id={`manual-payment-note-${registrationId}`} maxLength={1000} minLength={3} name="reviewNote" placeholder="Bank yang digunakan... nomor rekening... atas nama siapa..." required rows={3} />
              <label className="zas-admin-confirm-checkbox">
                <input name="verificationConfirmed" required type="checkbox" value="confirmed" />
                Saya sudah menerima dan memverifikasi pembayaran sesuai nominal invoice.
              </label>
              {state.error && (
                <p className="zas-registration-error" role="alert">
                  {state.error}
                </p>
              )}
              <footer>
                <button className="zas-admin-secondary-button" onClick={() => setIsOpen(false)} type="button">
                  Batal
                </button>
                <button className="zas-admin-confirm-payment-button" disabled={pending} type="submit">
                  {pending ? "Menyimpan..." : "Konfirmasi"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
