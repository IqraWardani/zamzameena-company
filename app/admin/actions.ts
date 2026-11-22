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
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export type LoginFormState = {
  error?: string;
};

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

  let authenticatedEmail: string;
  try {
    const { data, error } = await createSupabaseServerClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error || !data.user?.email) {
      if (!error || (error.status ?? 0) < 500) {
        recordLoginFailure(email, clientIp);
      } else {
        console.error("Supabase Auth could not process an admin sign-in request.");
        return { error: "Sign-in is temporarily unavailable. Please try again later." };
      }
      await logAdminAudit({
        action: "login_failed",
        entityType: "admin_user",
        metadata: { reason: "invalid_credentials" },
      });
      return { error: GENERIC_LOGIN_ERROR };
    }
    authenticatedEmail = data.user.email.trim().toLowerCase();
  } catch (error) {
    console.error(
      "Supabase Auth admin sign-in failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return { error: "Sign-in is temporarily unavailable. Please try again later." };
  }

  const adminUser = await prisma.adminUser.findUnique({
    where: { email: authenticatedEmail },
    select: {
      id: true,
      status: true,
      userRoles: { select: { role: { select: { code: true } } } },
    },
  });

  if (
    !adminUser ||
    adminUser.status !== "active" ||
    adminUser.userRoles.length === 0
  ) {
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

export async function clearAdminSessionAfterPasswordReset(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookie.name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: adminSessionCookie.path,
    maxAge: 0,
  });
}
