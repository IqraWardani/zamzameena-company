"use client";

import { motion } from "framer-motion";

export default function AdminLoading() {
  return (
    <main aria-busy="true" className="zas-admin-page zas-admin-loading-page">
      <p role="status" className="zas-admin-loading-announcement">
        Memuat halaman admin...
      </p>

      {/* Header Skeleton */}
      <div className="zas-admin-header zas-admin-skeleton-header">
        <div>
          <div className="zas-admin-skeleton-line zas-admin-skeleton-eyebrow" />
          <div className="zas-admin-skeleton-line zas-admin-skeleton-title" />
          <div className="zas-admin-skeleton-line zas-admin-skeleton-subtitle" />
        </div>
        <div className="zas-admin-skeleton-button" />
      </div>

      {/* Navigation Skeleton */}
      <div className="zas-admin-navigation zas-admin-skeleton-nav">
        {[80, 110, 130, 120, 90, 80].map((width, idx) => (
          <div
            className="zas-admin-skeleton-nav-item"
            key={idx}
            style={{ width: `${width}px` }}
          />
        ))}
      </div>

      {/* Metric Cards Skeleton */}
      <div className="zas-admin-summary-grid zas-admin-skeleton-summary">
        {[0, 1, 2, 3].map((card) => (
          <motion.div
            animate={{ opacity: [0.6, 1, 0.6] }}
            className="zas-admin-summary-card zas-admin-skeleton-card"
            key={card}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: card * 0.1,
            }}
          >
            <div className="zas-admin-summary-card-header">
              <div className="zas-admin-skeleton-line zas-admin-skeleton-label" />
              <div className="zas-admin-skeleton-icon" />
            </div>
            <div className="zas-admin-skeleton-line zas-admin-skeleton-metric" />
            <div className="zas-admin-skeleton-line zas-admin-skeleton-desc" />
          </motion.div>
        ))}
      </div>

      {/* Content Table Skeleton */}
      <section className="zas-admin-card zas-admin-wide-card zas-admin-skeleton-section">
        <div className="zas-admin-section-heading">
          <div>
            <div className="zas-admin-skeleton-line zas-admin-skeleton-eyebrow" />
            <div className="zas-admin-skeleton-line zas-admin-skeleton-section-title" />
          </div>
        </div>

        <div className="zas-admin-skeleton-table">
          <div className="zas-admin-skeleton-table-header" />
          {[1, 2, 3, 4, 5].map((row) => (
            <motion.div
              animate={{ opacity: [0.5, 0.9, 0.5] }}
              className="zas-admin-skeleton-table-row"
              key={row}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
                delay: row * 0.08,
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
