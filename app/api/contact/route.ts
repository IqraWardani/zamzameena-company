import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  submitContactMessage,
  type ContactInboxRepository,
  type ContactSubmissionInput,
} from "@/lib/contact/contact-submission";

const MAX_BODY_BYTES = 16 * 1024;
const GENERIC_ACCEPTED = { message: "Thank you, we'll get back to you soon." };

async function readBoundedBody(request: Request): Promise<string | null> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) return null;
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

const contactInboxRepository: ContactInboxRepository = {
  async createSubmissionAndQueueNotice(input: ContactSubmissionInput) {
    return prisma.$transaction(async (transaction) => {
      const submission = await transaction.contactSubmission.create({
        data: input,
        select: { id: true },
      });
      await transaction.notificationDelivery.create({
        data: {
          channel: "internal",
          templateKey: "contact_submission_received",
          recipient: "admin_inbox",
          payload: { contactSubmissionId: submission.id },
        },
      });
      return submission;
    });
  },
};

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: "This request could not be accepted." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const contentType = request.headers.get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return NextResponse.json(
      { error: "This request could not be accepted." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: string | null;
  try {
    body = await readBoundedBody(request);
  } catch {
    return NextResponse.json(
      { error: "This request could not be accepted." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (body === null) {
    return NextResponse.json(
      { error: "This request could not be accepted." },
      { status: 413, headers: { "Cache-Control": "no-store" } },
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json(
      { error: "This request could not be accepted." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const result = await submitContactMessage(contactInboxRepository, payload);
    if (result === "spam") {
      return NextResponse.json(GENERIC_ACCEPTED, {
        status: 202,
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (result === "invalid") {
      return NextResponse.json(
        { error: "Check the form fields and try again." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(GENERIC_ACCEPTED, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    console.error("Public contact submission could not be stored.");
    return NextResponse.json(
      { error: "We couldn't send your message. Please try again in a little while." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
