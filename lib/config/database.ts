export function normalizeDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    // Supabase pooler on port 5432 is session-mode, limited to 15 connections project-wide.
    // In serverless/production deployments, auto-route to transaction pooler on port 6543.
    if (url.hostname.includes("pooler.supabase.com") && url.port === "5432") {
      url.port = "6543";
      if (!url.searchParams.has("pgbouncer")) {
        url.searchParams.set("pgbouncer", "true");
      }
      return url.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export function hasDatabaseUrl(): boolean {
  const value =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.PRODUCTION_DATABASE_URL?.trim();
  return Boolean(value && value.length > 0);
}

export function getDatabaseUrl(): string {
  const value =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.PRODUCTION_DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "Missing DATABASE_URL. Configure DATABASE_URL in Vercel Environment Variables or .env.local.",
    );
  }

  return normalizeDatabaseUrl(value);
}
