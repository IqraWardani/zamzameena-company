import { Prisma } from "@prisma/client";

export function calculateSalesCommission(
  normalSubtotal: Prisma.Decimal,
  amountDue: Prisma.Decimal,
): Prisma.Decimal {
  if (normalSubtotal.isZero() || amountDue.isZero()) {
    return new Prisma.Decimal(0);
  }
  return normalSubtotal.mul("0.10").toDecimalPlaces(2);
}

export type SalesCommissionLedgerEntry = {
  salesMemberId: string;
  invoiceId: string | null;
  currency: string;
  amount: Prisma.Decimal;
};

export type SalesCommissionAdjustment = SalesCommissionLedgerEntry;

export function buildAttributionCommissionAdjustments(
  entries: SalesCommissionLedgerEntry[],
  targetSalesMemberId: string | null,
): SalesCommissionAdjustment[] {
  const balances = new Map<string, Map<string, SalesCommissionLedgerEntry>>();
  for (const entry of entries) {
    const currency = entry.currency.trim();
    const memberBalances = balances.get(currency) ?? new Map();
    const current = memberBalances.get(entry.salesMemberId);
    memberBalances.set(entry.salesMemberId, {
      salesMemberId: entry.salesMemberId,
      invoiceId: current?.invoiceId ?? entry.invoiceId,
      currency,
      amount: (current?.amount ?? new Prisma.Decimal(0)).add(entry.amount),
    });
    balances.set(currency, memberBalances);
  }

  const adjustments: SalesCommissionAdjustment[] = [];
  for (const [currency, memberBalances] of balances) {
    let transferAmount = new Prisma.Decimal(0);
    let transferInvoiceId: string | null = null;
    for (const [salesMemberId, balance] of memberBalances) {
      if (salesMemberId === targetSalesMemberId || balance.amount.isZero()) continue;
      adjustments.push({
        ...balance,
        amount: balance.amount.negated(),
      });
      transferAmount = transferAmount.add(balance.amount);
      transferInvoiceId ??= balance.invoiceId;
    }
    if (targetSalesMemberId && !transferAmount.isZero()) {
      adjustments.push({
        salesMemberId: targetSalesMemberId,
        invoiceId: transferInvoiceId,
        currency,
        amount: transferAmount,
      });
    }
  }
  return adjustments;
}
