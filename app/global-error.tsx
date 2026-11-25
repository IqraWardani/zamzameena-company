"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          backgroundColor: "#0b1115",
          color: "#f5f5f5",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              marginBottom: "16px",
              color: "#e6b66a",
            }}
          >
            <svg
              fill="none"
              height="48"
              viewBox="0 0 24 24"
              width="48"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
          </div>
          <h1 style={{ fontSize: "24px", marginBottom: "12px", color: "#f5f5f5" }}>
            Terjadi Kendala Sistem
          </h1>
          <p style={{ color: "#9ca3af", maxWidth: "440px", marginBottom: "16px", lineHeight: 1.5 }}>
            Terjadi kesalahan teknis saat memuat sistem. Silakan muat ulang halaman.
          </p>
          {error.digest && (
            <p style={{ fontSize: "11px", color: "#6b7280", marginBottom: "20px" }}>
              Kode Error: <code>{error.digest}</code>
            </p>
          )}
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 24px",
              backgroundColor: "#d5ad78",
              color: "#0b1115",
              border: "none",
              borderRadius: "6px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
            }}
            type="button"
          >
            Muat Ulang
          </button>
        </div>
      </body>
    </html>
  );
}
