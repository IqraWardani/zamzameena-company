export function getEventYear(date: Date, timezone: string): number {
  const year = Number(
    new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      year: "numeric",
    }).format(date),
  );
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("Unable to determine a valid event year for the invoice.");
  }
  return year;
}

export function createInvoiceNumber(
  eventYear: number,
  sequence: bigint | number,
): string {
  if (!Number.isInteger(eventYear) || eventYear < 1000 || eventYear > 9999) {
    throw new Error("Unable to create an invoice for an invalid event year.");
  }
  if (typeof sequence === "number" && !Number.isSafeInteger(sequence)) {
    throw new Error("Invoice sequence must be a safe integer.");
  }
  const value = typeof sequence === "bigint" ? sequence : BigInt(sequence);
  if (value < BigInt(1)) {
    throw new Error("Invoice sequence must be a positive integer.");
  }
  return `ZAS-${eventYear}-${value.toString().padStart(4, "0")}`;
}
