export default function AdminLoading() {
  return (
    <main aria-busy="true" aria-live="polite" className="zas-admin-page">
      <header className="zas-admin-header">
        <div>
          <div className="zas-skeleton-text zas-skeleton-eyebrow" />
          <div className="zas-skeleton-text zas-skeleton-title" />
          <div className="zas-skeleton-text zas-skeleton-desc" />
        </div>
      </header>

      <section className="zas-admin-card zas-admin-wide-card">
        <div className="zas-skeleton-row">
          <div className="zas-skeleton-box" />
          <div className="zas-skeleton-box" />
          <div className="zas-skeleton-box" />
          <div className="zas-skeleton-box" />
        </div>
        <p className="zas-admin-loading-indicator">Memuat data dashboard…</p>
      </section>
    </main>
  );
}
