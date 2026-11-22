import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../lib/config/database";

async function enableCheckIn() {
  if (!process.stdin.isTTY) {
    throw new Error("Permission update requires an interactive terminal.");
  }
  process.stdout.write(
    "Grant checkins.record to every member of admin_operator? Event assignments still limit scope. Type YES to continue: ",
  );
  const confirmation = await new Promise<string>((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (value: string) => {
      process.stdin.pause();
      resolve(value.trim());
    });
    process.stdin.resume();
  });
  if (confirmation !== "YES") {
    console.log("Permission update cancelled.");
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });
  try {
    const granted = await prisma.$transaction(async (transaction) => {
      const role = await transaction.role.findUnique({
        where: { code: "admin_operator" },
        select: { id: true },
      });
      if (!role) throw new Error("Role admin_operator does not exist.");

      const permission = await transaction.permission.upsert({
        where: { code: "checkins.record" },
        create: {
          code: "checkins.record",
          name: "Record check-ins for assigned events",
        },
        update: {},
      });
      const existing = await transaction.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        select: { roleId: true },
      });
      if (existing) return false;

      await transaction.rolePermission.create({
        data: { roleId: role.id, permissionId: permission.id },
      });
      await transaction.auditLog.create({
        data: {
          action: "role_permission_granted",
          entityType: "role",
          entityId: role.id,
          metadata: {
            permissionCode: permission.code,
            changedBy: "interactive_cli",
          },
        },
      });
      return true;
    });
    console.log(
      granted
        ? "checkins.record permission granted to admin_operator."
        : "admin_operator already has checkins.record; no changes were made.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

enableCheckIn().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unexpected permission update failure.";
  console.error(
    `Permission update failed: ${message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")}`,
  );
  process.exitCode = 1;
});
