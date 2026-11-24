import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

loadDotenv({ path: ".env.local" });

const directUrl = process.env.DIRECT_URL?.trim();
if (!directUrl) {
  throw new Error(
    "Missing DIRECT_URL. Set DIRECT_URL to a direct or session-mode PostgreSQL URL for Prisma CLI commands.",
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
