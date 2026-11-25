import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { getDatabaseUrl } from "@/lib/config/database";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

function createPrismaClient(): PrismaClient {
  const connectionString = getDatabaseUrl();
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NODE_ENV === "production",
  );

  // In serverless environments, keep connection pool small (1-2) to avoid exhausting database limits
  const poolMax = isServerless
    ? Math.max(Number(process.env.PG_MAX_POOL_SIZE || 2), 1)
    : Math.max(Number(process.env.PG_MAX_POOL_SIZE || 10), 5);

  const isRemote =
    connectionString.includes("supabase.co") ||
    connectionString.includes("supabase.com") ||
    connectionString.includes("pooler.supabase.com") ||
    connectionString.includes("aws-") ||
    connectionString.includes("sslmode=require") ||
    process.env.NODE_ENV === "production";

  const pool =
    globalForPrisma.pgPool ??
    new Pool({
      connectionString,
      max: poolMax,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: isServerless ? 10000 : 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      ssl: isRemote ? { rejectUnauthorized: false } : undefined,
    });

  pool.on("error", (err) => {
    console.error("PostgreSQL pool client error:", err.message);
  });

  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool, {
    onPoolError: (err) => {
      console.error("PrismaPg pool error:", err.message);
    },
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
