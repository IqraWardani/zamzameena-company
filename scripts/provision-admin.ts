import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "../lib/config/database";
import { hashAdminPassword } from "../lib/security/password-hash";

function prompt(label: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY || !process.stdin.setRawMode) {
    throw new Error("Admin provisioning requires an interactive terminal.");
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
          finish(new Error("Admin provisioning cancelled."));
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

async function provisionAdmin() {
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!sessionSecret || Buffer.byteLength(sessionSecret, "utf8") < 32) {
    throw new Error("Set ADMIN_SESSION_SECRET to a private value of at least 32 bytes first.");
  }

  const email = (await prompt("Administrator email: ")).trim().toLowerCase();
  const fullName = (await prompt("Administrator full name: ")).trim();
  const password = await prompt("New password (input hidden): ", true);
  const passwordConfirmation = await prompt("Confirm password (input hidden): ", true);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    throw new Error("Enter a valid email address (maximum 320 characters).");
  }
  if (!fullName || fullName.length > 160) {
    throw new Error("Enter a name between 1 and 160 characters.");
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
    const adminUser = await prisma.$transaction(async (transaction) => {
      const permissionsToGrant = [
        ["admin.dashboard.view", "View admin dashboard"],
        ["events.read", "View assigned events"],
        ["events.create", "Create events"],
        ["events.update", "Edit draft events"],
        ["events.publish", "Publish events"],
        ["events.close", "Close events"],
        ["events.cancel", "Cancel events"],
        ["events.archive", "Archive events"],
        ["events.staff.manage", "Manage assigned event staff"],
        ["ticket-types.manage", "Manage assigned event ticket types"],
        ["payments.review", "Review event payment claims"],
        ["invitations.collect", "Collect invitations for assigned events"],
        ["checkins.record", "Record check-ins for assigned events"],
        ["contacts.manage", "Manage public contact submissions"],
        ["sales.read", "View sales management"],
        ["sales.manage", "Manage sales structure"],
      ] as const;
      const role = await transaction.role.upsert({
        where: { code: "admin_operator" },
        create: {
          code: "admin_operator",
          name: "Administrator",
          description: "Initial administrator role provisioned explicitly by an operator.",
          isSystem: true,
        },
        update: { isSystem: true },
      });
      const permissions = await Promise.all(
        permissionsToGrant.map(([code, name]) =>
          transaction.permission.upsert({
            where: { code },
            create: { code, name },
            update: {},
          }),
        ),
      );
      const user = await transaction.adminUser.create({
        data: { email, fullName, passwordHash },
        select: { id: true },
      });

      await transaction.adminUserRole.create({
        data: {
          adminUserId: user.id,
          roleId: role.id,
        },
      });
      const existingPermissionCodes = new Set(
        (
          await transaction.rolePermission.findMany({
            where: { roleId: role.id },
            select: { permission: { select: { code: true } } },
          })
        ).map(({ permission }) => permission.code),
      );
      const newPermissions = permissions.filter(
        (permission) => !existingPermissionCodes.has(permission.code),
      );
      const granted = await transaction.rolePermission.createMany({
        data: newPermissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
      if (granted.count > 0) {
        await transaction.auditLog.create({
          data: {
            action: "role_permissions_granted",
            entityType: "role",
            entityId: role.id,
            metadata: {
              permissionCodes: newPermissions.map(({ code }) => code),
              provisioningMethod: "interactive_cli",
            },
          },
        });
      }
      await transaction.auditLog.create({
        data: {
          action: "admin_provisioned",
          entityType: "admin_user",
          entityId: user.id,
          metadata: { provisioningMethod: "interactive_cli", initialRole: role.code },
        },
      });

      return user;
    });

    console.log(`Administrator provisioned successfully (id: ${adminUser.id}).`);
  } finally {
    await prisma.$disconnect();
  }
}

provisionAdmin().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected provisioning failure.";
  console.error(`Admin provisioning failed: ${message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]")}`);
  process.exitCode = 1;
});
