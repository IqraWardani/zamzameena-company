export function hasDatabaseUrl(): boolean {
  const value = process.env.DATABASE_URL?.trim();
  return Boolean(value && value.length > 0);
}

export function getDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    throw new Error(
      "Missing DATABASE_URL. Copy .env.example to .env.local and set the local PostgreSQL connection string.",
    );
  }

  return value;
}
