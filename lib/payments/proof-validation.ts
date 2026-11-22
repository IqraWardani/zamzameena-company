export const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

export type PaymentProofValidation =
  | { success: true; contentType: string; originalFilename: string }
  | { success: false; error: string };

export function isValidPositivePaymentAmount(value: string): boolean {
  return /^\d{1,12}(?:\.\d{1,2})?$/.test(value) && /[1-9]/.test(value);
}

export function isPaymentAmountEqual(amount: string, expectedAmount: string): boolean {
  const normalize = (value: string): string | null => {
    const match = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(value);
    if (!match) return null;
    const whole = match[1].replace(/^0+(?=\d)/, "");
    return `${whole}.${(match[2] ?? "").padEnd(2, "0")}`;
  };
  const normalizedAmount = normalize(amount);
  return normalizedAmount !== null && normalizedAmount === normalize(expectedAmount);
}

export function sanitizeOriginalFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? "payment-proof";
  const safe = basename
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}._ -]/gu, "_")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 255);
  return safe || "payment-proof";
}

export function validatePaymentProof(
  file: File,
  bytes: Uint8Array,
): PaymentProofValidation {
  if (!file.size || file.size > MAX_PAYMENT_PROOF_BYTES || bytes.byteLength !== file.size) {
    return {
      success: false,
      error: "The payment proof must be a non-empty file no larger than 5 MB.",
    };
  }
  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return {
      success: false,
      error: "Upload a JPEG, PNG, or PDF payment proof.",
    };
  }

  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPdf = bytes.length >= 5 && new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  const recognized =
    (file.type === "image/png" && isPng) ||
    (file.type === "image/jpeg" && isJpeg) ||
    (file.type === "application/pdf" && isPdf);
  if (!recognized) {
    return {
      success: false,
      error: "The file content does not match the selected JPEG, PNG, or PDF format.",
    };
  }

  return {
    success: true,
    contentType: file.type,
    originalFilename: sanitizeOriginalFilename(file.name),
  };
}

export function isValidPaymentReviewTransition(input: {
  paymentStatus: string;
  invoiceStatus: string;
  registrationStatus: string;
}): boolean {
  return (
    input.paymentStatus === "submitted" &&
    input.invoiceStatus === "payment_submitted" &&
    input.registrationStatus === "payment_submitted"
  );
}

export function canSubmitPaymentClaim(input: {
  registrationStatus: string;
  invoiceStatus: string | null;
  paymentStatus: string | null;
}): boolean {
  if (input.paymentStatus === "submitted" || input.paymentStatus === "approved") {
    return false;
  }
  if (!["pending_payment", "payment_rejected"].includes(input.registrationStatus)) {
    return false;
  }
  return input.invoiceStatus === null || ["pending", "rejected"].includes(input.invoiceStatus);
}

export function getPaymentClaimDisposition(input: {
  registrationStatus: string;
  invoiceStatus: string | null;
  paymentStatus: string | null;
}): "accept" | "already_submitted" | "invalid_state" {
  if (
    input.registrationStatus === "confirmed" ||
    input.invoiceStatus === "paid" ||
    input.paymentStatus === "submitted" ||
    input.paymentStatus === "approved"
  ) {
    return "already_submitted";
  }
  return canSubmitPaymentClaim(input) ? "accept" : "invalid_state";
}

export function reviewTargetStatus(decision: "approve" | "reject") {
  return decision === "approve"
    ? {
        paymentStatus: "approved" as const,
        invoiceStatus: "paid" as const,
        registrationStatus: "confirmed" as const,
      }
    : {
        paymentStatus: "rejected" as const,
        invoiceStatus: "rejected" as const,
        registrationStatus: "payment_rejected" as const,
      };
}
