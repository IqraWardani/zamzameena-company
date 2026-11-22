import assert from "node:assert/strict";
import test from "node:test";
import { formatPrice } from "../lib/format-price";

test("IDR output uses stable ASCII spacing and preserves two decimal places", () => {
  assert.equal(formatPrice("3500000.00", "IDR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }), "Rp 3.500.000,00");
  assert.equal(formatPrice("3800000.00", "IDR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }), "Rp 3.800.000,00");
});

test("price formatting supports other currencies, zero, integers, and decimals", () => {
  const twoDecimals = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  assert.equal(formatPrice("0", "IDR", twoDecimals), "Rp 0,00");
  assert.equal(formatPrice("1000", "IDR", twoDecimals), "Rp 1.000,00");
  assert.equal(formatPrice("1250.5", "IDR", twoDecimals), "Rp 1.250,50");
  assert.equal(formatPrice("1250.5", "USD", twoDecimals), "US$1.250,50");
});

test("unsupported amounts and currencies keep the explicit fallback", () => {
  assert.equal(formatPrice("not-a-number", "IDR"), "not-a-number IDR");
  assert.equal(formatPrice("1250", "INVALID"), "1250 INVALID");
});
