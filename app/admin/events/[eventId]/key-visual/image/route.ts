import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/admin/authorization";
import { EVENT_PERMISSIONS } from "@/lib/admin/event-validation";
import { MAX_KEY_VISUAL_BYTES } from "@/lib/key-visual/validation";
import { prisma } from "@/lib/db";
import { readEventKeyVisualObject } from "@/lib/key-visual/storage";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET(
  _request: Request,
  { params }: RouteContext<"/admin/events/[eventId]/key-visual/image">,
) {
  const { eventId } = await params;
  const { session, decision } = await requireAdminPermission(
    EVENT_PERMISSIONS.update,
    `/admin/events/${eventId}/key-visual/image`,
    eventId,
  );
  if (!session) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!decision.allowed) {
    return new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const visual = await prisma.eventKeyVisual.findFirst({
    where: {
      eventId,
      event: { eventAssignments: { some: { adminUserId: session.id } } },
      isActive: true,
      deletedAt: null,
    },
    select: { objectKey: true, contentType: true, byteSize: true },
  });
  if (!visual || !IMAGE_TYPES.has(visual.contentType)) {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const bytes = await readEventKeyVisualObject(visual.objectKey, MAX_KEY_VISUAL_BYTES);
    if (
      bytes.byteLength !== Number(visual.byteSize) ||
      bytes.byteLength > MAX_KEY_VISUAL_BYTES
    ) {
      console.error("Stored Key Visual size does not match its database metadata.");
      return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new NextResponse(body, {
      headers: {
        "Content-Type": visual.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    console.error("Admin Key Visual object could not be read from storage.");
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
