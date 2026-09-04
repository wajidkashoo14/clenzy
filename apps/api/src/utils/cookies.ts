import type { Response } from 'express';
import { env, isProduction } from '../config/env.js';

const ACCESS_TOKEN_MAX_AGE_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

// `Domain=localhost` is unnecessary and can behave inconsistently across
// browsers in local dev — omit the attribute entirely so the cookie scopes
// to the exact host, and only set it in environments where COOKIE_DOMAIN is
// a real domain (e.g. `.clenzy.in`). See docs/SECURITY.md §1.
const cookieDomain = env.COOKIE_DOMAIN === 'localhost' ? undefined : env.COOKIE_DOMAIN;

const baseCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  domain: cookieDomain,
  path: '/',
};

/** Sets both auth cookies per docs/API_SPEC.md §0 (`clenzy_at` / `clenzy_rt`). */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('clenzy_at', accessToken, { ...baseCookieOptions, maxAge: ACCESS_TOKEN_MAX_AGE_MS });
  res.cookie('clenzy_rt', refreshToken, { ...baseCookieOptions, maxAge: REFRESH_TOKEN_MAX_AGE_MS });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('clenzy_at', baseCookieOptions);
  res.clearCookie('clenzy_rt', baseCookieOptions);
}
