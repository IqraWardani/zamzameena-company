import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getParticipantSession } from "@/lib/participant/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Invoice Preview",
  robots: { index: false, follow: false },
};

export default async function ParticipantInvoicePage({
  params,
}: PageProps<"/participant/invoices/[invoiceId]">) {
  const [{ invoiceId }, participant] = await Promise.all([
    params,
    getParticipantSession(),
  ]);
  if (!participant) notFound();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      registration: { id: { in: participant.registrationIds } },
    },
    select: {
      invoiceNumber: true,
      issuedAt: true,
      amountDue: true,
      currency: true,
      status: true,
      registration: {
        select: {
          id: true,
          registrationNumber: true,
          event: { select: { name: true } },
          participantProfile: { select: { fullName: true } },
          ticketType: { select: { name: true } },
        },
      },
    },
  });
  if (!invoice) notFound();

  return (
    <main id="main-content" className="zas-registration-page">
      <header className="zas-registration-header">
        <p className="zas-registration-eyebrow">INVOICE PREVIEW</p>
        <h1>{invoice.registration.event.name}</h1>
        <p className="zas-registration-description">
          Invoice number: <strong>{invoice.invoiceNumber}</strong>
        </p>
      </header>
      <section className="zas-registration-card" aria-labelledby="invoice-details-title">
        <h2 id="invoice-details-title">Invoice details</h2>
        <dl className="zas-registration-event-meta">
          <div><dt>Invoice number</dt><dd>{invoice.invoiceNumber}</dd></div>
          <div><dt>Issued</dt><dd>{invoice.issuedAt.toLocaleDateString("id-ID", { dateStyle: "long" })}</dd></div>
          <div><dt>Participant</dt><dd>{invoice.registration.participantProfile.fullName}</dd></div>
          <div><dt>Registration</dt><dd>{invoice.registration.registrationNumber}</dd></div>
          <div><dt>Ticket</dt><dd>{invoice.registration.ticketType.name}</dd></div>
          <div><dt>Status</dt><dd>{invoice.status.replaceAll("_", " ")}</dd></div>
          <div><dt>Amount due</dt><dd>{invoice.amountDue.toFixed(2)} {invoice.currency.trim()}</dd></div>
        </dl>
        <p>
          <a
            className="zas-registration-download"
            href={`/participant/invoices/${invoiceId}/download`}
          >
            Download PDF invoice
          </a>
        </p>
        <p>
          <Link className="zas-registration-download" href="/participant">
            Back to participant portal
          </Link>
        </p>
      </section>
    </main>
  );
}
