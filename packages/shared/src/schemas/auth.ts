import { z } from 'zod';
import { ROLES } from '../constants/roles.js';

/** Shared validation for auth endpoints — see docs/API_SPEC.md §1 and docs/DATABASE.md. */

// Deliberately permissive here: the API does the real E.164 normalization
// and rejects anything that doesn't resolve to a valid Indian mobile number.
// This just keeps obviously-malformed input from reaching the server.
const phoneSchema = z
  .string()
  .trim()
  .min(10, 'Enter a valid phone number')
  .max(15)
  .regex(/^[+\d][\d\s-]{9,14}$/, 'Enter a valid phone number');

const otpCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'Enter the 6-digit code');

const passwordSchema = z.string().min(10, 'Password must be at least 10 characters').max(200);

export const otpRequestInputSchema = z.object({
  phone: phoneSchema,
  purpose: z.enum(['login', 'verify_phone', 'order_confirm']).default('login'),
});
export type OtpRequestInput = z.infer<typeof otpRequestInputSchema>;

export const otpVerifyInputSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
  requestId: z.string().trim().min(1, 'Missing requestId'),
});
export type OtpVerifyInput = z.infer<typeof otpVerifyInputSchema>;

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: z.string().trim().min(1, 'Missing reset token'),
  newPassword: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password'),
  newPassword: passwordSchema,
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

const notificationPrefsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  whatsapp: z.boolean(),
  push: z.boolean(),
  marketing: z.boolean(),
});

/** Public-safe user shape — never includes passwordHash or tokens. */
export const authUserSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  // Optional: Google sign-ups (docs/INTEGRATIONS.md §2.5) are phone-less
  // until the user adds one via Profile/checkout.
  phone: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(ROLES),
  notificationPrefs: notificationPrefsSchema,
  isNewUser: z.boolean().optional(),
});
export type AuthUser = z.infer<typeof authUserSchema>;
