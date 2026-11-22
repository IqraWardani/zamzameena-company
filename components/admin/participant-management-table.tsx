"use client";

import { useState } from "react";
import { ManualPaymentConfirmation } from "@/components/admin/manual-payment-confirmation";
import { PaymentReviewForm } from "@/components/admin/payment-review-form";
import { WhatsAppMessageButton } from "@/components/admin/whatsapp-message-button";

export type ParticipantManagementRow = {
  id: string;
  participantName: string;
  email: string;
  phone: string;
  profileDetails: {
    organizationName: string | null;
    jobTitle: string | null;
    city: string | null;
  };
  registrationDetails: {
    domicileAddress: string | null;
    identityAddress: string | null;
    businessComment: string | null;
  };
  registrationNumber: string;
  registeredAt: string;
  eventName: string;
  ticketName: string;
  ticketPrice: string;
  ticketCurrency: string;
  paymentStatus: "paid" | "unpaid" | "free" | "inactive";
  invoice: {
    number: string;
    legacyNumber: string | null;
    status: string;
    amountDue: string;
    currency: string;
  } | null;
  payment: {
    id: string;
    status: string;
    amountPaid: string;
    paidAt: string | null;
    submittedAt: string;
    reviewedAt: string | null;
    reviewNote: string | null;
    reviewerName: string | null;
    proof: { id: string; filename: string } | null;
  } | null;
  invitation: {
    collectedAt: string;
    method: string;
    collectorName: string;
  } | null;
};

function formatTimestamp(value: string): { date: string; time: string } {
  const date = new Date(value);
  return {
    date: new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(date),
    time: `${new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Jakarta",
    }).format(date)} WIB`,
  };
}

function paymentLabel(status: ParticipantManagementRow["paymentStatus"]): string {
  switch (status) {
    case "paid": return "Paid";
    case "unpaid": return "Unpaid";
    case "free": return "Gratis";
    case "inactive": return "Tidak aktif";
  }
}

export function ParticipantManagementTable({
  participants,
  firstRowNumber,
  returnTo,
}: {
  participants: ParticipantManagementRow[];
  firstRowNumber: number;
  returnTo: string;
}) {
  const [selectedParticipant, setSelectedParticipant] =
    useState<ParticipantManagementRow | null>(null);

  return (
    <>
      <div className="zas-admin-table-wrap zas-participant-table-wrap">
        <table className="zas-admin-table zas-participant-table">
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">Nama Peserta</th>
              <th scope="col">Nomor Invoice</th>
              <th scope="col">Registration Timestamp</th>
              <th scope="col">Payment Status</th>
              <th scope="col">Invitation Status</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant, index) => {
              const timestamp = formatTimestamp(participant.registeredAt);
              const invoiceNumber = participant.invoice?.number ?? "Belum diterbitkan";
              const amountDue =
                participant.invoice?.amountDue ?? participant.ticketPrice;
              const currency =
                participant.invoice?.currency ?? participant.ticketCurrency;
              const proofHref = participant.payment?.proof
                ? `/api/private-documents/${participant.payment.proof.id}/download`
                : null;
              const paymentVerificationPending =
                participant.payment?.status === "submitted" &&
                participant.payment.proof !== null;

              return (
                <tr key={participant.id}>
                  <td>{firstRowNumber + index}</td>
                  <td>
                    <strong className="zas-participant-name">{participant.participantName}</strong>
                    <small className="zas-participant-phone">{participant.phone}</small>
                  </td>
                  <td>
                    <span className="zas-participant-invoice">{invoiceNumber}</span>
                  </td>
                  <td>
                    <span className="zas-participant-timestamp">
                      <strong>{timestamp.date}</strong>
                      <small>{timestamp.time}</small>
                    </span>
                  </td>
                  <td>
                    <span className={`zas-admin-payment-badge is-${participant.paymentStatus}`}>
                      {paymentLabel(participant.paymentStatus)}
                    </span>
                  </td>
                  <td>
                    {participant.invitation ? (
                      <span className="zas-invitation-status is-collected">Sudah Diambil</span>
                    ) : (
                      <span className="zas-invitation-status is-uncollected">Belum Diambil</span>
                    )}
                  </td>
                  <td>
                    <div className="zas-participant-actions">
                      <button
                        className="zas-admin-secondary-button"
                        onClick={() => setSelectedParticipant(participant)}
                        type="button"
                      >
                        Detail
                      </button>
                      {participant.paymentStatus === "unpaid" && (
                        paymentVerificationPending && participant.payment ? (
                          <PaymentReviewForm
                            amountClaimed={participant.payment.amountPaid}
                            amountDue={amountDue}
                            currency={currency}
                            invoiceNumber={invoiceNumber}
                            participantName={participant.participantName}
                            paymentId={participant.payment.id}
                            proofHref={proofHref}
                            returnTo={returnTo}
                          />
                        ) : (
                          <ManualPaymentConfirmation
                            amountDue={amountDue}
                            currency={currency}
                            invoiceNumber={invoiceNumber}
                            participantName={participant.participantName}
                            registrationId={participant.id}
                            returnTo={returnTo}
                          />
                        )
                      )}
                      {participant.paymentStatus === "paid" && participant.invoice && (
                        <WhatsAppMessageButton
                          input={{
                            participantName: participant.participantName,
                            invoiceNumber: participant.invoice.number,
                            ticketName: participant.ticketName,
                            eventName: participant.eventName,
                            paymentStatus: "paid",
                          }}
                          phone={participant.phone}
                        />
                      )}
                      {participant.paymentStatus === "unpaid" && (
                        <WhatsAppMessageButton
                          input={{
                            participantName: participant.participantName,
                            invoiceNumber,
                            ticketName: participant.ticketName,
                            eventName: participant.eventName,
                            paymentStatus: "pending",
                            paymentVerificationPending,
                          }}
                          phone={participant.phone}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedParticipant && (
        <div
          aria-labelledby={`participant-detail-title-${selectedParticipant.id}`}
          aria-modal="true"
          className="zas-admin-dialog-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedParticipant(null);
          }}
          role="dialog"
        >
          <section className="zas-admin-dialog zas-participant-detail-dialog">
            <header>
              <div>
                <p className="zas-admin-eyebrow">DETAIL PESERTA · {selectedParticipant.eventName}</p>
                <h2 id={`participant-detail-title-${selectedParticipant.id}`}>
                  {selectedParticipant.participantName}
                </h2>
              </div>
              <button
                aria-label="Tutup detail peserta"
                className="zas-whatsapp-close"
                onClick={() => setSelectedParticipant(null)}
                type="button"
              >
                ×
              </button>
            </header>
            <dl className="zas-admin-details">
              <div><dt>Email</dt><dd>{selectedParticipant.email}</dd></div>
              <div><dt>WhatsApp</dt><dd>{selectedParticipant.phone}</dd></div>
              <div><dt>Nomor Registrasi</dt><dd>{selectedParticipant.registrationNumber}</dd></div>
              <div><dt>Nomor Invoice</dt><dd>{selectedParticipant.invoice?.number ?? "Belum diterbitkan"}</dd></div>
              {selectedParticipant.registrationDetails.domicileAddress && (
                <div>
                  <dt>Alamat Domisili</dt>
                  <dd className="zas-participant-registration-answer">
                    {selectedParticipant.registrationDetails.domicileAddress}
                  </dd>
                </div>
              )}
              {selectedParticipant.registrationDetails.identityAddress && (
                <div>
                  <dt>Alamat Tempat Tinggal (sesuai KTP)</dt>
                  <dd className="zas-participant-registration-answer">
                    {selectedParticipant.registrationDetails.identityAddress}
                  </dd>
                </div>
              )}
              {selectedParticipant.registrationDetails.businessComment && (
                <div>
                  <dt>Komentar tentang Bisnis</dt>
                  <dd className="zas-participant-registration-answer">
                    {selectedParticipant.registrationDetails.businessComment}
                  </dd>
                </div>
              )}
              {selectedParticipant.profileDetails.organizationName && (
                <div>
                  <dt>Organisasi (data profil lama)</dt>
                  <dd>{selectedParticipant.profileDetails.organizationName}</dd>
                </div>
              )}
              {selectedParticipant.profileDetails.jobTitle && (
                <div>
                  <dt>Jabatan (data profil lama)</dt>
                  <dd>{selectedParticipant.profileDetails.jobTitle}</dd>
                </div>
              )}
              {selectedParticipant.profileDetails.city && (
                <div><dt>Kota</dt><dd>{selectedParticipant.profileDetails.city}</dd></div>
              )}
              {selectedParticipant.invoice?.legacyNumber && (
                <div><dt>Invoice lama</dt><dd>{selectedParticipant.invoice.legacyNumber}</dd></div>
              )}
              <div><dt>Jenis Tiket</dt><dd>{selectedParticipant.ticketName}</dd></div>
              <div>
                <dt>Tanggal Registrasi</dt>
                <dd>{formatTimestamp(selectedParticipant.registeredAt).date} · {formatTimestamp(selectedParticipant.registeredAt).time}</dd>
              </div>
              <div><dt>Status Pembayaran</dt><dd>{paymentLabel(selectedParticipant.paymentStatus)}</dd></div>
              <div>
                <dt>Tagihan</dt>
                <dd>
                  {selectedParticipant.invoice?.amountDue ?? selectedParticipant.ticketPrice}{" "}
                  {selectedParticipant.invoice?.currency ?? selectedParticipant.ticketCurrency}
                </dd>
              </div>
              {selectedParticipant.payment && (
                <>
                  <div><dt>Status klaim</dt><dd>{selectedParticipant.payment.status}</dd></div>
                  <div><dt>Nominal transfer</dt><dd>{selectedParticipant.payment.amountPaid} {selectedParticipant.invoice?.currency ?? selectedParticipant.ticketCurrency}</dd></div>
                  <div><dt>Tanggal transfer</dt><dd>{selectedParticipant.payment.paidAt ? formatTimestamp(selectedParticipant.payment.paidAt).date : "Tidak tersedia"}</dd></div>
                  <div><dt>Klaim dikirim</dt><dd>{formatTimestamp(selectedParticipant.payment.submittedAt).date} · {formatTimestamp(selectedParticipant.payment.submittedAt).time}</dd></div>
                  {selectedParticipant.payment.reviewedAt && (
                    <div><dt>Diverifikasi</dt><dd>{formatTimestamp(selectedParticipant.payment.reviewedAt).date} · {formatTimestamp(selectedParticipant.payment.reviewedAt).time}</dd></div>
                  )}
                  {selectedParticipant.payment.reviewerName && (
                    <div><dt>Admin verifikator</dt><dd>{selectedParticipant.payment.reviewerName}</dd></div>
                  )}
                  {selectedParticipant.payment.reviewNote && (
                    <div><dt>Catatan verifikasi</dt><dd>{selectedParticipant.payment.reviewNote}</dd></div>
                  )}
                </>
              )}
              <div>
                <dt>Pengambilan Undangan</dt>
                <dd>{selectedParticipant.invitation ? "Sudah Diambil" : "Belum Diambil"}</dd>
              </div>
              {selectedParticipant.invitation && (
                <>
                  <div><dt>Diambil pada</dt><dd>{formatTimestamp(selectedParticipant.invitation.collectedAt).date} · {formatTimestamp(selectedParticipant.invitation.collectedAt).time}</dd></div>
                  <div><dt>Diproses oleh</dt><dd>{selectedParticipant.invitation.collectorName}</dd></div>
                  <div><dt>Metode</dt><dd>{selectedParticipant.invitation.method.replaceAll("_", " ")}</dd></div>
                </>
              )}
            </dl>
            <div className="zas-participant-detail-actions">
              {selectedParticipant.payment?.proof && (
                <a
                  className="zas-admin-primary-link"
                  href={`/api/private-documents/${selectedParticipant.payment.proof.id}/download`}
                >
                  Lihat Bukti Transfer
                </a>
              )}
              <button
                className="zas-admin-secondary-button"
                onClick={() => setSelectedParticipant(null)}
                type="button"
              >
                Tutup
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
