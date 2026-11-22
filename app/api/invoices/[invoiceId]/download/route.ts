import { NextResponse } from "next/server";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  { params }: RouteContext<"/api/invoices/[invoiceId]/download">,
) {
  const { invoiceId } = await params;
  if (!UUID_PATTERN.test(invoiceId)) {
    return new Response("Not found", { status: 404 });
  }
  return NextResponse.redirect(
    new URL(`/participant/invoices/${invoiceId}/download`, request.url),
    307,
  );
}
