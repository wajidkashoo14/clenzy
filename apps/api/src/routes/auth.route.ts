import type { Request } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.js';

/** Rate limits per docs/API_SPEC.md §11 — phone/IP-keyed where specified. */
function phoneFromBody(req: Request): string {
  const body = req.body as Record<string, unknown> | undefined;
  const phone = body?.phone;
  return typeof phone === 'string' ? phone : req.ip || 'unknown';
}

// 3 / phone / hour
const otpRequestPhoneLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneFromBody,
});

// 10 / IP / hour
const otpRequestIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// 5 / phone / 15 min
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: phoneFromBody,
});

// 5 / IP / 15 min — the per-account lockout after 10 failures is enforced in auth.service.ts.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

// 20 / IP / 15 min — the Google endpoints are full-page redirects, not JSON
// APIs; the limit just stops the start endpoint being hammered into a
// redirect-loop generator.
const googleLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.post(
  '/otp/request',
  otpRequestPhoneLimiter,
  otpRequestIpLimiter,
  authController.requestOtp,
);
authRouter.post('/otp/verify', otpVerifyLimiter, authController.verifyOtp);
authRouter.post('/login', loginLimiter, authController.login);
authRouter.get('/google', googleLimiter, authController.googleStart);
authRouter.get('/google/callback', googleLimiter, authController.googleCallback);
authRouter.post('/google/exchange', googleLimiter, authController.googleExchange);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/logout-all', requireAuth, authController.logoutAll);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/forgot-password', authController.forgotPassword);
authRouter.post('/reset-password', authController.resetPassword);
authRouter.patch('/password', requireAuth, authController.changePassword);
