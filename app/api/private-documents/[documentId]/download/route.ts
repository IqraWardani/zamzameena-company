import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { getParticipantSession } from "@/lib/participant/session";
import { canAccessPaymentProof } from "@/lib/payments/document-access";
import { createPrivateObjectDownloadUrl } from "@/lib/payments/storage";
import { prisma } from "@/lib/db";

type DownloadRouteProps = {
  params: Promise<{ documentId: string }>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, { params }: DownloadRouteProps) {
  const { documentId } = await params;
  if (!UUID_PATTERN.test(documentId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const document = await prisma.privateDocument.findFirst({
    where: {
      id: documentId,
      ownerType: "payment",
      kind: "payment_proof",
      deletedAt: null,
    },
    select: {
      id: true,
      ownerId: true,
      objectKey: true,
      originalFilename: true,
    },
  });
  if (!document) return new NextResponse("Not found", { status: 404 });

  let documentRegistrationId: string | null = null;
  let adminAuthorized = false;
  const participant = await getParticipantSession();
  if (participant) {
    const ownedPayment = await prisma.payment.findFirst({
      where: {
        id: document.ownerId,
        invoice: {
          registration: {
            id: { in: participant.registrationIds },
          },
        },
      },
      select: {
        invoice: {
          select: { registration: { select: { id: true } } },
        },
      },
    });
    documentRegistrationId = ownedPayment?.invoice.registration.id ?? null;
  }

  if (!documentRegistrationId || !participant?.registrationIds.includes(documentRegistrationId)) {
    const payment = await prisma.payment.findUnique({
      where: { id: document.ownerId },
      select: {
        invoice: {
          select: { registration: { select: { eventId: true } } },
        },
      },
    });
    if (payment) {
      const { session, decision } = await requireAdminPermission(
        "payments.review",
        "/api/private-documents/[documentId]/download",
        payment.invoice.registration.eventId,
      );
      adminAuthorized = Boolean(session && decision.allowed);
    }
  }

  const authorized = canAccessPaymentProof({
    documentExists: true,
    documentOwnerType: "payment",
    documentKind: "payment_proof",
    documentIsDeleted: false,
    allowedRegistrationIds: participant?.registrationIds ?? [],
    documentRegistrationId,
    adminAuthorized,
  });
  if (!authorized) return new NextResponse("Not found", { status: 404 });

  try {
    const url = await createPrivateObjectDownloadUrl(
      document.objectKey,
      document.originalFilename,
    );
    return NextResponse.redirect(url, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch {
    console.error("Private payment-proof download signing failed.");
    return new NextResponse("Private download is temporarily unavailable.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
