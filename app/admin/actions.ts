"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { logAdminAudit } from "@/lib/admin/audit";
import {
  adminSessionCookie,
  createAdminSessionToken,
  readAdminSessionToken,
} from "@/lib/admin/session";
import {
  clearLoginFailures,
  isLoginRateLimited,
  recordLoginFailure,
  shouldAuditRateLimit,
} from "@/lib/admin/login-rate-limit";
import { verifyAdminPassword } from "@/lib/security/password-hash";

export type LoginFormState = {
  error?: string;
};

const DUMMY_PASSWORD_HASH =
  `scrypt$32768$8$1$${"A".repeat(22)}$${"A".repeat(86)}`;
const GENERIC_LOGIN_ERROR = "Sign-in failed. Check your credentials or try again later.";

function clientIpFromTrustedHeader(value: string | null): string | undefined {
  if (!value || value.length > 64 || !/^[\da-fA-F.:]+$/.test(value)) return undefined;
  return value;
}

export async function login(
  _previousState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const password = formData.get("password");
  if (
    typeof rawEmail !== "string" ||
    typeof password !== "string" ||
    rawEmail.length > 320 ||
    password.length === 0 ||
    password.length > 256
  ) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: GENERIC_LOGIN_ERROR };
  }

  const requestHeaders = await headers();
  const clientIp = clientIpFromTrustedHeader(requestHeaders.get("x-real-ip"));
  if (isLoginRateLimited(email, clientIp)) {
    if (shouldAuditRateLimit(email, clientIp)) {
      await logAdminAudit({
        action: "login_rate_limited",
        entityType: "admin_user",
        metadata: { reason: "rate_limit" },
      });
    }
    return { error: GENERIC_LOGIN_ERROR };
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, status: true },
  });
  const passwordMatches = await verifyAdminPassword(
    password,
    adminUser?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );

  if (!adminUser || adminUser.status !== "active" || !passwordMatches) {
    recordLoginFailure(email, clientIp);
    await logAdminAudit({
      action: "login_failed",
      entityType: "admin_user",
      entityId: adminUser?.id,
      metadata: { reason: "invalid_credentials" },
    });
    return { error: GENERIC_LOGIN_ERROR };
  }

  const token = await createAdminSessionToken(adminUser.id);
  await prisma.$transaction(async (transaction) => {
    const updated = await transaction.adminUser.updateMany({
      where: { id: adminUser.id, status: "active" },
      data: { lastLoginAt: new Date() },
    });
    if (updated.count !== 1) {
      throw new Error("Admin account status changed during login.");
    }

    await transaction.auditLog.create({
      data: {
        actorAdminUserId: adminUser.id,
        action: "login_succeeded",
        entityType: "admin_user",
        entityId: adminUser.id,
        metadata: {},
      },
    });
  });

  clearLoginFailures(email);
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie.name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: adminSessionCookie.path,
    maxAge: adminSessionCookie.durationSeconds,
  });
  redirect("/admin");
}

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookie.name)?.value;
  cookieStore.set(adminSessionCookie.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: adminSessionCookie.path,
    maxAge: 0,
  });

  const claims = token ? await readAdminSessionToken(token) : null;
  await logAdminAudit({
    action: "logout",
    entityType: "admin_user",
    actorAdminUserId: claims?.adminUserId,
    entityId: claims?.adminUserId,
    metadata: {},
  });

  redirect("/admin/login");
}
