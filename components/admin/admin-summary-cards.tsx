import type { ReactNode } from "react";

export type AdminSummaryMetric = {
  label: string;
  value: number | string | null;
  description: string;
  icon:
    | "events"
    | "draft"
    | "published"
    | "registrations"
    | "participants"
    | "paid"
    | "unpaid"
    | "collected"
    | "uncollected";
  tone: string;
};

function SummaryMetricIcon({
  name,
}: {
  name: AdminSummaryMetric["icon"];
}) {
  const paths: Record<AdminSummaryMetric["icon"], ReactNode> = {
    events: (
      <>
        <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
        <path d="M8 2.75v3.5M16 2.75v3.5M3.5 9.5h17M8 13h3M8 16.5h8" />
      </>
    ),
    draft: (
      <>
        <path d="M12 3.5 20.5 8v8L12 20.5 3.5 16V8L12 3.5Z" />
        <path d="M12 8v4.5M12 16h.01" />
      </>
    ),
    published: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </>
    ),
    registrations: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-1.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.3a3 3 0 0 1 0 5.8M17 13.2a4.8 4.8 0 0 1 3.5 4.6V19" />
      </>
    ),
    participants: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19v-1.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.3a3 3 0 0 1 0 5.8M17 13.2a4.8 4.8 0 0 1 3.5 4.6V19" />
      </>
    ),
    paid: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m8 12 2.5 2.5L16.5 9" />
      </>
    ),
    unpaid: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5v5M12 16.5h.01" />
      </>
    ),
    collected: (
      <>
        <path d="M5 8.5h14v11H5zM8 8.5V6a4 4 0 0 1 8 0v2.5" />
        <path d="m9 13 2 2 4-4" />
      </>
    ),
    uncollected: (
      <>
        <path d="M5 8.5h14v11H5zM8 8.5V6a4 4 0 0 1 8 0v2.5" />
        <path d="M12 11.5v4M12 17.5h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={`zas-admin-metric-icon is-${name}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

export function AdminSummaryCards({
  metrics,
  className = "",
  ariaLabel = "Ringkasan",
}: {
  metrics: AdminSummaryMetric[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={`zas-admin-summary-grid ${className}`.trim()}
    >
      {metrics.map((metric) => (
        <article
          className={`zas-admin-summary-card is-${metric.tone}`}
          key={metric.label}
        >
          <span className="zas-admin-summary-icon">
            <SummaryMetricIcon name={metric.icon} />
          </span>
          <div className="zas-admin-summary-copy">
            <p>{metric.label}</p>
            <strong>
              {typeof metric.value === "number"
                ? metric.value.toLocaleString("id-ID")
                : metric.value ?? "—"}
            </strong>
            <small>{metric.description}</small>
          </div>
        </article>
      ))}
    </section>
  );
}

export function AdminSummaryCardsSkeleton({
  className = "",
  count = 4,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div
      aria-hidden="true"
      className={`zas-admin-summary-grid zas-admin-skeleton-summary ${className}`.trim()}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <div
          className="zas-admin-summary-card zas-admin-skeleton-card"
          key={idx}
        >
          <div className="zas-admin-summary-card-header">
            <div className="zas-admin-skeleton-line zas-admin-skeleton-label" />
            <div className="zas-admin-skeleton-icon" />
          </div>
          <div className="zas-admin-skeleton-line zas-admin-skeleton-metric" />
          <div className="zas-admin-skeleton-line zas-admin-skeleton-desc" />
        </div>
      ))}
    </div>
  );
}
