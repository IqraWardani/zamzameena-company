export const SALES_POSITION_LABELS = {
  director: "Direktur Pemasaran",
  arm: "Area Relationship Manager",
  branch_manager: "Kepala Cabang",
  sales: "Sales",
} as const;

export type SalesPosition = keyof typeof SALES_POSITION_LABELS;
