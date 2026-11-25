"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { SalesCharts } from "@/components/admin/sales-charts";

const DynamicSalesCharts = dynamic(
  () => import("@/components/admin/sales-charts").then((mod) => mod.SalesCharts),
  {
    ssr: false,
    loading: () => (
      <div className="zas-sales-chart-grid">
        <section aria-busy="true" className="zas-sales-chart-panel">
          <p className="zas-sales-chart-empty">Memuat tren penjualan…</p>
        </section>
        <section aria-busy="true" className="zas-sales-chart-panel">
          <p className="zas-sales-chart-empty">Memuat performa anggota…</p>
        </section>
      </div>
    ),
  },
);

export function ClientSalesCharts(props: ComponentProps<typeof SalesCharts>) {
  return <DynamicSalesCharts {...props} />;
}
