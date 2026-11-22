"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminPermission } from "@/lib/admin/authorization";
import {
  isPaymentAmountEqual,
  isValidPaymentReviewTransition,
  reviewTargetStatus,
} from "@/lib/payments/proof-validation";
import { createInvoiceNumber, getEventYear } from "@/lib/registration/invoice-number";
import { prisma } from "@/lib/db";
import { issueConfirmedTicket } from "@/lib/tickets/ticket-issuance";
import { prismaTicketIssueTransaction } from "@/lib/tickets/prisma-transaction";
import { recordEarnedCommission } from "@/lib/sales/commission";

export type PaymentReviewState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
};

const PAYMENT_REVIEW_PERMISSION = "payments.review";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getPaymentReturnPath(formData: FormData): string {
  const requestedPath = formData.get("returnTo");
  if (typeof requestedPath !== "string") {
    return "/admin/payments?notice=payment-confirmed";
  }
  try {
    const url = new URL(requestedPath, "http://localhost");
    if (url.origin !== "http://localhost" || url.pathname !== "/admin/payments") {
      return "/admin/payments?notice=payment-confirmed";
    }
    url.searchParams.set("notice", "payment-confirmed");
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin/payments?notice=payment-confirmed";
  }
}

function isNextRedirectSignal(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  return typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT;");
}

export async function reviewPayment(
  paymentId: string,
  _previousState: PaymentReviewState,
  formData: FormData,
): Promise<PaymentReviewState> {
  if (!UUID_PATTERN.test(paymentId)) return { error: "Klaim pembayaran tidak valid." };
  const decision = formData.get("decision");
  if (decision !== "approve" && decision !== "reject") {
    return {
      error: "Pilih tindakan setujui atau tolak.",
      fieldErrors: { decision: "Pilih tindakan setujui atau tolak." },
    };
  }
  const noteValue = formData.get("reviewNote");
  if (typeof noteValue !== "string") {
    return {
      error: "Masukkan catatan peninjauan.",
      fieldErrors: { reviewNote: "Masukkan catatan peninjauan." },
    };
  }
  const reviewNote = noteValue.trim();
  if (decision === "approve" && formData.get("verificationConfirmed") !== "confirmed") {
    return {
      error: "Konfirmasikan bahwa bukti dan nominal pembayaran sudah diperiksa.",
      fieldErrors: {
        verificationConfirmed: "Konfirmasi pemeriksaan pembayaran diperlukan.",
      },
    };
  }
  if (reviewNote.length > 1000 || (decision === "reject" && !reviewNote)) {
    return {
      error: decision === "reject"
        ? "Alasan penolakan wajib diisi."
        : "Catatan peninjauan maksimal 1.000 karakter.",
      fieldErrors: {
        reviewNote: decision === "reject"
          ? "Alasan penolakan wajib diisi."
          : "Catatan peninjauan maksimal 1.000 karakter.",
      },
    };
  }

  const paymentContext = await prisma.payment.findUnique({
    where: { id: paymentId },
    select: { invoice: { select: { registration: { select: { eventId: true } } } } },
  });
  if (!paymentContext) return { error: "Payment claim not found." };
  const eventId = paymentContext.invoice.registration.eventId;
  const { session, decision: access } = await requireAdminPermission(
    PAYMENT_REVIEW_PERMISSION,
    "/admin/payments",
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!access.allowed) redirect("/admin/access-denied");

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`,
      );
      const current = await transaction.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          status: true,
          amountPaid: true,
          invoiceId: true,
          invoice: {
            select: {
              id: true,
              status: true,
              amountDue: true,
              registration: {
                select: {
                  id: true,
                  eventId: true,
                  status: true,
                },
              },
            },
          },
        },
      });
      if (!current || current.invoice.registration.eventId !== eventId) {
        return "not_found" as const;
      }

      const stillAuthorized = await transaction.adminUser.findFirst({
        where: {
          id: session.id,
          status: "active",
          eventAssignments: { some: { eventId } },
          userRoles: {
            some: {
              role: {
                permissions: {
                  some: { permission: { code: PAYMENT_REVIEW_PERMISSION } },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (!stillAuthorized) return "forbidden" as const;
      if (
        !isValidPaymentReviewTransition({
          paymentStatus: current.status,
          invoiceStatus: current.invoice.status,
          registrationStatus: current.invoice.registration.status,
        })
      ) {
        return "illegal_transition" as const;
      }
      if (
        decision === "approve" &&
        !isPaymentAmountEqual(
          current.amountPaid.toString(),
          current.invoice.amountDue.toString(),
        )
      ) {
        return "amount_mismatch" as const;
      }

      const now = new Date();
      const targets = reviewTargetStatus(decision);
      const paymentUpdate = await transaction.payment.updateMany({
        where: { id: current.id, status: "submitted" },
        data: {
          status: targets.paymentStatus,
          reviewedByAdminUserId: session.id,
          reviewedAt: now,
          reviewNote: reviewNote || null,
        },
      });
      if (paymentUpdate.count !== 1) return "illegal_transition" as const;

      const invoiceUpdate = await transaction.invoice.updateMany({
        where: { id: current.invoice.id, status: "payment_submitted" },
        data: {
          status: targets.invoiceStatus,
          paidAt: decision === "approve" ? now : null,
        },
      });
      const registrationUpdate = await transaction.registration.updateMany({
        where: {
          id: current.invoice.registration.id,
          status: "payment_submitted",
        },
        data: {
          status: targets.registrationStatus,
          confirmedAt: decision === "approve" ? now : null,
        },
      });
      if (invoiceUpdate.count !== 1 || registrationUpdate.count !== 1) {
        throw new Error("Payment review state changed during the transaction.");
      }

      let ticketIssued = false;
      if (decision === "approve") {
        await issueConfirmedTicket(
          prismaTicketIssueTransaction(transaction),
          {
            registrationId: current.invoice.registration.id,
            actorAdminUserId: session.id,
            reason: "payment_approved",
          },
        );
        await recordEarnedCommission(transaction, {
          invoiceId: current.invoice.id,
          createdByAdminUserId: session.id,
        });
        ticketIssued = true;
      }
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: current.id,
          entityType: "payment",
          action: decision === "approve" ? "payment_approved" : "payment_rejected",
          metadata: {
            paymentStatus: targets.paymentStatus,
            invoiceStatus: targets.invoiceStatus,
            registrationStatus: targets.registrationStatus,
            ticketIssued,
          },
        },
      });
      return "reviewed" as const;
    });

    switch (outcome) {
      case "forbidden":
        return { error: "Izin Anda untuk event ini sudah tidak berlaku." };
      case "not_found":
        return { error: "Klaim pembayaran tidak ditemukan pada event yang ditugaskan." };
      case "illegal_transition":
        return { error: "Pembayaran sudah ditinjau atau statusnya tidak lagi valid." };
      case "amount_mismatch":
        return { error: "Jumlah transfer tidak sesuai invoice. Tolak dengan alasan atau verifikasi transfer sebelum melanjutkan." };
      case "reviewed":
        revalidatePath("/admin/payments");
        revalidatePath("/participant");
        if (decision === "approve") redirect(getPaymentReturnPath(formData));
        return {
          message: "Pembayaran ditolak. Peserta dapat mengirim klaim baru.",
        };
    }
  } catch (error) {
    if (isNextRedirectSignal(error)) throw error;
    console.error("Payment review transaction failed.");
    return { error: "Peninjauan pembayaran gagal. Data catatan tetap tersedia; periksa koneksi lalu coba lagi." };
  }
}

export async function confirmUnclaimedPayment(
  registrationId: string,
  _previousState: PaymentReviewState,
  formData: FormData,
): Promise<PaymentReviewState> {
  if (!UUID_PATTERN.test(registrationId)) {
    return { error: "Pendaftaran peserta tidak valid." };
  }
  if (formData.get("verificationConfirmed") !== "confirmed") {
    return { error: "Konfirmasikan bahwa pembayaran sudah diterima dan diverifikasi." };
  }
  const noteValue = formData.get("reviewNote");
  if (typeof noteValue !== "string") {
    return { error: "Catatan verifikasi wajib diisi." };
  }
  const reviewNote = noteValue.trim();
  if (reviewNote.length < 3 || reviewNote.length > 1000) {
    return { error: "Catatan verifikasi harus berisi 3 sampai 1.000 karakter." };
  }

  const registrationContext = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { eventId: true },
  });
  if (!registrationContext) return { error: "Pendaftaran tidak ditemukan." };
  const eventId = registrationContext.eventId;
  const { session, decision: access } = await requireAdminPermission(
    PAYMENT_REVIEW_PERMISSION,
    "/admin/payments",
    eventId,
  );
  if (!session) redirect("/admin/login");
  if (!access.allowed) redirect("/admin/access-denied");

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
      );
      const current = await transaction.registration.findUnique({
        where: { id: registrationId },
        select: {
          id: true,
          eventId: true,
          status: true,
          event: { select: { startsAt: true, timezone: true } },
          ticketType: { select: { priceAmount: true, currency: true } },
          invoices: {
            orderBy: [{ issuedAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              invoiceNumber: true,
              status: true,
              amountDue: true,
              currency: true,
              payments: { select: { status: true } },
            },
          },
        },
      });
      if (!current || current.eventId !== eventId) return "not_found" as const;

      const stillAuthorized = await transaction.adminUser.findFirst({
        where: {
          id: session.id,
          status: "active",
          eventAssignments: { some: { eventId } },
          userRoles: {
            some: {
              role: {
                permissions: {
                  some: { permission: { code: PAYMENT_REVIEW_PERMISSION } },
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (!stillAuthorized) return "forbidden" as const;

      const invoices = current.invoices;
      if (
        invoices.some((invoice) => invoice.status === "paid" ||
          invoice.payments.some((payment) => payment.status === "approved"))
      ) {
        return "already_paid" as const;
      }
      if (invoices.some((invoice) =>
        invoice.payments.some((payment) => payment.status === "submitted"),
      )) {
        return "claim_exists" as const;
      }
      if (
        !["pending_payment", "payment_rejected"].includes(current.status) ||
        !current.ticketType.priceAmount.greaterThan(0)
      ) {
        return "invalid_state" as const;
      }

      const latestInvoice = invoices[0];
      if (
        latestInvoice &&
        !["pending", "rejected"].includes(latestInvoice.status)
      ) {
        return "invalid_state" as const;
      }

      let invoiceId: string;
      let invoiceNumber: string;
      let invoiceStatus: "pending" | "rejected";
      let amountDue: Prisma.Decimal;
      if (latestInvoice) {
        invoiceId = latestInvoice.id;
        invoiceNumber = latestInvoice.invoiceNumber;
        invoiceStatus = latestInvoice.status === "rejected" ? "rejected" : "pending";
        amountDue = latestInvoice.amountDue;
      } else {
        const [sequence] = await transaction.$queryRaw<{ value: bigint }[]>(
          Prisma.sql`SELECT nextval('public.invoice_number_seq') AS value`,
        );
        if (!sequence) throw new Error("Invoice sequence did not return a value.");
        const invoice = await transaction.invoice.create({
          data: {
            invoiceNumber: createInvoiceNumber(
              getEventYear(current.event.startsAt, current.event.timezone),
              sequence.value,
            ),
            registrationId: current.id,
            currency: current.ticketType.currency,
            unitPriceAmount: current.ticketType.priceAmount,
            quantity: 1,
            subtotalAmount: current.ticketType.priceAmount,
            discountAmount: new Prisma.Decimal(0),
            amountDue: current.ticketType.priceAmount,
            status: "pending",
          },
          select: { id: true, invoiceNumber: true, status: true, amountDue: true },
        });
        invoiceId = invoice.id;
        invoiceNumber = invoice.invoiceNumber;
        invoiceStatus = "pending";
        amountDue = invoice.amountDue;
      }

      const now = new Date();
      const invoiceUpdate = await transaction.invoice.updateMany({
        where: { id: invoiceId, status: invoiceStatus },
        data: { status: "paid", paidAt: now },
      });
      const registrationUpdate = await transaction.registration.updateMany({
        where: { id: current.id, status: current.status },
        data: { status: "confirmed", confirmedAt: now },
      });
      if (invoiceUpdate.count !== 1 || registrationUpdate.count !== 1) {
        throw new Error("Payment state changed during manual verification.");
      }

      const payment = await transaction.payment.create({
        data: {
          invoiceId,
          amountPaid: amountDue,
          paidAt: now,
          status: "approved",
          submittedAt: now,
          reviewedByAdminUserId: session.id,
          reviewedAt: now,
          reviewNote,
        },
        select: { id: true },
      });
      await issueConfirmedTicket(prismaTicketIssueTransaction(transaction), {
        registrationId: current.id,
        actorAdminUserId: session.id,
        reason: "payment_approved",
      });
      await recordEarnedCommission(transaction, {
        invoiceId,
        createdByAdminUserId: session.id,
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: session.id,
          eventId,
          entityId: payment.id,
          entityType: "payment",
          action: "payment_manually_approved",
          metadata: {
            paymentStatus: "approved",
            invoiceStatus: "paid",
            registrationStatus: "confirmed",
            invoiceNumber,
            amountPaid: amountDue.toString(),
            manualVerification: true,
          },
        },
      });
      return "confirmed" as const;
    });

    switch (outcome) {
      case "forbidden":
        return { error: "Izin Anda untuk event ini sudah tidak berlaku." };
      case "not_found":
        return { error: "Pendaftaran tidak ditemukan pada event yang ditugaskan." };
      case "already_paid":
        return { error: "Pembayaran peserta ini sudah berstatus PAID." };
      case "claim_exists":
        return { error: "Peserta sudah mengirim bukti. Gunakan proses review untuk memeriksa klaim tersebut." };
      case "invalid_state":
        return { error: "Pendaftaran tidak memenuhi syarat untuk konfirmasi pembayaran manual." };
      case "confirmed":
        revalidatePath("/admin/payments");
        revalidatePath("/admin/invitations");
        revalidatePath("/admin");
        revalidatePath("/participant");
        redirect(getPaymentReturnPath(formData));
    }
  } catch (error) {
    if (isNextRedirectSignal(error)) throw error;
    console.error("Manual payment confirmation transaction failed.");
    return { error: "Konfirmasi pembayaran gagal. Data tidak diubah; periksa koneksi lalu coba kembali." };
  }
}
