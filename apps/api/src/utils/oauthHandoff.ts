import { randomBytes } from 'node:crypto';

/**
 * Short-lived, single-use handoff for the Google OAuth round-trip. Google's
 * callback lands on this API's own origin (a real browser redirect, so its
 * cookies would otherwise be scoped to this API's domain, not the web app's
 * — see apps/web/src/app/api/auth/google/finish/route.ts for the other
 * half). Rather than set the session cookies here and redirect straight to
 * the web app, we mint a one-time code for the already-issued tokens and let
 * the web app's own origin exchange it, so the cookies end up first-party
 * there instead.
 *
 * In-memory and per-instance — fine at this app's current scale (a single
 * Railway instance) since a code is only ever needed for the few seconds
 * between the two redirects. Would need a shared store (Mongo, Redis) behind
 * multiple instances.
 */
const HANDOFF_TTL_MS = 60 * 1000;

interface HandoffEntry {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

const handoffs = new Map<string, HandoffEntry>();

function evictExpired(): void {
  const now = Date.now();
  for (const [code, entry] of handoffs) {
    if (entry.expiresAt <= now) handoffs.delete(code);
  }
}

export function createOAuthHandoff(accessToken: string, refreshToken: string): string {
  evictExpired();
  const code = randomBytes(24).toString('hex');
  handoffs.set(code, { accessToken, refreshToken, expiresAt: Date.now() + HANDOFF_TTL_MS });
  return code;
}

/** Single-use — the code is removed whether or not it's still valid. */
export function consumeOAuthHandoff(
  code: string,
): { accessToken: string; refreshToken: string } | null {
  const entry = handoffs.get(code);
  handoffs.delete(code);
  if (!entry || entry.expiresAt <= Date.now()) return null;
  return { accessToken: entry.accessToken, refreshToken: entry.refreshToken };
}
