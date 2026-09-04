import type { Role } from '@clenzy/shared';
import { randomBytes, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sha256Hex } from './hash.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes — see docs/SECURITY.md §1.
const REFRESH_TOKEN_TTL_DAYS = 30;

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  jti: string;
}

/** HS256, 15-minute expiry. Payload carries only `sub`/`role`/`jti` — JWTs are signed, not encrypted. */
export function signAccessToken(userId: string, role: Role): string {
  const payload: Omit<AccessTokenPayload, 'jti'> = { sub: userId, role };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    jwtid: randomUUID(),
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ['HS256'] }) as AccessTokenPayload;
}

/** Opaque 256-bit refresh token. Only `tokenHash` is ever persisted — see docs/DATABASE.md "refreshTokens". */
export function generateRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  return { token, tokenHash: sha256Hex(token), expiresAt };
}

export function hashRefreshToken(token: string): string {
  return sha256Hex(token);
}
