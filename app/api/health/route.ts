import { NextResponse } from "next/server";

import { getDatabaseUrl, hasDatabaseUrl } from "@/lib/config/database";

export async function GET() {
  const isConfigured = hasDatabaseUrl();

  if (!isConfigured) {
    return NextResponse.json(
      {
        status: "degraded",
        environment: process.env.NODE_ENV ?? "development",
        database: "missing",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }

  try {
    getDatabaseUrl();

    return NextResponse.json({
      status: "ok",
      environment: process.env.NODE_ENV ?? "development",
      database: "configured",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        environment: process.env.NODE_ENV ?? "development",
        database: "missing",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
