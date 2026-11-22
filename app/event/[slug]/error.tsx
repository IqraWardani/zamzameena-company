"use client";

export default function EventDetailError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="zas-event-page" id="main-content" lang="id">
      <div className="zas-event-shell">
        <section className="zas-event-empty-state">
          <p className="zas-event-eyebrow">EVENT</p>
          <h1>Informasi event belum dapat dimuat</h1>
          <p>Silakan coba kembali beberapa saat lagi.</p>
          <button className="zas-event-button" onClick={reset} type="button">
            Coba Lagi <span aria-hidden="true">↻</span>
          </button>
        </section>
      </div>
    </main>
  );
}
