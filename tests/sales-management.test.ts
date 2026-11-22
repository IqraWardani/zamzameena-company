import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  buildAttributionCommissionAdjustments,
  calculateSalesCommission,
} from "../lib/sales/commission-calculation";
import { selectSalesTrend } from "../lib/sales/chart-data";
import { formatSalesMemberCode } from "../lib/sales/member-code";
import { calculateSalesTargetAchievement } from "../lib/sales/target-achievement";
import { validateSalesMember } from "../lib/sales/validation";

function memberForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    position: "sales",
    fullName: "Ada Lovelace",
    phone: "+62 812-3456-7890",
    email: "ada@example.com",
    region: "Makassar",
    supervisorMemberId: "00000000-0000-4000-8000-000000000001",
    joinedAt: "2026-11-20",
    quotaAmount: "50",
    ...overrides,
  })) {
    form.set(key, value);
  }
  return form;
}

test("sales member form validates required data and supervisor hierarchy inputs", () => {
  const valid = validateSalesMember(memberForm());
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal("memberCode" in valid.data, false);
    assert.equal(valid.data.quotaAmount, "50");
  }

  const manualCode = validateSalesMember(memberForm({ memberCode: "MANUAL-001" }));
  assert.equal(manualCode.success, true);
  if (manualCode.success) assert.equal("memberCode" in manualCode.data, false);

  const invalidSupervisor = validateSalesMember(
    memberForm({ position: "arm", supervisorMemberId: "a-parent" }),
  );
  assert.equal(invalidSupervisor.success, false);
  if (!invalidSupervisor.success) {
    assert.ok(invalidSupervisor.fieldErrors.supervisorMemberId);
  }

  const missingName = validateSalesMember(memberForm({ fullName: "" }));
  assert.equal(missingName.success, false);
  if (!missingName.success) assert.ok(missingName.fieldErrors.fullName);

});

test("sales member quota accepts whole nonnegative ticket counts only", () => {
  for (const quotaAmount of ["0", "50"]) {
    assert.equal(validateSalesMember(memberForm({ quotaAmount })).success, true);
  }
  for (const quotaAmount of ["", "-1", "1.5", "1e3"]) {
    const result = validateSalesMember(memberForm({ quotaAmount }));
    assert.equal(result.success, false);
    if (!result.success) assert.ok(result.fieldErrors.quotaAmount);
  }
});

test("member codes use the role prefix and continue numbering without truncation", () => {
  assert.deepEqual(
    [
      formatSalesMemberCode("director", "1"),
      formatSalesMemberCode("arm", "1"),
      formatSalesMemberCode("branch_manager", "1"),
      formatSalesMemberCode("sales", "1"),
    ],
    ["DIR-001", "ARM-001", "KCB-001", "SLS-001"],
  );
  assert.equal(formatSalesMemberCode("sales", "2"), "SLS-002");
  assert.equal(formatSalesMemberCode("sales", "1000"), "SLS-1000");
  assert.throws(() => formatSalesMemberCode("sales", "0"), RangeError);

  const issuedCodes = [
    formatSalesMemberCode("director", "1"),
    formatSalesMemberCode("director", "2"),
    formatSalesMemberCode("arm", "1"),
    formatSalesMemberCode("arm", "2"),
    formatSalesMemberCode("branch_manager", "1"),
    formatSalesMemberCode("branch_manager", "2"),
    formatSalesMemberCode("sales", "1"),
    formatSalesMemberCode("sales", "2"),
  ];
  assert.equal(new Set(issuedCodes).size, issuedCodes.length);
});

test("a registered global identity can be selected without submitting its editable fields", () => {
  const valid = validateSalesMember(memberForm({
    personId: "00000000-0000-4000-8000-000000000002",
    fullName: "",
    memberCode: "",
    phone: "",
  }));
  assert.equal(valid.success, true);
  if (valid.success) assert.equal(valid.data.personId, "00000000-0000-4000-8000-000000000002");
});

test("commission is 10% of the normal subtotal and is zero for free orders", () => {
  assert.equal(
    calculateSalesCommission(
      new Prisma.Decimal("500000"),
      new Prisma.Decimal("450000"),
    ).toFixed(2),
    "50000.00",
  );
  assert.equal(
    calculateSalesCommission(
      new Prisma.Decimal("500000"),
      new Prisma.Decimal("0"),
    ).toFixed(2),
    "0.00",
  );
  assert.equal(
    calculateSalesCommission(
      new Prisma.Decimal("0"),
      new Prisma.Decimal("0"),
    ).toFixed(2),
    "0.00",
  );
});

test("referral correction transfers net commission between members without changing its total", () => {
  const entries = [
    {
      salesMemberId: "sales-a",
      invoiceId: "invoice-1",
      currency: "IDR",
      amount: new Prisma.Decimal("10000"),
    },
    {
      salesMemberId: "sales-a",
      invoiceId: "invoice-1",
      currency: "IDR",
      amount: new Prisma.Decimal("-2000"),
    },
    {
      salesMemberId: "sales-b",
      invoiceId: "invoice-2",
      currency: "IDR",
      amount: new Prisma.Decimal("5000"),
    },
  ];
  const adjustments = buildAttributionCommissionAdjustments(entries, "sales-b");

  assert.deepEqual(
    adjustments.map(({ salesMemberId, amount }) => [salesMemberId, amount.toFixed(2)]),
    [["sales-a", "-8000.00"], ["sales-b", "8000.00"]],
  );
  const totalBefore = entries.reduce((sum, entry) => sum.add(entry.amount), new Prisma.Decimal(0));
  const totalAfter = adjustments.reduce((sum, entry) => sum.add(entry.amount), totalBefore);
  assert.equal(totalAfter.toFixed(2), totalBefore.toFixed(2));
});

test("sales trend filters follow current member attribution while all-member totals stay constant", () => {
  const before = [
    { date: "2026-11-20", salesMemberId: "sales-a", tickets: 10 },
    { date: "2026-11-20", salesMemberId: "sales-b", tickets: 5 },
  ];
  const after = [
    { date: "2026-11-20", salesMemberId: "sales-a", tickets: 9 },
    { date: "2026-11-20", salesMemberId: "sales-b", tickets: 6 },
  ];

  assert.deepEqual(selectSalesTrend(before, "sales-a"), [{ date: "2026-11-20", tickets: 10 }]);
  assert.deepEqual(selectSalesTrend(after, "sales-a"), [{ date: "2026-11-20", tickets: 9 }]);
  assert.deepEqual(selectSalesTrend(after, "sales-b"), [{ date: "2026-11-20", tickets: 6 }]);
  assert.deepEqual(selectSalesTrend(after, "all"), [{ date: "2026-11-20", tickets: 15 }]);
});

test("event target achievement handles ordinary, over-quota, and unavailable targets", () => {
  assert.deepEqual(calculateSalesTargetAchievement(650, 1000), {
    percentage: 65,
    progressPercent: 65,
    remaining: 350,
  });
  assert.deepEqual(calculateSalesTargetAchievement(1200, 1000), {
    percentage: 120,
    progressPercent: 100,
    remaining: 0,
  });
  assert.deepEqual(calculateSalesTargetAchievement(12, 0), {
    percentage: null,
    progressPercent: 0,
    remaining: 0,
  });
  assert.deepEqual(calculateSalesTargetAchievement(12, null), {
    percentage: null,
    progressPercent: 0,
    remaining: null,
  });
});
