export function canAccessPaymentProof(input: {
  documentExists: boolean;
  documentOwnerType: string | null;
  documentKind: string | null;
  documentIsDeleted: boolean;
  allowedRegistrationIds: readonly string[];
  documentRegistrationId: string | null;
  adminAuthorized: boolean;
}): boolean {
  if (
    !input.documentExists ||
    input.documentOwnerType !== "payment" ||
    input.documentKind !== "payment_proof" ||
    input.documentIsDeleted
  ) {
    return false;
  }
  if (
    input.documentRegistrationId &&
    input.allowedRegistrationIds.includes(input.documentRegistrationId)
  ) {
    return true;
  }
  return input.adminAuthorized;
}
