export type ContactSubmissionInput = {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  sourcePath: string;
};

export type ContactSubmissionValidation =
  | { success: true; data: ContactSubmissionInput }
  | { success: false; reason: "invalid" | "spam" };

function cleanText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateContactSubmission(
  input: unknown,
): ContactSubmissionValidation {
  if (!isRecord(input)) return { success: false, reason: "invalid" };
  if (typeof input.website !== "string") return { success: false, reason: "invalid" };
  if (input.website.trim()) return { success: false, reason: "spam" };
  if (input.agreedToTerms !== true) return { success: false, reason: "invalid" };
  if (
    typeof input.firstName !== "string" ||
    typeof input.lastName !== "string" ||
    typeof input.email !== "string" ||
    typeof input.subject !== "string" ||
    typeof input.message !== "string"
  ) {
    return { success: false, reason: "invalid" };
  }
  if (
    input.phone !== undefined &&
    input.phone !== null &&
    typeof input.phone !== "string"
  ) {
    return { success: false, reason: "invalid" };
  }

  const firstName = cleanText(input.firstName);
  const lastName = cleanText(input.lastName);
  const email = cleanText(input.email).toLowerCase();
  const subject = cleanText(input.subject);
  const message = input.message
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  const phone = input.phone ? cleanText(input.phone) : "";

  if (
    !firstName ||
    firstName.length > 60 ||
    !lastName ||
    lastName.length > 60 ||
    email.length > 320 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    subject.length < 3 ||
    subject.length > 120 ||
    message.length < 10 ||
    message.length > 2000 ||
    phone.length > 40 ||
    (phone !== "" && !/^\+?[\d\s().-]{7,40}$/.test(phone))
  ) {
    return { success: false, reason: "invalid" };
  }

  const sourcePath =
    typeof input.sourcePath === "string" &&
    /^\/[a-zA-Z0-9/_-]{0,200}$/.test(input.sourcePath)
      ? input.sourcePath
      : "/contact";

  return {
    success: true,
    data: {
      name: `${firstName} ${lastName}`,
      email,
      phone: phone || null,
      subject,
      message,
      sourcePath,
    },
  };
}

export type ContactInboxRepository = {
  createSubmissionAndQueueNotice(
    input: ContactSubmissionInput,
  ): Promise<{ id: string }>;
};

export async function submitContactMessage(
  repository: ContactInboxRepository,
  input: unknown,
): Promise<"accepted" | "invalid" | "spam"> {
  const validation = validateContactSubmission(input);
  if (!validation.success) return validation.reason;
  await repository.createSubmissionAndQueueNotice(validation.data);
  return "accepted";
}
