import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "zas_participant_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SESSION_ISSUER = "zas-event";
const SESSION_AUDIENCE = "zas-participant";

function getSecret(): Uint8Array {
  const secret = process.env.PARTICIPANT_SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("PARTICIPANT_SESSION_SECRET must be configured with at least 32 bytes.");
  }
  return new TextEncoder().encode(secret);
}

export function assertParticipantSessionConfiguration(): void {
  getSecret();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function setParticipantSession(registrationId: string): Promise<void> {
  if (!UUID_PATTERN.test(registrationId)) {
    throw new Error("Cannot issue a participant session for an invalid registration.");
  }
  const token = await new SignJWT({ registrationIds: [registrationId] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("participant")
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/participant",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getParticipantSession(): Promise<{ registrationIds: string[] } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    if (payload.sub !== "participant" || !Array.isArray(payload.registrationIds)) {
      return null;
    }
    const registrationIds = payload.registrationIds.filter(
      (id): id is string => typeof id === "string" && UUID_PATTERN.test(id),
    );
    if (
      registrationIds.length !== payload.registrationIds.length ||
      registrationIds.length < 1 ||
      registrationIds.length > 20
    ) {
      return null;
    }
    return { registrationIds };
  } catch {
    return null;
  }
}

export async function clearParticipantSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/participant",
    maxAge: 0,
  });
}
