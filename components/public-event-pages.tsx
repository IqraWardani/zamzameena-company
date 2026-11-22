import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { EventOrderForm } from "@/components/event-order-form";
import { formatPrice } from "@/lib/format-price";
import type { PublicEvent, PublicTicketType } from "@/lib/public-events/data";
import { getPublicEventPath } from "@/lib/public-events/public";

function formatEventDate(event: PublicEvent): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: event.timezone,
  });
  return `${formatter.format(event.startsAt)} – ${formatter.format(event.endsAt)}`;
}

function formatTicketPrice(ticket: PublicTicketType): string {
  const amount = Number(ticket.priceAmount);
  if (amount === 0) return "Gratis";
  if (!Number.isFinite(amount)) return `${ticket.priceAmount} ${ticket.currency}`;

  return formatPrice(ticket.priceAmount, ticket.currency, {
    maximumFractionDigits: 2,
  });
}

function registrationStatusLabel(status: PublicEvent["registrationStatus"]): string {
  switch (status) {
    case "open":
      return "Pendaftaran dibuka";
    case "upcoming":
      return "Pendaftaran segera dibuka";
    case "closed":
      return "Pendaftaran ditutup";
  }
}

function EventVisual({
  label,
  keyVisualUrl,
}: {
  label: string;
  keyVisualUrl?: string | null;
}) {
  return (
    <div aria-label={label} className="zas-event-visual" role="img">
      {keyVisualUrl ? (
        <Image
          alt=""
          aria-hidden="true"
          className="zas-event-visual-image"
          fill
          sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 40vw"
          src={keyVisualUrl}
          unoptimized
        />
      ) : (
        <>
          <span aria-hidden="true" className="zas-event-visual-orbit" />
          <span aria-hidden="true" className="zas-event-visual-core">ZAS</span>
          <span className="zas-event-visual-caption">ZAMZAMEENA AINSA SYNERGY</span>
        </>
      )}
    </div>
  );
}

function EventBreadcrumbs({ current }: { current?: string }) {
  return (
    <Breadcrumbs
      items={[
        { label: "Beranda", href: "/" },
        ...(current
          ? [{ label: "Event", href: "/event" }, { label: current }]
          : [{ label: "Event" }]),
      ]}
    />
  );
}

function EventButton({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      className={`zas-event-button${secondary ? " is-secondary" : ""}`}
      href={href}
    >
      {children}
      <span aria-hidden="true">↗</span>
    </Link>
  );
}

function EventSummaryCard({ event }: { event: PublicEvent }) {
  const lowestTicket = event.ticketTypes[0];
  return (
    <aside aria-label="Ringkasan event" className="zas-event-summary-card">
      <p className="zas-event-eyebrow">RINGKASAN EVENT</p>
      <h2>{event.name}</h2>
      <dl>
        <div>
          <dt>Status pendaftaran</dt>
          <dd>{registrationStatusLabel(event.registrationStatus)}</dd>
        </div>
        <div>
          <dt>Harga tiket</dt>
          <dd>{lowestTicket ? `Mulai ${formatTicketPrice(lowestTicket)}` : "Belum tersedia"}</dd>
        </div>
        {event.venueName && (
          <div>
            <dt>Lokasi</dt>
            <dd>{[event.venueName, event.venueAddress].filter(Boolean).join(", ")}</dd>
          </div>
        )}
      </dl>
      <EventButton href={getPublicEventPath(event.slug, "ticket")}>Lihat Tiket</EventButton>
      <Link
        className="zas-event-referral-link"
        href={`/event/${encodeURIComponent(event.slug)}/link-penjualan`}
      >
        Cari Penjual
      </Link>
    </aside>
  );
}

export function EventListingPage({ events }: { events: PublicEvent[] }) {
  return (
    <main className="zas-event-page" id="main-content" lang="id">
      <div className="zas-event-shell">
        <EventBreadcrumbs />
        <header className="zas-event-listing-hero">
          <p className="zas-event-eyebrow">ZAMZAMEENA AINSA SYNERGY</p>
          <h1>Event &amp; Program</h1>
          <p>
            Informasi event dan program publik ZAMZAMEENA AINSA SYNERGY.
          </p>
        </header>

        {events.length > 0 ? (
          <section aria-labelledby="public-event-list-title" className="zas-event-list-section">
            <div className="zas-event-section-heading">
              <div>
                <p className="zas-event-eyebrow">AGENDA TERPILIH</p>
                <h2 id="public-event-list-title">Daftar event</h2>
              </div>
            </div>
            <div className={`zas-event-list-grid${events.length > 10 ? " zas-data-list-scroll" : ""}`}>
              {events.map((event) => (
                <article className="zas-event-list-card" key={event.slug}>
                  <Link
                    aria-label={`Lihat detail ${event.name}`}
                    className="zas-event-list-card-visual-link"
                    href={getPublicEventPath(event.slug)}
                  >
                    <EventVisual
                      keyVisualUrl={event.keyVisualUrl}
                      label={`Key Visual untuk ${event.name}`}
                    />
                  </Link>
                  <div className="zas-event-list-card-content">
                    <div className="zas-event-card-meta">
                      <span className="zas-event-status">
                        {registrationStatusLabel(event.registrationStatus)}
                      </span>
                      <span>EVENT ZAS</span>
                    </div>
                    <h3>{event.name}</h3>
                    {event.startsAt && (
                      <p className="zas-event-card-location">{formatEventDate(event)}</p>
                    )}
                    {event.venueName && (
                      <p className="zas-event-card-location">
                        {[event.venueName, event.venueAddress].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {event.description && (
                      <p className="zas-event-card-summary">{event.description}</p>
                    )}
                    <Link className="zas-event-text-link" href={getPublicEventPath(event.slug)}>
                      Lihat Detail <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section aria-labelledby="event-empty-title" className="zas-event-empty-state">
            <p className="zas-event-eyebrow">EVENT</p>
            <h2 id="event-empty-title">Belum ada event yang diumumkan</h2>
            <p>Silakan kembali lagi untuk melihat informasi event publik.</p>
          </section>
        )}

        <section className="zas-event-contact-cta">
          <div>
            <p className="zas-event-eyebrow">INFORMASI LEBIH LANJUT</p>
            <h2>Ingin mengetahui lebih banyak?</h2>
            <p>Hubungi tim ZAS untuk pertanyaan umum mengenai event dan program.</p>
          </div>
          <EventButton href="/contact" secondary>Hubungi Kami</EventButton>
        </section>
      </div>
    </main>
  );
}

export function EventDetailPage({ event }: { event: PublicEvent }) {
  const venue = [event.venueName, event.venueAddress].filter(Boolean).join(", ");
  return (
    <main className="zas-event-page" id="main-content" lang="id">
      <div className="zas-event-shell">
        <EventBreadcrumbs current={event.name} />
        <header className="zas-event-detail-hero">
          <div className="zas-event-detail-copy">
            <p className="zas-event-eyebrow">EVENT ZAMZAMEENA AINSA SYNERGY</p>
            <h1>{event.name}</h1>
            {event.description && <p>{event.description}</p>}
            <dl className="zas-event-hero-meta">
              <div>
                <dt>Tanggal &amp; waktu</dt>
                <dd>{formatEventDate(event)}</dd>
              </div>
              {venue && (
                <div>
                  <dt>Lokasi</dt>
                  <dd>{venue}</dd>
                </div>
              )}
            </dl>
            <EventButton href={getPublicEventPath(event.slug, "ticket")}>Lihat Tiket</EventButton>
          </div>
          <EventVisual
            keyVisualUrl={event.keyVisualUrl}
            label={`Key Visual untuk ${event.name}`}
          />
        </header>

        <div className="zas-event-detail-layout">
          <div className="zas-event-detail-content">
            <section className="zas-event-content-section" id="tentang">
              <p className="zas-event-eyebrow">TENTANG</p>
              <h2>Tentang Event</h2>
              {event.description ? (
                <p>{event.description}</p>
              ) : (
                <p>Informasi mengenai event ini belum tersedia.</p>
              )}
            </section>
          </div>
          <div className="zas-event-detail-sidebar">
            <EventSummaryCard event={event} />
          </div>
        </div>
      </div>
    </main>
  );
}

export function EventTicketPage({ event }: { event: PublicEvent }) {
  return (
    <main className="zas-event-page" id="main-content" lang="id">
      <div className="zas-event-shell">
        <EventBreadcrumbs current="Tiket" />
        <header className="zas-event-subpage-hero">
          <p className="zas-event-eyebrow">TIKET &amp; AKSES</p>
          <h1>Informasi Tiket</h1>
          <p>{event.name}{event.description ? ` · ${event.description}` : ""}</p>
        </header>

        <section aria-labelledby="ticket-options-title" className="zas-event-ticket-section">
          <div className="zas-event-section-heading">
            <div>
              <p className="zas-event-eyebrow">PILIHAN TIKET</p>
              <h2 id="ticket-options-title">Tiket event</h2>
            </div>
            <p>Pembayaran diverifikasi secara manual oleh tim.</p>
          </div>
          {event.ticketTypes.length > 0 ? (
            <div className={`zas-event-ticket-list${event.ticketTypes.length > 10 ? " zas-data-list-scroll" : ""}`}>
              {event.ticketTypes.map((ticket) => (
                <article
                  className="zas-event-ticket-card"
                  key={ticket.code}
                  style={{
                    backgroundImage: event.keyVisualUrl
                      ? `linear-gradient(90deg, rgb(8 14 19 / 88%), rgb(8 14 19 / 72%)), url("${event.keyVisualUrl}")`
                      : undefined,
                  }}
                >
                  <div className="zas-event-ticket-card-heading">
                    <p>{event.name}</p>
                    <span>{ticket.code}</span>
                  </div>
                  <div className="zas-event-ticket-card-main">
                    <h3>{ticket.name}</h3>
                    <p className="zas-event-ticket-price">{formatTicketPrice(ticket)}</p>
                  </div>
                  <div className="zas-event-ticket-card-bottom">
                    <div className="zas-event-ticket-card-information">
                      {ticket.description && (
                        <div className="zas-event-ticket-facilities">
                          <span>Fasilitas</span>
                          <p>{ticket.description}</p>
                        </div>
                      )}
                      {ticket.capacity !== null && (
                        <p className="zas-event-ticket-quota">Kapasitas: {ticket.capacity}</p>
                      )}
                    </div>
                    <div className="zas-event-ticket-card-actions">
                      <span className="zas-event-status">Tersedia</span>
                      <EventButton
                        href={getPublicEventPath(event.slug, "order", ticket.code)}
                      >
                        Pilih Tiket
                      </EventButton>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="zas-event-empty-state">
              <p className="zas-event-eyebrow">TIKET</p>
              <h2>Belum ada tiket yang tersedia</h2>
              <p>Informasi tiket akan ditampilkan setelah tersedia.</p>
            </div>
          )}
        </section>

        <section className="zas-event-back-link">
          <Link className="zas-event-text-link" href={getPublicEventPath(event.slug)}>
            Kembali ke detail event <span aria-hidden="true">↗</span>
          </Link>
        </section>
      </div>
    </main>
  );
}

export function EventOrderPage({
  event,
  selectedTicket,
  initialReferralCode,
}: {
  event: PublicEvent;
  selectedTicket: PublicTicketType | null;
  initialReferralCode: string;
}) {
  return (
    <main className="zas-event-page" id="main-content" lang="id">
      <div className="zas-event-shell">
        <EventBreadcrumbs current="Order" />
        <header className="zas-event-subpage-hero">
          <p className="zas-event-eyebrow">PEMESANAN TIKET</p>
          <h1>Order Tiket</h1>
          <p>{event.name}</p>
        </header>
        {selectedTicket ? (
          <EventOrderForm
            backHref={getPublicEventPath(event.slug, "ticket")}
            eventName={event.name}
            eventSlug={event.slug}
            initialReferralCode={initialReferralCode}
            ticket={selectedTicket}
          />
        ) : (
          <section className="zas-event-empty-state">
            <p className="zas-event-eyebrow">TIKET TIDAK TERSEDIA</p>
            <h2>Pilih tiket yang tersedia</h2>
            <p>Tiket ini tidak tersedia untuk pemesanan saat ini.</p>
            <EventButton href={getPublicEventPath(event.slug, "ticket")}>Lihat Tiket</EventButton>
          </section>
        )}
      </div>
    </main>
  );
}

export function PublicEventNotFound() {
  return (
    <main className="zas-event-page" id="main-content" lang="id">
      <div className="zas-event-shell">
        <EventBreadcrumbs current="Tidak ditemukan" />
        <section className="zas-event-empty-state">
          <p className="zas-event-eyebrow">EVENT</p>
          <h1>Halaman tidak ditemukan</h1>
          <p>Event yang dicari tidak tersedia.</p>
          <EventButton href="/event">Kembali ke Event</EventButton>
        </section>
      </div>
    </main>
  );
}
