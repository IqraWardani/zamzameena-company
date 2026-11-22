import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { randomUUID } from "node:crypto";

const COOKIE_NAME = "zas_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const SESSION_ISSUER = "zamzameena-admin";
const SESSION_AUDIENCE = "zas-admin";

function getSessionKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be configured with at least 32 bytes.");
  }

  return new TextEncoder().encode(secret);
}

export async function createAdminSessionToken(adminUserId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminUserId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSessionKey());
}

export async function readAdminSessionToken(
  token: string,
): Promise<{ adminUserId: string } | null> {
  const key = getSessionKey();
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    if (
      typeof payload.sub !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        payload.sub,
      )
    ) {
      return null;
    }

    return { adminUserId: payload.sub };
  } catch {
    return null;
  }
}

export const adminSessionCookie = {
  name: COOKIE_NAME,
  durationSeconds: SESSION_DURATION_SECONDS,
  path: "/admin",
} as const;
