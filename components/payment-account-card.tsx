"use client";

import { useState } from "react";
import { PAYMENT_ACCOUNT } from "@/lib/config/payment-account";

export function PaymentAccountCard() {
  const [feedback, setFeedback] = useState("");

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(PAYMENT_ACCOUNT.accountNumber);
      setFeedback("Nomor rekening disalin");
    } catch {
      setFeedback("Nomor rekening tidak dapat disalin. Silakan salin secara manual.");
    }
  }

  return (
    <section aria-labelledby="payment-account-heading" className="zas-event-payment-account-card">
      <header className="zas-event-payment-account-header">
        <p className="zas-event-eyebrow">INFORMASI PEMBAYARAN</p>
        <h2 id="payment-account-heading">Pembayaran</h2>
        <p>Silakan lakukan pembayaran ke rekening berikut.</p>
      </header>
      <div className="zas-event-payment-account-panel">
        <div className="zas-event-payment-bank">
          <strong>{PAYMENT_ACCOUNT.bankName}</strong>
          <span>Bank Central Asia</span>
        </div>
        <div className="zas-event-payment-account-number">
          <strong>{PAYMENT_ACCOUNT.accountNumber}</strong>
          <span>Nomor Rekening</span>
        </div>
        <div className="zas-event-payment-account-holder">
          <span>Nama Pemilik Rekening</span>
          <strong>{PAYMENT_ACCOUNT.accountHolder}</strong>
        </div>
      </div>
      <div className="zas-event-payment-account-actions">
        <button className="zas-event-button" onClick={copyAccountNumber} type="button">
          Salin Nomor Rekening
        </button>
        <p aria-live="polite" className="zas-event-payment-account-feedback" role="status">
          {feedback}
        </p>
      </div>
      <p className="zas-event-payment-account-note">
        Pastikan nominal pembayaran sesuai dengan total tagihan Anda.
      </p>
    </section>
  );
}
