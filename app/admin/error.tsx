"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin dashboard runtime error:", error);
  }, [error]);

  return (
    <main className="zas-admin-page zas-admin-error-page">
      <div className="zas-admin-card zas-admin-error-card">
        <div className="zas-admin-error-icon" aria-hidden="true">
          <svg
            fill="none"
            height="36"
            viewBox="0 0 24 24"
            width="36"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
              stroke="#e6b66a"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <h1>Terjadi Kendala Memuat Halaman Admin</h1>
        <p>
          Server mengalami kendala sementara saat memuat data. Silakan coba muat
          ulang halaman atau kembali ke dashboard.
        </p>
        {error.digest && (
          <p className="zas-admin-error-digest">
            Kode Diagnostik: <code>{error.digest}</code>
          </p>
        )}
        <div className="zas-admin-error-actions">
          <button
            className="zas-admin-primary-button"
            onClick={() => reset()}
            type="button"
          >
            Coba Lagi
          </button>
          <Link className="zas-admin-small-button" href="/admin">
            Kembali ke Dashboard
          </Link>
          <Link className="zas-admin-text-link" href="/admin/login">
            Halaman Login
          </Link>
        </div>
      </div>
    </main>
  );
}
