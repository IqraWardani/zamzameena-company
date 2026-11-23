import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { prisma } from "@/lib/db";
import {
  ADMIN_SALES_PERSON_SEARCH_MIN_LENGTH,
  ADMIN_SALES_PERSON_SEARCH_LIMIT,
  formatAdminSalesPersonSearchResults,
  normalizeAdminSalesPersonSearch,
} from "@/lib/sales/admin-person-search";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId")?.trim() ?? "";
  const rawQuery = searchParams.get("q");
  const query = normalizeAdminSalesPersonSearch(rawQuery);

  if (!UUID_PATTERN.test(eventId) || (rawQuery?.trim().length ?? 0) > 80) {
    return NextResponse.json({ people: [] }, { status: 400, headers: RESPONSE_HEADERS });
  }

  const { session, decision } = await requireAdminPermission(
    "sales.manage",
    "/api/admin/sales/people",
    eventId,
  );
  if (!session) {
    return NextResponse.json({ people: [] }, { status: 401, headers: RESPONSE_HEADERS });
  }
  if (!decision.allowed) {
    return NextResponse.json({ people: [] }, { status: 403, headers: RESPONSE_HEADERS });
  }
  if (query.length < ADMIN_SALES_PERSON_SEARCH_MIN_LENGTH) {
    return NextResponse.json({ people: [] }, { headers: RESPONSE_HEADERS });
  }

  const people = await prisma.salesPerson.findMany({
    where: {
      memberships: { none: { eventId } },
      OR: [
        { fullName: { startsWith: query, mode: "insensitive" } },
        { memberCode: { startsWith: query, mode: "insensitive" } },
      ],
    },
    select: { id: true, fullName: true, memberCode: true },
    orderBy: [{ fullName: "asc" }, { memberCode: "asc" }],
    take: ADMIN_SALES_PERSON_SEARCH_LIMIT,
  });

  return NextResponse.json(
    { people: formatAdminSalesPersonSearchResults(people) },
    { headers: RESPONSE_HEADERS },
  );
}
