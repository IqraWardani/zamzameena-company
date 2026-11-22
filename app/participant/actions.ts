"use server";

import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearParticipantSession, getParticipantSession } from "@/lib/participant/session";
import { deletePrivateObject, uploadPrivateObject } from "@/lib/payments/storage";
import {
  getPaymentClaimDisposition,
  isValidPositivePaymentAmount,
  sanitizeOriginalFilename,
  validatePaymentProof,
} from "@/lib/payments/proof-validation";
import { prisma } from "@/lib/db";
import {
  createInvoiceNumber,
  getEventYear,
} from "@/lib/registration/invoice-number";

export type PaymentSubmissionState = { error?: string; message?: string };

function readFormString(formData: FormData, key: string, maximumLength: number): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= maximumLength ? trimmed : null;
}

function parsePaidAt(value: string): Date | null | undefined {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return undefined;
  }
  return parsed;
}

export async function submitPaymentProof(
  registrationId: string,
  _previousState: PaymentSubmissionState,
  formData: FormData,
): Promise<PaymentSubmissionState> {
  const participant = await getParticipantSession();
  if (!participant) redirect("/participant");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      registrationId,
    ) ||
    !participant.registrationIds.includes(registrationId)
  ) {
    return { error: "This registration could not be found." };
  }

  const senderName = readFormString(formData, "senderName", 160);
  const senderBank = readFormString(formData, "senderBank", 120);
  const referenceNumber = readFormString(formData, "referenceNumber", 120);
  const amountPaid = readFormString(formData, "amountPaid", 15);
  const paidAtValue = readFormString(formData, "paidAt", 10);
  const file = formData.get("proof");
  if (
    !senderName ||
    senderName.length === 0 ||
    senderBank === null ||
    referenceNumber === null ||
    amountPaid === null ||
    paidAtValue === null ||
    !(file instanceof File)
  ) {
    return { error: "Complete the transfer details and select a payment proof file." };
  }
  if (!isValidPositivePaymentAmount(amountPaid)) {
    return { error: "Enter the positive amount shown on your transfer receipt." };
  }
  const paidAt = parsePaidAt(paidAtValue);
  if (paidAt === undefined) {
    return { error: "Enter a valid transfer date." };
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await file.arrayBuffer());
  } catch {
    return { error: "The selected payment proof could not be read. Please choose it again." };
  }
  const proofValidation = validatePaymentProof(file, bytes);
  if (!proofValidation.success) return { error: proofValidation.error };

  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const objectKey = `payment-proofs/${randomUUID()}`;
  let uploadAttempted = false;

  try {
    const outcome = await prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(
        Prisma.sql`SELECT id FROM registrations WHERE id = ${registrationId}::uuid FOR UPDATE`,
      );
      const registration = await transaction.registration.findFirst({
        where: { id: registrationId },
        include: {
          event: { select: { startsAt: true, timezone: true } },
          ticketType: { select: { priceAmount: true, currency: true } },
          invoices: {
            orderBy: { issuedAt: "desc" },
            take: 1,
            include: { payments: { orderBy: { submittedAt: "desc" }, take: 1 } },
          },
        },
      });
      if (!registration) return { kind: "not_found" as const };

      const currentInvoice = registration.invoices[0];
      const currentPayment = currentInvoice?.payments[0];
      const disposition = getPaymentClaimDisposition({
        registrationStatus: registration.status,
        invoiceStatus: currentInvoice?.status ?? null,
        paymentStatus: currentPayment?.status ?? null,
      });
      if (disposition === "already_submitted") {
        return { kind: "already_submitted" as const };
      }
      if (disposition === "invalid_state") {
        return { kind: "invalid_state" as const };
      }

      let invoice = currentInvoice;
      if (!invoice) {
        const [sequence] = await transaction.$queryRaw<{ value: bigint }[]>(
          Prisma.sql`SELECT nextval('public.invoice_number_seq') AS value`,
        );
        if (!sequence) throw new Error("Invoice sequence did not return a value.");
        invoice = await transaction.invoice.create({
          data: {
            invoiceNumber: createInvoiceNumber(
              getEventYear(registration.event.startsAt, registration.event.timezone),
              sequence.value,
            ),
            registrationId: registration.id,
            currency: registration.ticketType.currency,
            unitPriceAmount: registration.ticketType.priceAmount,
            quantity: 1,
            subtotalAmount: registration.ticketType.priceAmount,
            discountAmount: new Prisma.Decimal(0),
            amountDue: registration.ticketType.priceAmount,
            status: "pending",
          },
          include: { payments: true },
        });
      } else if (invoice.status === "rejected") {
        invoice = await transaction.invoice.update({
          where: { id: invoice.id },
          data: {
            status: "pending",
            paidAt: null,
          },
          include: { payments: true },
        });
      }
      if (invoice.status !== "pending" || invoice.amountDue.lessThanOrEqualTo(0)) {
        return { kind: "not_payable" as const };
      }

      uploadAttempted = true;
      const uploadedObject = await uploadPrivateObject({
        key: objectKey,
        bytes,
        checksumSha256,
      });

      const payment = await transaction.payment.create({
        data: {
          invoiceId: invoice.id,
          amountPaid: new Prisma.Decimal(amountPaid),
          paidAt,
          senderName,
          senderBank: senderBank || null,
          referenceNumber: referenceNumber || null,
          status: "submitted",
        },
        select: { id: true },
      });
      await transaction.privateDocument.create({
        data: {
          ownerType: "payment",
          ownerId: payment.id,
          kind: "payment_proof",
          storageProvider: uploadedObject.provider,
          objectKey,
          originalFilename: sanitizeOriginalFilename(file.name),
          contentType: proofValidation.contentType,
          byteSize: BigInt(bytes.byteLength),
          checksumSha256,
        },
      });
      await transaction.invoice.update({
        where: { id: invoice.id },
        data: { status: "payment_submitted" },
      });
      await transaction.registration.update({
        where: { id: registration.id },
        data: { status: "payment_submitted" },
      });

      return { kind: "submitted" as const };
    });

    switch (outcome.kind) {
      case "not_found":
        return { error: "This registration could not be found." };
      case "already_submitted":
        return { message: "A payment claim has already been received for this registration." };
      case "invalid_state":
        return { error: "This registration is not accepting payment claims." };
      case "not_payable":
        return { error: "This invoice cannot accept a transfer claim. Please contact the event organizer." };
      case "submitted":
        revalidatePath("/participant");
        return { message: "Payment proof received. An administrator will review it; no payment is approved automatically." };
    }
  } catch (error) {
    if (uploadAttempted) {
      try {
        await deletePrivateObject(objectKey);
      } catch {
        console.error("Private payment-proof cleanup failed after transaction rollback.");
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A payment claim has already been recorded. Refresh your payment status." };
    }
    console.error("Payment submission failed before it could be committed.");
    return { error: "We could not securely record this payment proof. Please retry or contact the event organizer." };
  }
}

export async function participantLogout(): Promise<void> {
  await clearParticipantSession();
  redirect("/events");
}
