import "server-only";

import type { Prisma } from "@prisma/client";
import { calculateSalesCommission } from "@/lib/sales/commission-calculation";

export async function recordEarnedCommission(
  transaction: Prisma.TransactionClient,
  input: { invoiceId: string; createdByAdminUserId: string },
): Promise<void> {
  const invoice = await transaction.invoice.findUnique({
    where: { id: input.invoiceId },
    select: {
      id: true,
      currency: true,
      subtotalAmount: true,
      amountDue: true,
      registration: {
        select: {
          id: true,
          eventId: true,
          sellerMemberId: true,
          referralCodeSnapshot: true,
        },
      },
    },
  });
  if (
    !invoice ||
    !invoice.registration.sellerMemberId ||
    !invoice.registration.referralCodeSnapshot ||
    !invoice.subtotalAmount ||
    invoice.subtotalAmount.isZero() ||
    invoice.amountDue.isZero()
  ) {
    return;
  }

  const amount = calculateSalesCommission(invoice.subtotalAmount, invoice.amountDue);
  if (amount.isZero()) return;

  const idempotencyKey = `earned:${invoice.registration.id}`;
  const entry = await transaction.salesCommission.create({
    data: {
      salesMemberId: invoice.registration.sellerMemberId,
      registrationId: invoice.registration.id,
      invoiceId: invoice.id,
      entryType: "earned",
      amount,
      currency: invoice.currency,
      idempotencyKey,
      note: "10% of the normal-price invoice subtotal.",
      createdByAdminUserId: input.createdByAdminUserId,
    },
    select: { id: true },
  });
  await transaction.auditLog.create({
    data: {
      actorAdminUserId: input.createdByAdminUserId,
      eventId: invoice.registration.eventId,
      entityId: entry.id,
      entityType: "sales_commission",
      action: "sales_commission_earned",
      metadata: {
        registrationId: invoice.registration.id,
        invoiceId: invoice.id,
        salesMemberId: invoice.registration.sellerMemberId,
        amount: amount.toFixed(2),
        currency: invoice.currency.trim(),
        idempotencyKey,
      },
    },
  });
}
