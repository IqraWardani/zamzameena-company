import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

loadDotenv({ path: ".env.local" });

const directUrl =
  process.env.DIRECT_URL?.trim() ||
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL_NON_POOLING?.trim() ||
  process.env.POSTGRES_URL?.trim();

if (!directUrl) {
  throw new Error(
    "Missing DIRECT_URL or DATABASE_URL. Set DIRECT_URL or DATABASE_URL for Prisma CLI commands.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: directUrl,
  },
});
