import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventSlug = searchParams.get("eventSlug")?.trim() ?? "";
  const referralCode = searchParams.get("code")?.trim() ?? "";
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };

  if (
    eventSlug.length > 160 ||
    !EVENT_SLUG_PATTERN.test(eventSlug) ||
    !REFERRAL_CODE_PATTERN.test(referralCode)
  ) {
    return NextResponse.json({ valid: false }, { status: 400, headers });
  }

  const member = await prisma.salesMember.findFirst({
    where: {
      referralCode: { equals: referralCode, mode: "insensitive" },
      status: "active",
      event: { slug: eventSlug, status: "published" },
    },
    select: {
      id: true,
      referralCode: true,
      position: true,
      person: { select: { fullName: true } },
    },
  });

  if (!member) return NextResponse.json({ valid: false }, { headers });
  return NextResponse.json(
    {
      valid: true,
      memberId: member.id,
      referralCode: member.referralCode,
      fullName: member.person.fullName,
      position: member.position,
    },
    { headers },
  );
}
