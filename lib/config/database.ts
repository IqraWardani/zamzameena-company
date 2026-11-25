export function hasDatabaseUrl(): boolean {
  const value = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.PRODUCTION_DATABASE_URL
  )?.trim();
  return Boolean(value && value.length > 0);
}

export function getDatabaseUrl(): string {
  let value = (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.PRODUCTION_DATABASE_URL
  )?.trim();

  if (!value) {
    throw new Error(
      "Missing DATABASE_URL. Please set DATABASE_URL (or PRODUCTION_DATABASE_URL / POSTGRES_URL) in your environment variables.",
    );
  }

  // Supabase pooler on port 5432 is Session mode (limited to 15 connections max,
  // triggering EMAXCONNSESSION errors). Automatically switch to port 6543 (Transaction mode
  // connection pooling) which supports unlimited concurrent serverless connections.
  if (value.includes("pooler.supabase.com:5432")) {
    value = value.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }

  if (value.includes("pooler.supabase.com") && !value.includes("uselibpqcompat=")) {
    const separator = value.includes("?") ? "&" : "?";
    value = `${value}${separator}uselibpqcompat=true`;
  }

  return value;
}
