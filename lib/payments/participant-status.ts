import type { Prisma } from "@prisma/client";

export type ParticipantPaymentStatus = "paid" | "unpaid" | "free" | "inactive";

export function getParticipantPaymentStatus(input: {
  registrationStatus: string;
  invoiceStatus: string | null;
  hasApprovedPayment: boolean;
  ticketPrice: string;
}): ParticipantPaymentStatus {
  if (input.invoiceStatus === "paid" || input.hasApprovedPayment) return "paid";
  if (
    ["cancelled", "expired"].includes(input.registrationStatus) ||
    ["void", "expired"].includes(input.invoiceStatus ?? "")
  ) {
    return "inactive";
  }
  if (Number(input.ticketPrice) === 0) return "free";
  return "unpaid";
}

export function getParticipantPaymentWhere(
  status: "paid" | "unpaid",
): Prisma.RegistrationWhereInput {
  const paid = {
    OR: [
      { invoices: { some: { status: "paid" as const } } },
      { invoices: { some: { payments: { some: { status: "approved" as const } } } } },
    ],
  };

  if (status === "paid") return paid;

  return {
    ticketType: { priceAmount: { gt: 0 } },
    status: { notIn: ["cancelled", "expired"] },
    AND: [
      { invoices: { none: { status: { in: ["paid", "void", "expired"] } } } },
      { invoices: { none: { payments: { some: { status: "approved" } } } } },
    ],
  };
}
