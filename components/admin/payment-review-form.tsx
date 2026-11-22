"use client";

import { useState } from "react";
import { reviewPayment } from "@/app/admin/payments/actions";
import { usePreservedActionState } from "@/components/admin/use-preserved-action-state";

export function PaymentReviewForm({
  paymentId,
  participantName,
  invoiceNumber,
  amountDue,
  amountClaimed,
  currency,
  proofHref,
  returnTo,
}: {
  paymentId: string;
  participantName: string;
  invoiceNumber: string;
  amountDue: string;
  amountClaimed: string;
  currency: string;
  proofHref: string | null;
  returnTo: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const action = reviewPayment.bind(null, paymentId);
  const { state, formAction, pending, formRef, handleSubmit } =
    usePreservedActionState(action, {});

  return (
    <>
      <button
        className="zas-admin-small-button"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Tinjau Pembayaran
      </button>
      {state.message && <p className="zas-payment-message" role="status">{state.message}</p>}
      {isOpen && (
        <div
          aria-labelledby={`payment-review-title-${paymentId}`}
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
                <p className="zas-admin-eyebrow">VERIFIKASI PEMBAYARAN</p>
                <h2 id={`payment-review-title-${paymentId}`}>Tinjau klaim pembayaran</h2>
              </div>
              <button
                aria-label="Tutup tinjauan"
                className="zas-whatsapp-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <dl className="zas-admin-details">
              <div><dt>Peserta</dt><dd>{participantName}</dd></div>
              <div><dt>Invoice</dt><dd>{invoiceNumber}</dd></div>
              <div><dt>Tagihan</dt><dd>{amountDue} {currency}</dd></div>
              <div><dt>Nominal klaim</dt><dd>{amountClaimed} {currency}</dd></div>
            </dl>
            {proofHref ? (
              <p><a className="zas-admin-text-link" href={proofHref}>Buka bukti transfer</a></p>
            ) : (
              <p className="zas-registration-privacy">Bukti transfer belum tersedia. Jangan setujui sebelum memeriksa pembayaran.</p>
            )}
            <form
              action={formAction}
              className="zas-payment-review-form zas-payment-review-dialog-form"
              onSubmit={handleSubmit}
              ref={formRef}
            >
              <input name="returnTo" type="hidden" value={returnTo} />
              <label htmlFor={`payment-review-note-${paymentId}`}>
                Catatan verifikasi atau alasan penolakan
              </label>
              <textarea
                id={`payment-review-note-${paymentId}`}
                maxLength={1000}
                name="reviewNote"
                rows={3}
              />
              <label className="zas-admin-confirm-checkbox">
                <input name="verificationConfirmed" type="checkbox" value="confirmed" />
                Saya sudah memeriksa bukti transfer dan mencocokkan nominal dengan invoice.
              </label>
              {state.error && <p className="zas-registration-error" role="alert">{state.error}</p>}
              <footer>
                <button
                  className="zas-admin-secondary-button"
                  onClick={() => setIsOpen(false)}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="zas-admin-danger-button"
                  disabled={pending}
                  name="decision"
                  type="submit"
                  value="reject"
                >
                  Tolak Pembayaran
                </button>
                <button
                  className="zas-admin-confirm-payment-button"
                  disabled={pending}
                  name="decision"
                  type="submit"
                  value="approve"
                >
                  {pending ? "Memverifikasi..." : "Konfirmasi Pembayaran"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
