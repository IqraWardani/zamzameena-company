export type SalesTargetAchievement = {
  percentage: number | null;
  progressPercent: number;
  remaining: number | null;
};

export function calculateSalesTargetAchievement(
  paidTickets: number,
  quota: number | null,
): SalesTargetAchievement {
  const percentage = quota !== null && quota > 0
    ? (paidTickets / quota) * 100
    : null;

  return {
    percentage,
    progressPercent: percentage === null
      ? 0
      : Math.min(100, Math.max(0, percentage)),
    remaining: quota === null ? null : Math.max(0, quota - paidTickets),
  };
}
