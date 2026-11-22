export type SalesTrendEntry = {
  date: string;
  salesMemberId: string | null;
  tickets: number;
};

export function selectSalesTrend(
  entries: SalesTrendEntry[],
  salesMemberId: string,
): Array<{ date: string; tickets: number }> {
  const selectedEntries = salesMemberId === "all"
    ? entries
    : entries.filter((entry) =>
        salesMemberId === "unassigned"
          ? entry.salesMemberId === null
          : entry.salesMemberId === salesMemberId,
      );
  const ticketsByDate = new Map<string, number>();
  for (const entry of selectedEntries) {
    ticketsByDate.set(
      entry.date,
      (ticketsByDate.get(entry.date) ?? 0) + entry.tickets,
    );
  }
  return [...ticketsByDate]
    .map(([date, tickets]) => ({ date, tickets }))
    .sort((first, second) => first.date.localeCompare(second.date));
}
