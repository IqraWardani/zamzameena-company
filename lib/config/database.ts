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
  const value = (
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

  return value;
}
