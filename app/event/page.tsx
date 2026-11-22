import type { Metadata } from "next";
import { Suspense } from "react";
import { EventListingPage } from "@/components/public-event-pages";
import { listPublishedEvents } from "@/lib/public-events/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event & Program",
  description:
    "Jelajahi informasi event dan program publik dari Zamzameena Ainsa Synergy.",
};

async function PublishedEventListing() {
  const events = await listPublishedEvents();
  return <EventListingPage events={events} />;
}

export default function PublicEventListingRoute() {
  return (
    <Suspense
      fallback={
        <main aria-busy="true" aria-live="polite" className="zas-event-page" id="main-content" lang="id">
          <div className="zas-event-shell">
            <p className="zas-event-eyebrow">EVENT</p>
            <h1>Memuat informasi event…</h1>
          </div>
        </main>
      }
    >
      <PublishedEventListing />
    </Suspense>
  );
}
