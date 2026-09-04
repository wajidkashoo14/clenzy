import {
  changePasswordInputSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  otpRequestInputSchema,
  otpVerifyInputSchema,
  resetPasswordInputSchema,
} from '@clenzy/shared';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import * as authService from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';
import { clearAuthCookies, setAuthCookies } from '../utils/cookies.js';

function sessionMeta(req: Request): { userAgent?: string; ip?: string } {
  return { userAgent: req.headers['user-agent'], ip: req.ip };
}

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
