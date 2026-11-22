"use client";

import { useState } from "react";
import {
  createWhatsAppMessage,
  createWhatsAppUrl,
  type WhatsAppMessageInput,
} from "@/lib/payments/whatsapp-messages";

export function WhatsAppMessageButton({
  input,
  phone,
}: {
  input: WhatsAppMessageInput;
  phone: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(() => createWhatsAppMessage(input));
  const [openFailed, setOpenFailed] = useState(false);
  const url = createWhatsAppUrl(phone, message);
  const actionLabel =
    input.paymentStatus === "pending"
      ? input.paymentVerificationPending
        ? "WhatsApp - Pemberitahuan Verifikasi"
        : "WhatsApp - Pengingat Pembayaran"
      : "WhatsApp - Kirim Pesan";

  function openWhatsApp() {
    if (!url) return;
    setOpenFailed(false);
    const opened = window.open(url, "_blank");
    if (!opened) {
      setOpenFailed(true);
      return;
    }
    opened.opener = null;
  }

  return (
    <>
      <button
        aria-label={`${actionLabel} via WhatsApp`}
        className="zas-whatsapp-trigger"
        disabled={!url}
        onClick={() => {
          setMessage(createWhatsAppMessage(input));
          setIsOpen(true);
        }}
        title={url ? `${actionLabel} via WhatsApp` : "Nomor WhatsApp tidak valid"}
        type="button"
      >
        <svg aria-hidden="true" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.04 2a9.87 9.87 0 0 0-8.48 14.92L2 22l5.25-1.38A9.95 9.95 0 1 0 12.04 2Zm0 18.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.1.82.83-3.02-.2-.31A8.14 8.14 0 1 1 12.04 20.1Zm4.47-6.1c-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.57.13-.17.25-.65.81-.8.98-.15.17-.3.19-.55.06-.25-.13-1.06-.39-2.02-1.24-.75-.67-1.25-1.5-1.4-1.75-.15-.25-.02-.39.11-.52.11-.11.25-.3.38-.44.13-.15.17-.25.25-.42.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.87-.2-.49-.41-.42-.57-.43h-.49c-.17 0-.45.06-.68.32-.23.25-.89.87-.89 2.12s.91 2.46 1.04 2.63c.13.17 1.79 2.73 4.33 3.83.6.26 1.07.42 1.43.54.6.19 1.15.17 1.58.1.48-.07 1.48-.61 1.69-1.2.21-.59.21-1.1.15-1.2-.06-.1-.23-.17-.48-.29Z" />
        </svg>
        {actionLabel}
      </button>
      {isOpen && (
        <div
          aria-labelledby="whatsapp-preview-title"
          aria-modal="true"
          className="zas-whatsapp-dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
          role="dialog"
        >
          <section className="zas-whatsapp-dialog">
            <header>
              <div>
                <p className="zas-admin-eyebrow">WHATSAPP · {phone}</p>
                <h2 id="whatsapp-preview-title">Tinjau pesan</h2>
              </div>
              <button
                aria-label="Tutup pratinjau"
                className="zas-whatsapp-close"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                ×
              </button>
            </header>
            <label htmlFor="whatsapp-message">Pesan (dapat diedit untuk pengiriman ini)</label>
            <textarea
              id="whatsapp-message"
              onChange={(event) => setMessage(event.currentTarget.value)}
              rows={16}
              value={message}
            />
            <p className="zas-whatsapp-disclaimer">
              Pesan hanya disiapkan. Tekan Send di WhatsApp untuk mengirimkannya.
            </p>
            {openFailed && (
              <p className="zas-whatsapp-open-error" role="alert">
                WhatsApp tidak terbuka. Izinkan pop-up lalu coba kembali.
              </p>
            )}
            <footer>
              <button
                className="zas-admin-secondary-button"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Batal
              </button>
              <button
                className="zas-whatsapp-trigger"
                disabled={!url}
                onClick={openWhatsApp}
                type="button"
              >
                <span aria-hidden="true">↗</span>
                Buka WhatsApp
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
