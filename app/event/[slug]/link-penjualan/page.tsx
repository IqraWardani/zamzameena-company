import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReferralLinkSearch } from "@/components/referral-link-search";
import { getPublishedEventBySlug } from "@/lib/public-events/data";

type ReferralLinkPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ReferralLinkPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  return {
    title: event ? `Link Penjualan | ${event.name}` : "Event tidak ditemukan",
    description: "Cari penjual aktif dan bagikan link referral khusus event.",
  };
}

export default async function EventSalesLinkPage({ params }: ReferralLinkPageProps) {
  const { slug } = await params;
  const event = await getPublishedEventBySlug(slug);
  if (!event) notFound();

  return (
    <main className="zas-referral-page" id="main-content" lang="id">
      <div className="zas-referral-shell">
        <Link className="zas-referral-back-link" href={`/event/${encodeURIComponent(event.slug)}`}>
          Kembali ke event
        </Link>
        <header>
          <p className="zas-referral-eyebrow">LINK PENJUALAN EVENT</p>
          <h1>Bagikan undangan Anda</h1>
          <p>
            Cari penjual aktif untuk menampilkan link referral yang terhubung ke {event.name}.
          </p>
        </header>
        <section className="zas-referral-card" aria-label="Pencarian link referral">
          <ReferralLinkSearch
            eventName={event.name}
            eventSlug={event.slug}
            ticketCode={event.ticketTypes[0]?.code ?? null}
          />
        </section>
      </div>
    </main>
  );
}
