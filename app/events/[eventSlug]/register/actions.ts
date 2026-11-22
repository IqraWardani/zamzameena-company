"use server";

import { Prisma } from "@prisma/client";
import {
  assertParticipantSessionConfiguration,
  setParticipantSession,
} from "@/lib/participant/session";
import { prismaRegistrationRepository } from "@/lib/registration/prisma-repository";
import {
  registerParticipant,
  registrationConfirmationForClient,
} from "@/lib/registration/registration-service";
import { validateParticipantRegistration } from "@/lib/registration/validation";
import { deliverInvoiceEmail } from "@/lib/invoices/email-delivery";
import { prisma } from "@/lib/db";

export type PublicRegistrationFormState = {
  error?: string;
  registrationNumber?: string;
  invoiceNumber?: string | null;
  invoiceId?: string | null;
  invoicePreview?: {
    issuedAt: string;
    amountDue: string;
    currency: string;
    status: string;
    participantName: string;
    participantEmail: string;
    eventName: string;
    ticketName: string;
  } | null;
  emailSent?: boolean;
  emailNotice?: string;
};

const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function submitPublicRegistration(
  eventSlug: string,
  _previousState: PublicRegistrationFormState,
  formData: FormData,
): Promise<PublicRegistrationFormState> {
  if (eventSlug.length > 160 || !EVENT_SLUG_PATTERN.test(eventSlug)) {
    return { error: "Tautan pemesanan event tidak valid." };
  }

  const validation = validateParticipantRegistration(formData);
  if (!validation.success) return { error: validation.error };

  try {
    assertParticipantSessionConfiguration();
    const result = await registerParticipant(
      prismaRegistrationRepository,
      eventSlug,
      validation.data,
    );
    if (!result.success) return { error: result.error };
    await setParticipantSession(result.registrationId);
    let emailDelivery: Awaited<ReturnType<typeof deliverInvoiceEmail>> | null = null;
    if (result.invoiceNotificationId) {
      try {
        emailDelivery = await deliverInvoiceEmail(result.invoiceNotificationId);
      } catch {
        console.error("Invoice email delivery failed after registration.");
        emailDelivery = "failed";
      }
    }
    let invoicePreview: PublicRegistrationFormState["invoicePreview"] = null;
    if (result.invoiceId) {
      try {
        const invoice = await prisma.invoice.findUnique({
          where: { id: result.invoiceId },
          select: {
            issuedAt: true,
            amountDue: true,
            currency: true,
            status: true,
            registration: {
              select: {
                event: { select: { name: true } },
                ticketType: { select: { name: true } },
                participantProfile: {
                  select: { fullName: true, email: true },
                },
              },
            },
          },
        });
        if (invoice) {
          invoicePreview = {
            issuedAt: invoice.issuedAt.toISOString(),
            amountDue: invoice.amountDue.toFixed(2),
            currency: invoice.currency,
            status: invoice.status,
            participantName: invoice.registration.participantProfile.fullName,
            participantEmail: invoice.registration.participantProfile.email,
            eventName: invoice.registration.event.name,
            ticketName: invoice.registration.ticketType.name,
          };
        }
      } catch (error) {
        console.error("Could not load invoice preview after registration.", error);
      }
    }
    return {
      ...registrationConfirmationForClient(
        result.registrationNumber,
        result.invoiceNumber,
        result.invoiceId,
        emailDelivery && emailDelivery !== "sent"
          ? "Invoice dibuat dan tersimpan. Email invoice belum terkirim; Anda dapat membuka invoice dari portal peserta."
          : undefined,
      ),
      invoicePreview,
      emailSent: emailDelivery === "sent",
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error:
          "Pemesanan dengan email ini mungkin sudah ada. Periksa kembali data Anda atau hubungi penyelenggara.",
      };
    }
    console.error("Public event registration failed.", error);
    return {
      error:
        "Pemesanan belum berhasil disimpan karena terjadi kendala. Data yang sudah diisi tetap tersedia; silakan coba kembali.",
    };
  }
}
