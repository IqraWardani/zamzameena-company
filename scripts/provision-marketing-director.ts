import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../lib/config/database";
import { hashAdminPassword } from "../lib/security/password-hash";

function prompt(label: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Director provisioning requires an interactive terminal.");
  }
  process.stdout.write(label);
  process.stdin.setEncoding("utf8");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") {
          finish(new Error("Director provisioning cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          value = value.slice(0, -1);
          if (!hidden) process.stdout.write("\b \b");
          continue;
        }
        value += character;
        if (!hidden) process.stdout.write(character);
      }
    };
    process.stdin.on("data", onData);
  });
}

async function provisionMarketingDirector() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
    throw new Error("Set ADMIN_SESSION_SECRET to a private value of at least 32 bytes first.");
  }

  const email = (await prompt("Director email: ")).trim().toLowerCase();
  const fullName = (await prompt("Director full name: ")).trim();
  const eventSlug = (await prompt("Assigned event slug: ")).trim();
  const password = await prompt("New password (input hidden): ", true);
  const passwordConfirmation = await prompt("Confirm password (input hidden): ", true);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error("Enter a valid email address (maximum 320 characters).");
  }
  if (!fullName || fullName.length > 160) {
    throw new Error("Enter a name between 1 and 160 characters.");
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventSlug) || eventSlug.length > 160) {
    throw new Error("Enter a valid event slug.");
  }
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must be between 12 and 128 characters.");
  }
  if (password !== passwordConfirmation) {
    throw new Error("Password confirmation does not match.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: getDatabaseUrl() }),
  });
  try {
    const passwordHash = await hashAdminPassword(password);
    const user = await prisma.$transaction(async (transaction) => {
      const event = await transaction.event.findUnique({
        where: { slug: eventSlug },
        select: { id: true },
      });
      if (!event) throw new Error("The requested event does not exist.");

      const role = await transaction.role.findUnique({
        where: { code: "marketing_director" },
        select: { id: true },
      });
      if (!role) throw new Error("Run the sales-management migration before provisioning the director.");
      const permission = await transaction.permission.findUnique({
        where: { code: "sales.read" },
        select: { id: true },
      });
      if (!permission) throw new Error("The sales.read permission has not been installed.");

      const adminUser = await transaction.adminUser.create({
        data: { email, fullName, passwordHash },
        select: { id: true },
      });
      await transaction.rolePermission.createMany({
        data: [{ roleId: role.id, permissionId: permission.id }],
        skipDuplicates: true,
      });
      await transaction.adminUserRole.create({
        data: { adminUserId: adminUser.id, roleId: role.id },
      });
      await transaction.eventStaffAssignment.create({
        data: { adminUserId: adminUser.id, eventId: event.id },
      });
      await transaction.auditLog.create({
        data: {
          actorAdminUserId: adminUser.id,
          eventId: event.id,
          entityId: adminUser.id,
          entityType: "admin_user",
          action: "marketing_director_provisioned",
          metadata: {
            initialRole: role.id,
            permissions: ["sales.read"],
            provisioningMethod: "interactive_cli",
          },
        },
      });
      return adminUser;
    });
    console.log(`Marketing Director provisioned successfully (id: ${user.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

provisionMarketingDirector().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected provisioning failure.";
  console.error(`Marketing Director provisioning failed: ${message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")}`);
  process.exitCode = 1;
});
