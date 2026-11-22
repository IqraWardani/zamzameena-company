import { Prisma } from "@prisma/client";
import type { SalesPosition } from "./labels";

const SALES_MEMBER_CODE_SEQUENCES: Record<
  SalesPosition,
  { prefix: string; sequenceName: string }
> = {
  director: {
    prefix: "DIR",
    sequenceName: "public.sales_member_code_dir_seq",
  },
  arm: {
    prefix: "ARM",
    sequenceName: "public.sales_member_code_arm_seq",
  },
  branch_manager: {
    prefix: "KCB",
    sequenceName: "public.sales_member_code_kcb_seq",
  },
  sales: {
    prefix: "SLS",
    sequenceName: "public.sales_member_code_sls_seq",
  },
};

export function formatSalesMemberCode(
  position: SalesPosition,
  sequenceValue: string,
): string {
  if (!/^[1-9]\d*$/.test(sequenceValue)) {
    throw new RangeError("Sales member code sequence values must be positive.");
  }

  const { prefix } = SALES_MEMBER_CODE_SEQUENCES[position];
  return `${prefix}-${sequenceValue.padStart(3, "0")}`;
}

export async function allocateSalesMemberCode(
  transaction: Prisma.TransactionClient,
  position: SalesPosition,
): Promise<string> {
  const { sequenceName } = SALES_MEMBER_CODE_SEQUENCES[position];
  const [row] = await transaction.$queryRaw<{ sequenceValue: string }[]>(
    Prisma.sql`
      SELECT nextval(${sequenceName}::regclass)::text AS "sequenceValue"
    `,
  );
  if (!row || typeof row.sequenceValue !== "string") {
    throw new Error("Sales member code allocation returned no sequence value.");
  }
  return formatSalesMemberCode(position, row.sequenceValue);
}
