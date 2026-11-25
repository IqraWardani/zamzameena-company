"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application runtime error:", error);
  }, [error]);

  return (
    <main className="zas-page zas-error-page">
      <div
        className="zas-container"
        style={{
          textAlign: "center",
          padding: "80px 20px",
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: "28px", color: "var(--zas-ink, #f5f5f5)" }}>
          Terjadi Kendala pada Server
        </h1>
        <p style={{ margin: "16px 0", color: "var(--zas-muted, #9ca3af)", maxWidth: "480px" }}>
          Halaman tidak dapat dimuat saat ini karena kendala jaringan atau server.
          Silakan coba beberapa saat lagi.
        </p>
        {error.digest && (
          <p style={{ fontSize: "12px", opacity: 0.7, margin: "8px 0" }}>
            Kode Diagnostik: <code>{error.digest}</code>
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: "14px",
            justifyContent: "center",
            marginTop: "24px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => reset()}
            style={{
              padding: "10px 22px",
              background: "#d5ad78",
              color: "#0e161c",
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
          <Link
            href="/"
            style={{
              padding: "10px 22px",
              background: "rgba(255,255,255,0.08)",
              color: "#f5f5f5",
              borderRadius: "6px",
              textDecoration: "none",
              fontSize: "14px",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  );
}
