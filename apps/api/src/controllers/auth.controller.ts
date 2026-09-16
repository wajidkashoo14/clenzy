import {
  changePasswordInputSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  otpRequestInputSchema,
  otpVerifyInputSchema,
  resetPasswordInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import {
  buildGoogleAuthUrl,
  exchangeCodeForProfile,
  isGoogleAuthConfigured,
} from '../integrations/google/index.js';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as authService from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';

function sessionMeta(req: Request): { userAgent?: string; ip?: string } {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

/**
 * CSRF protection for the OAuth redirect round-trip: a random state goes out
 * in a short-lived httpOnly cookie and must come back as the matching query
 * param (docs/SECURITY.md §1 — OAuth flows need state validation).
 */
const OAUTH_STATE_COOKIE = 'clenzy_oauth_state';
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function redirectToLogin(res: Response, authError: string): void {
  res.redirect(`${env.WEB_APP_URL}/login?authError=${encodeURIComponent(authError)}`);
}

// eslint-disable-next-line @typescript-eslint/require-await -- asyncHandler's signature requires a Promise-returning fn; this path is pure sync logic.
export const googleStart = asyncHandler(async (req: Request, res: Response) => {
  if (!isGoogleAuthConfigured()) {
    redirectToLogin(res, 'google_not_configured');
    return;
  }
  const state = randomBytes(24).toString('hex');
  res.cookie(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: OAUTH_STATE_MAX_AGE_MS,
    path: '/',
  });
  res.redirect(buildGoogleAuthUrl(state));
});

export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as Record<string, string | undefined>;
  const stateCookie = (req.cookies as Record<string, string | undefined>)?.[OAUTH_STATE_COOKIE];
  res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

  // Google reported an error at the consent screen (user denied, etc.).
  if (query.error) {
    redirectToLogin(res, 'google_denied');
    return;
  }

  // Missing/mismatched state — the round-trip didn't originate from us.
  if (!query.state || !stateCookie || query.state !== stateCookie) {
    redirectToLogin(res, 'google_state_mismatch');
    return;
  }
  if (!query.code) {
    redirectToLogin(res, 'google_failed');
    return;
  }

  try {
    const profile = await exchangeCodeForProfile(query.code);
    const { accessToken, refreshToken } = await authService.loginWithGoogle(
      profile,
      sessionMeta(req),
    );
    setAuthCookies(res, accessToken, refreshToken);
    res.redirect(`${env.WEB_APP_URL}/account`);
  } catch (error) {
    // Never leave the user on a bare API JSON error — land them on the login
    // page with a readable reason instead.
    logger.error({ err: error }, 'Google sign-in failed');
    redirectToLogin(res, 'google_failed');
  }
});

export const requestOtp = asyncHandler(async (req: Request, res: Response) => {
  const input = otpRequestInputSchema.parse(req.body);
  const result = await authService.requestOtp(input.phone, input.purpose);
  res.status(200).json({ success: true, data: result });
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const input = otpVerifyInputSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.verifyOtp(
    input.phone,
    input.code,
    input.requestId,
    sessionMeta(req),
  );
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ success: true, data: { user } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginInputSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await authService.loginWithPassword(
    input.email,
    input.password,
    sessionMeta(req),
  );
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ success: true, data: { user } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = (req.cookies as Record<string, string | undefined>)?.clenzy_rt;
  if (!rawRefreshToken) throw AppError.unauthorized('No session to refresh.');

  const { user, accessToken, refreshToken } = await authService.refreshSession(
    rawRefreshToken,
    sessionMeta(req),
  );
  setAuthCookies(res, accessToken, refreshToken);
  res.status(200).json({ success: true, data: { user } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = (req.cookies as Record<string, string | undefined>)?.clenzy_rt;
  if (rawRefreshToken) await authService.logout(rawRefreshToken);
  clearAuthCookies(res);
  res.status(200).json({ success: true, data: { loggedOut: true } });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await authService.logoutAll(req.user!.id);
  clearAuthCookies(res);
  res.status(200).json({ success: true, data: { loggedOut: true } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  res.status(200).json({ success: true, data: { user } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = forgotPasswordInputSchema.parse(req.body);
  await authService.forgotPassword(input.email);
  // Always 200 — never reveal whether the email matched an account.
  res.status(200).json({ success: true, data: { sent: true } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const input = resetPasswordInputSchema.parse(req.body);
  await authService.resetPassword(input.token, input.newPassword);
  res.status(200).json({ success: true, data: { reset: true } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const input = changePasswordInputSchema.parse(req.body);
  await authService.changePassword(req.user!.id, input.currentPassword, input.newPassword);
  res.status(200).json({ success: true, data: { changed: true } });
});
