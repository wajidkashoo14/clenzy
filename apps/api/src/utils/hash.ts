import { createHash, timingSafeEqual } from 'node:crypto';

/** SHA-256 hex digest — used for OTP codes, refresh tokens, and reset tokens (never store raw). */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Constant-time comparison of a candidate value against a stored SHA-256
 * hash, to avoid timing oracles on OTP/token verification — see
 * docs/SECURITY.md §1. Both sides are hashed to a fixed-length hex string
 * first, so `timingSafeEqual` (which requires equal-length buffers) always
 * applies regardless of the candidate's length.
 */
export function matchesHash(candidate: string, storedHash: string): boolean {
  const candidateHash = Buffer.from(sha256Hex(candidate));
  const stored = Buffer.from(storedHash);
  if (candidateHash.length !== stored.length) return false;
  return timingSafeEqual(candidateHash, stored);
}
