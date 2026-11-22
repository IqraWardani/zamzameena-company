import "server-only";

const WINDOW_MS = 15 * 60 * 1000;
const EMAIL_LIMIT = 8;
const IP_LIMIT = 30;
const MAX_TRACKED_KEYS = 10_000;
const attempts = new Map<string, { count: number; resetAt: number }>();
const reportedRateLimits = new Map<string, number>();

function keysFor(email: string, clientIp?: string): string[] {
  const keys = [`email:${email}`];
  if (clientIp) keys.push(`ip:${clientIp}`);
  return keys;
}

function pruneExpired(now: number) {
  for (const [key, state] of attempts) {
    if (state.resetAt <= now) attempts.delete(key);
  }
  for (const [key, resetAt] of reportedRateLimits) {
    if (resetAt <= now) reportedRateLimits.delete(key);
  }
  while (reportedRateLimits.size >= MAX_TRACKED_KEYS) {
    const oldestKey = reportedRateLimits.keys().next().value;
    if (oldestKey === undefined) break;
    reportedRateLimits.delete(oldestKey);
  }
  while (attempts.size >= MAX_TRACKED_KEYS) {
    const oldestKey = attempts.keys().next().value;
    if (oldestKey === undefined) break;
    attempts.delete(oldestKey);
  }
}

export function isLoginRateLimited(email: string, clientIp?: string): boolean {
  const now = Date.now();
  pruneExpired(now);
  return keysFor(email, clientIp).some((key) => {
    const state = attempts.get(key);
    const limit = key.startsWith("email:") ? EMAIL_LIMIT : IP_LIMIT;
    return Boolean(state && state.resetAt > now && state.count >= limit);
  });
}

export function shouldAuditRateLimit(email: string, clientIp?: string): boolean {
  const now = Date.now();
  pruneExpired(now);
  const blockedKeys = keysFor(email, clientIp).filter((key) => {
    const state = attempts.get(key);
    const limit = key.startsWith("email:") ? EMAIL_LIMIT : IP_LIMIT;
    return Boolean(state && state.resetAt > now && state.count >= limit);
  });
  const newlyBlocked = blockedKeys.some((key) => !reportedRateLimits.has(key));

  for (const key of blockedKeys) {
    reportedRateLimits.set(key, now + WINDOW_MS);
  }

  return newlyBlocked;
}

export function recordLoginFailure(email: string, clientIp?: string): void {
  const now = Date.now();
  for (const key of keysFor(email, clientIp)) {
    const existing = attempts.get(key);
    const limit = key.startsWith("email:") ? EMAIL_LIMIT : IP_LIMIT;
    if (!existing || existing.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    } else {
      attempts.set(key, {
        count: Math.min(existing.count + 1, limit + 1),
        resetAt: existing.resetAt,
      });
    }
  }
}

export function clearLoginFailures(email: string): void {
  attempts.delete(`email:${email}`);
}
