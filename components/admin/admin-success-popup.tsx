"use client";

import { useState } from "react";

export function AdminSuccessPopup({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="zas-admin-success-popup" role="status" aria-live="polite">
      <span aria-hidden="true" className="zas-admin-success-popup-icon">✓</span>
      <p>{message}</p>
      <button
        aria-label="Tutup notifikasi"
        className="zas-admin-success-popup-close"
        onClick={() => setVisible(false)}
        type="button"
      >
        ×
      </button>
    </div>
  );
}
