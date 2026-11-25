import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/config/database";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = getDatabaseUrl();
  const poolMax = Math.max(
    Number(process.env.PG_MAX_POOL_SIZE || 10),
    5,
  );

  const adapter = new PrismaPg(
    {
      connectionString,
      max: poolMax,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    },
    {
      onPoolError: (err) => {
        console.error("PrismaPg pool error:", err);
      },
    },
  );

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = prisma;
