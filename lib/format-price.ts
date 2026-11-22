export type PriceFormatOptions = {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const NON_STANDARD_SPACES = /[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g;

export function formatPrice(
  amount: string,
  currency: string,
  options: PriceFormatOptions = {},
): string {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return `${amount} ${currency}`;

  try {
    if (currency === "IDR") {
      const number = new Intl.NumberFormat("id-ID", {
        style: "decimal",
        useGrouping: true,
        ...options,
      }).format(numericAmount);
      return `Rp ${number}`;
    }

    const formatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      ...options,
    });
    return formatter
      .formatToParts(numericAmount)
      .map((part) => part.value)
      .join("")
      .replace(NON_STANDARD_SPACES, " ")
      .replace(/ {2,}/g, " ")
      .trim();
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    return `${amount} ${currency}`;
  }
}
