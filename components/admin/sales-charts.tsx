"use client";

import { useMemo, useState } from "react";
import { SALES_POSITION_LABELS, type SalesPosition } from "@/lib/sales/labels";
import { selectSalesTrend, type SalesTrendEntry } from "@/lib/sales/chart-data";

type SalesTrendPoint = Pick<SalesTrendEntry, "date" | "tickets">;

type SalesPersonPoint = {
  id: string;
  name: string;
  position: SalesPosition;
  tickets: number;
};

const POSITION_OPTIONS: Array<{ value: SalesPosition | "director"; label: string }> = [
  { value: "director", label: "Direktur Pemasaran" },
  { value: "arm", label: SALES_POSITION_LABELS.arm },
  { value: "branch_manager", label: SALES_POSITION_LABELS.branch_manager },
  { value: "sales", label: SALES_POSITION_LABELS.sales },
];

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    ...options,
  }).format(new Date(`${value}T12:00:00Z`));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

function chartCoordinates(points: SalesTrendPoint[]) {
  const width = 720;
  const height = 260;
  const left = 54;
  const right = 12;
  const top = 18;
  const bottom = 36;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maximum = Math.max(1, ...points.map((point) => point.tickets));
  const firstDate = points.length
    ? new Date(`${points[0].date}T12:00:00Z`).getTime()
    : 0;
  const lastDate = points.length
    ? new Date(`${points.at(-1)!.date}T12:00:00Z`).getTime()
    : 0;
  const dateRange = Math.max(1, lastDate - firstDate);

  return {
    width,
    height,
    left,
    right,
    top,
    bottom,
    plotWidth,
    plotHeight,
    maximum,
    values: points.map((point) => ({
      ...point,
      x: points.length === 1
        ? left + plotWidth / 2
        : left + ((new Date(`${point.date}T12:00:00Z`).getTime() - firstDate) / dateRange) * plotWidth,
      y: top + plotHeight - (point.tickets / maximum) * plotHeight,
    })),
  };
}

function smoothPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middleX = (previous.x + current.x) / 2;
    path += ` Q ${previous.x} ${previous.y} ${middleX} ${(previous.y + current.y) / 2}`;
  }
  const last = points.at(-1)!;
  return `${path} T ${last.x} ${last.y}`;
}

export function SalesCharts({
  trend,
  performers,
  today,
}: {
  trend: SalesTrendEntry[];
  performers: SalesPersonPoint[];
  today: string;
}) {
  const [period, setPeriod] = useState<"7" | "30" | "90" | "all">("30");
  const [trendMemberId, setTrendMemberId] = useState("all");
  const [position, setPosition] = useState<SalesPosition | "director" | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const [activePoint, setActivePoint] = useState<SalesTrendPoint | null>(null);

  const memberTrend = useMemo(
    () => selectSalesTrend(trend, trendMemberId),
    [trend, trendMemberId],
  );
  const visibleTrend = useMemo(() => {
    if (memberTrend.length === 0) return memberTrend;
    if (period === "all") {
      if (memberTrend.length <= 90) return memberTrend;
      const weekly = new Map<string, number>();
      for (const point of memberTrend) {
        const date = new Date(`${point.date}T12:00:00Z`);
        const weekday = (date.getUTCDay() + 6) % 7;
        date.setUTCDate(date.getUTCDate() - weekday);
        const weekStart = date.toISOString().slice(0, 10);
        weekly.set(weekStart, (weekly.get(weekStart) ?? 0) + point.tickets);
      }
      return [...weekly].map(([date, tickets]) => ({ date, tickets }));
    }
    const end = new Date(`${today}T12:00:00Z`).getTime();
    const cutoff = end - (Number(period) - 1) * 24 * 60 * 60 * 1000;
    return memberTrend.filter((point) => {
      const pointDate = new Date(`${point.date}T12:00:00Z`).getTime();
      return pointDate >= cutoff && pointDate <= end;
    });
  }, [memberTrend, period, today]);

  const chart = useMemo(() => chartCoordinates(visibleTrend), [visibleTrend]);
  const visibleActivePoint = activePoint
    ? visibleTrend.find((point) => point.date === activePoint.date) ?? null
    : null;
  const line = smoothPath(chart.values);
  const area = chart.values.length
    ? `${line} L ${chart.values.at(-1)!.x} ${chart.top + chart.plotHeight} L ${chart.values[0].x} ${chart.top + chart.plotHeight} Z`
    : "";
  const filteredPerformers = performers
    .filter((person) => position === "all" || person.position === position)
    .sort((first, second) => second.tickets - first.tickets || first.name.localeCompare(second.name, "id"))
    .slice(0, showAll ? undefined : 10);
  const maxTickets = Math.max(1, ...filteredPerformers.map((person) => person.tickets));
  const hasSales = filteredPerformers.some((person) => person.tickets > 0);

  return (
    <div className="zas-sales-chart-grid">
      <section className="zas-sales-chart-panel" aria-labelledby="sales-trend-title">
        <div className="zas-sales-chart-heading">
          <div>
            <p className="zas-admin-eyebrow">PENJUALAN TERVERIFIKASI</p>
            <h3 id="sales-trend-title">Tren penjualan tiket</h3>
            <p>Jumlah tiket pada invoice yang pembayarannya telah disetujui.</p>
          </div>
          <div className="zas-sales-chart-filters">
            <label className="zas-sales-chart-filter">
              Periode
              <select value={period} onChange={(event) => setPeriod(event.currentTarget.value as typeof period)}>
                <option value="7">7 hari terakhir</option>
                <option value="30">30 hari terakhir</option>
                <option value="90">90 hari terakhir</option>
                <option value="all">Semua periode</option>
              </select>
            </label>
            <label className="zas-sales-chart-filter">
              Penjual
              <select value={trendMemberId} onChange={(event) => setTrendMemberId(event.currentTarget.value)}>
                <option value="all">Semua penjual</option>
                <option value="unassigned">Tanpa referral</option>
                {performers.map((person) => (
                  <option key={person.id} value={person.id}>{person.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {visibleTrend.length === 0 ? (
          <p className="zas-sales-chart-empty">Belum ada tiket terjual pada periode ini.</p>
        ) : (
          <>
            <div className="zas-sales-line-chart">
              <svg
                aria-label="Grafik tren jumlah tiket terjual"
                role="group"
                viewBox={`0 0 ${chart.width} ${chart.height}`}
              >
                {[0, 0.5, 1].map((ratio) => {
                  const y = chart.top + chart.plotHeight * ratio;
                  const value = Math.round(chart.maximum * (1 - ratio));
                  return (
                    <g key={ratio}>
                      <line className="zas-sales-chart-gridline" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
                      <text className="zas-sales-chart-axis" textAnchor="end" x={chart.left - 10} y={y + 4}>{formatNumber(value)}</text>
                    </g>
                  );
                })}
                {area && <path className="zas-sales-chart-area" d={area} />}
                {line && <path className="zas-sales-chart-line" d={line} />}
                {chart.values.map((point) => (
                  <circle
                    className="zas-sales-chart-point"
                    cx={point.x}
                    cy={point.y}
                    key={point.date}
                    onBlur={() => setActivePoint(null)}
                    onFocus={() => setActivePoint(point)}
                    onMouseEnter={() => setActivePoint(point)}
                    onMouseLeave={() => setActivePoint(null)}
                    r={visibleActivePoint?.date === point.date ? 6 : 4}
                    tabIndex={0}
                  >
                    <title>{`${formatDate(point.date, { dateStyle: "long" })}: ${formatNumber(point.tickets)} tiket`}</title>
                  </circle>
                ))}
                {[chart.values[0], chart.values[Math.floor((chart.values.length - 1) / 2)], chart.values.at(-1)]
                  .filter((point, index, values): point is NonNullable<typeof point> => Boolean(point) && values.indexOf(point) === index)
                  .map((point, index, values) => (
                    <text
                      className="zas-sales-chart-axis"
                      key={`${point.date}-${index}`}
                      textAnchor={index === 0 ? "start" : index === values.length - 1 ? "end" : "middle"}
                      x={point.x}
                      y={chart.height - 8}
                    >
                      {formatDate(point.date, { day: "numeric", month: "short" })}
                    </text>
                  ))}
              </svg>
            </div>
            <p aria-live="polite" className="zas-sales-chart-tooltip">
              {visibleActivePoint
                ? `${formatDate(visibleActivePoint.date, { dateStyle: "long" })} · ${formatNumber(visibleActivePoint.tickets)} tiket`
                : `${formatNumber(visibleTrend.reduce((sum, point) => sum + point.tickets, 0))} tiket pada periode terpilih`}
            </p>
          </>
        )}
      </section>

      <section className="zas-sales-chart-panel" aria-labelledby="sales-performance-title">
        <div className="zas-sales-chart-heading">
          <div>
            <p className="zas-admin-eyebrow">PERFORMA ANGGOTA</p>
            <h3 id="sales-performance-title">Tiket per penjual</h3>
            <p>Perbandingan tiket dari pembayaran yang telah disetujui.</p>
          </div>
          <label className="zas-sales-chart-filter">
            Jabatan
            <select value={position} onChange={(event) => setPosition(event.currentTarget.value as typeof position)}>
              <option value="all">Semua jabatan</option>
              {POSITION_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>
        {!hasSales ? (
          <p className="zas-sales-chart-empty">
            {position === "director"
              ? "Direktur Pemasaran tidak dicatat sebagai anggota penjual langsung."
              : "Belum ada tiket terjual yang dapat dibandingkan."}
          </p>
        ) : (
          <>
            <div className={`zas-sales-bar-chart${showAll && filteredPerformers.length > 10 ? " zas-data-list-scroll" : ""}`}>
              {filteredPerformers.map((person) => (
                <div className="zas-sales-bar-row" key={person.id}>
                  <div className="zas-sales-bar-label">
                    <strong>{person.name}</strong>
                    <span>{SALES_POSITION_LABELS[person.position]}</span>
                  </div>
                  <div aria-label={`${person.tickets} tiket`} className="zas-sales-bar-track">
                    <span style={{ width: `${(person.tickets / maxTickets) * 100}%` }} />
                  </div>
                  <strong className="zas-sales-bar-value">{formatNumber(person.tickets)}</strong>
                </div>
              ))}
            </div>
            {performers.filter((person) => position === "all" || person.position === position).length > 10 && (
              <button
                className="zas-sales-chart-toggle"
                onClick={() => setShowAll((value) => !value)}
                type="button"
              >
                {showAll ? "Tampilkan Top 10" : "Tampilkan seluruh anggota"}
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
