import type { Metadata } from "next";
import { participantLogout } from "@/app/participant/actions";
import { PaymentProofForm } from "@/components/registration/payment-proof-form";
import { getParticipantSession } from "@/lib/participant/session";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "My Event Registrations",
  robots: { index: false, follow: false },
};

export default async function ParticipantPortalPage() {
  const session = await getParticipantSession();
  if (!session) {
    return (
      <main id="main-content" className="zas-registration-page">
        <section className="zas-registration-card">
          <p className="zas-registration-eyebrow">PARTICIPANT PORTAL</p>
          <h1>Registration status</h1>
          <p className="zas-registration-unavailable" role="status">
            To protect participant information, this page is available only in the browser used to register.
          </p>
          <p>Open your registration confirmation in that browser, or contact the event organizer if you need help.</p>
        </section>
      </main>
    );
  }

  const registrations = await prisma.registration.findMany({
    where: { id: { in: session.registrationIds } },
    orderBy: { registeredAt: "desc" },
    take: 20,
    select: {
      id: true,
      registrationNumber: true,
      status: true,
      registeredAt: true,
      event: { select: { name: true, startsAt: true, timezone: true } },
      participantProfile: { select: { fullName: true } },
      ticketType: { select: { name: true, priceAmount: true, currency: true } },
      tickets: {
        where: { status: "active" },
        select: { ticketCode: true },
        take: 1,
      },
      invoices: {
        orderBy: { issuedAt: "desc" },
        take: 1,
        select: {
          id: true,
          invoiceNumber: true,
          amountDue: true,
          currency: true,
          status: true,
          payments: {
            orderBy: { submittedAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              submittedAt: true,
              reviewNote: true,
            },
          },
        },
      },
    },
  });

  const paymentIds = registrations.flatMap((registration) =>
    registration.invoices.flatMap((invoice) =>
      invoice.payments.map((payment) => payment.id),
    ),
  );
  const documents = paymentIds.length
    ? await prisma.privateDocument.findMany({
        where: {
          ownerType: "payment",
          ownerId: { in: paymentIds },
          kind: "payment_proof",
          deletedAt: null,
        },
        select: { id: true, ownerId: true, originalFilename: true },
      })
    : [];
  const documentsByPayment = new Map(
    documents.map((document) => [document.ownerId, document]),
  );

  return (
    <main id="main-content" className="zas-registration-page">
      <header className="zas-registration-header">
        <p className="zas-registration-eyebrow">PARTICIPANT PORTAL</p>
        <h1>Your registrations</h1>
        <p className="zas-registration-description">
          Status is shown only for registrations confirmed in this browser session.
        </p>
        <form action={participantLogout}>
          <button className="zas-participant-signout" type="submit">Sign out</button>
        </form>
      </header>

      {registrations.length === 0 ? (
        <section className="zas-registration-card">
          <h2>No registrations yet</h2>
        </section>
      ) : (
        <div className={`zas-participant-registration-list${registrations.length > 10 ? " zas-data-list-scroll" : ""}`}>
          {registrations.map((registration) => {
            const invoice = registration.invoices[0];
            const payment = invoice?.payments[0];
            const document = payment ? documentsByPayment.get(payment.id) : undefined;
            const canSubmitProof =
              registration.status === "pending_payment" ||
              registration.status === "payment_rejected";
            const amountDue = invoice?.amountDue ?? registration.ticketType.priceAmount;

            return (
              <section className="zas-registration-card" key={registration.id}>
                <p className="zas-registration-eyebrow">{registration.registrationNumber}</p>
                <h2>{registration.event.name}</h2>
                <p className="zas-registration-description">{registration.participantProfile.fullName}</p>
                <dl className="zas-registration-event-meta">
                  <div>
                    <dt>Event date</dt>
                    <dd>{registration.event.startsAt.toLocaleString("en", { timeZone: registration.event.timezone })}</dd>
                  </div>
                  <div><dt>Ticket</dt><dd>{registration.ticketType.name}</dd></div>
                  <div>
                    <dt>Registration status</dt>
                    <dd><span className="zas-payment-status">{registration.status.replaceAll("_", " ")}</span></dd>
                  </div>
                  <div>
                    <dt>Amount due</dt>
                    <dd>
                      {amountDue.toFixed(2)} {invoice?.currency.trim() ?? registration.ticketType.currency.trim()}
                    </dd>
                  </div>
                  {invoice && (
                    <div>
                      <dt>Invoice number</dt>
                      <dd>
                        <strong>{invoice.invoiceNumber}</strong>
                        {" · "}{invoice.status.replaceAll("_", " ")}
                      </dd>
                    </div>
                  )}
                  {payment && <div><dt>Payment review</dt><dd>{payment.status}</dd></div>}
                  {registration.tickets[0] && (
                    <div><dt>Active ticket</dt><dd>{registration.tickets[0].ticketCode}</dd></div>
                  )}
                </dl>
                {invoice && (
                  <p>
                    <a
                      className="zas-registration-download"
                      href={`/participant/invoices/${invoice.id}`}
                    >
                      Preview and download invoice
                    </a>
                  </p>
                )}

                {payment?.reviewNote && (
                  <p className="zas-payment-review-note">
                    Reviewer note: {payment.reviewNote}
                  </p>
                )}
                {document && (
                  <p>
                    <a className="zas-registration-download" href={`/api/private-documents/${document.id}/download`}>
                      Download your payment proof
                    </a>
                  </p>
                )}
                {registration.status === "confirmed" ? (
                  <p className="zas-payment-message" role="status">
                    {registration.ticketType.priceAmount.isZero() && !invoice
                      ? "Registration confirmed. Your complimentary ticket is issued."
                      : "Payment approved. Your ticket is issued."}
                  </p>
                ) : canSubmitProof && amountDue.isZero() ? (
                  <p className="zas-registration-unavailable" role="status">
                    No payment is due. Please contact the event organizer for complimentary registration confirmation.
                  </p>
                ) : canSubmitProof ? (
                  <PaymentProofForm registrationId={registration.id} />
                ) : (
                  <p className="zas-registration-privacy" role="status">
                    Your payment is being reviewed. No ticket is issued until an administrator approves the payment.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
