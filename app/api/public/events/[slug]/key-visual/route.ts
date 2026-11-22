import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readEventKeyVisualObject } from "@/lib/key-visual/storage";
import { MAX_KEY_VISUAL_BYTES } from "@/lib/key-visual/validation";

export const runtime = "nodejs";

const PUBLIC_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/public/events/[slug]/key-visual">,
) {
  const { slug } = await params;
  const visual = await prisma.eventKeyVisual.findFirst({
    where: {
      event: { slug, status: "published" },
      isActive: true,
      deletedAt: null,
    },
    select: {
      objectKey: true,
      contentType: true,
      byteSize: true,
      originalFilename: true,
    },
  });
  if (!visual || !PUBLIC_IMAGE_TYPES.has(visual.contentType)) {
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const bytes = await readEventKeyVisualObject(
      visual.objectKey,
      MAX_KEY_VISUAL_BYTES,
    );
    if (
      bytes.byteLength !== Number(visual.byteSize) ||
      bytes.byteLength > MAX_KEY_VISUAL_BYTES
    ) {
      console.error("Stored Key Visual size does not match its database metadata.");
      return new Response(null, {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);
    return new NextResponse(body, {
      headers: {
        "Content-Type": visual.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch {
    console.error("Public Key Visual object could not be read from storage.");
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
