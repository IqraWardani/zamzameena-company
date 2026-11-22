import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const EVENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventSlug = searchParams.get("eventSlug")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (
    eventSlug.length > 160 ||
    !EVENT_SLUG_PATTERN.test(eventSlug) ||
    query.length < 2 ||
    query.length > 80
  ) {
    return NextResponse.json({ members: [] }, { status: 400, headers });
  }

  const now = new Date();
  const members = await prisma.salesMember.findMany({
    where: {
      status: "active",
      event: {
        slug: eventSlug,
        status: "published",
        AND: [
          { OR: [{ registrationOpensAt: null }, { registrationOpensAt: { lte: now } }] },
          { OR: [{ registrationClosesAt: null }, { registrationClosesAt: { gt: now } }] },
        ],
      },
      OR: [
        { person: { is: { fullName: { startsWith: query, mode: "insensitive" } } } },
        { person: { is: { memberCode: { startsWith: query, mode: "insensitive" } } } },
        { referralCode: { startsWith: query, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      referralCode: true,
      position: true,
      region: true,
      person: { select: { fullName: true } },
    },
    orderBy: [{ person: { fullName: "asc" } }, { referralCode: "asc" }],
    take: 8,
  });

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      fullName: member.person.fullName,
      position: member.position,
      referralCode: member.referralCode,
      region: member.region,
    })),
  }, { headers });
}
