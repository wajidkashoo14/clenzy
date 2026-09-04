import type { AuthUser } from '@clenzy/shared';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { smsAdapter } from '../integrations/msg91/index.js';
import { emailAdapter } from '../integrations/resend/index.js';
import { OtpRequest } from '../models/OtpRequest.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { User, type UserDocument } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { matchesHash, sha256Hex } from '../utils/hash.js';
import { generateOtp } from '../utils/otp.js';
import { normalizePhoneIN } from '../utils/phone.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../utils/tokens.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const OTP_RESEND_COOLDOWN_SECONDS = 30;
const LOGIN_LOCKOUT_THRESHOLD = 10;
const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 30 * 60 * 1000;
const BCRYPT_COST = 12;

interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function toAuthUser(user: UserDocument & { _id: unknown }, isNewUser?: boolean): AuthUser {
  return {
    id: String(user._id),
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    ...(isNewUser !== undefined && { isNewUser }),
  };
}

async function issueSession(
  user: UserDocument & { _id: unknown },
  meta: SessionMeta,
  family: string = randomUUID(),
): Promise<TokenPair> {
  const accessToken = signAccessToken(String(user._id), user.role);
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    family,
    userAgent: meta.userAgent,
    ip: meta.ip,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export async function requestOtp(
  rawPhone: string,
  purpose: 'login' | 'verify_phone' | 'order_confirm',
): Promise<{ requestId: string; expiresInSeconds: number; resendAfterSeconds: number }> {
  const phone = normalizePhoneIN(rawPhone);
  if (!phone) throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number.');

  const recent = await OtpRequest.findOne({ phone }).sort({ createdAt: -1 });
  if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_SECONDS * 1000) {
    throw AppError.badRequest('OTP_RATE_LIMITED', 'Please wait before requesting another code.');
  }

  const code = generateOtp();
  const otpRequest = await OtpRequest.create({
    phone,
    codeHash: sha256Hex(code),
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  try {
    await smsAdapter.sendOtp(phone, code);
  } catch {
    throw new AppError(
      503,
      'SMS_PROVIDER_FAILED',
      'Could not send the verification code. Try again.',
    );
  }

  return {
    requestId: String(otpRequest._id),
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
    resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
  requestId: string,
  meta: SessionMeta,
): Promise<{ user: AuthUser } & TokenPair> {
  const phone = normalizePhoneIN(rawPhone);
  if (!phone) throw AppError.badRequest('INVALID_PHONE', 'Enter a valid phone number.');

  const otpRequest = await OtpRequest.findOne({ _id: requestId, phone });
  if (!otpRequest || otpRequest.consumedAt) {
    throw AppError.badRequest('OTP_INVALID', 'This code is invalid. Request a new one.');
  }
  if (otpRequest.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest('OTP_EXPIRED', 'This code has expired. Request a new one.');
  }
  if (otpRequest.attempts >= OTP_MAX_ATTEMPTS) {
    throw new AppError(429, 'OTP_MAX_ATTEMPTS', 'Too many attempts. Request a new code.');
  }

  if (!matchesHash(code, otpRequest.codeHash)) {
    otpRequest.attempts += 1;
    await otpRequest.save();
    const attemptsRemaining = OTP_MAX_ATTEMPTS - otpRequest.attempts;
    throw AppError.badRequest('OTP_INVALID', 'Incorrect code.', [
      { field: 'code', message: `${attemptsRemaining} attempt(s) remaining.` },
    ]);
  }

  otpRequest.consumedAt = new Date();
  await otpRequest.save();

  let user = await User.findOne({ phone });
  let isNewUser = false;
  if (!user) {
    user = await User.create({ phone, phoneVerified: true });
    isNewUser = true;
  } else if (!user.phoneVerified) {
    user.phoneVerified = true;
  }

  if (user.status === 'suspended' || user.status === 'deleted') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is not active.');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueSession(user, meta);
  return { user: toAuthUser(user, isNewUser), ...tokens };
}

export async function loginWithPassword(
  email: string,
  password: string,
  meta: SessionMeta,
): Promise<{ user: AuthUser } & TokenPair> {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Never distinguish "no such user" from "wrong password" — see docs/SECURITY.md §1.
  const invalidCredentials = () =>
    AppError.badRequest('INVALID_CREDENTIALS', 'Incorrect email or password.');

  if (!user || !user.passwordHash) throw invalidCredentials();

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError(429, 'ACCOUNT_LOCKED', 'Too many failed attempts. Try again later.');
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= LOGIN_LOCKOUT_THRESHOLD) {
      user.lockedUntil = new Date(Date.now() + LOGIN_LOCKOUT_WINDOW_MS);
    }
    await user.save();
    throw invalidCredentials();
  }

  if (user.status === 'suspended' || user.status === 'deleted') {
    throw new AppError(403, 'ACCOUNT_SUSPENDED', 'This account is not active.');
  }

  user.loginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueSession(user, meta);
  return { user: toAuthUser(user), ...tokens };
}

export async function refreshSession(
  rawRefreshToken: string,
  meta: SessionMeta,
): Promise<{ user: AuthUser } & TokenPair> {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const stored = await RefreshToken.findOne({ tokenHash });

  if (!stored) throw new AppError(401, 'REFRESH_INVALID', 'Session expired. Please log in again.');

  if (stored.revokedAt) {
    // Reuse of an already-consumed token — the standard signal of a stolen
    // refresh token. Revoke the entire family and force re-login.
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    throw new AppError(401, 'REFRESH_REUSE_DETECTED', 'Session invalidated. Please log in again.');
  }

  if (stored.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, 'REFRESH_EXPIRED', 'Session expired. Please log in again.');
  }

  const user = await User.findById(stored.userId);
  if (!user || user.status === 'suspended' || user.status === 'deleted') {
    throw new AppError(401, 'REFRESH_INVALID', 'Session expired. Please log in again.');
  }

  stored.revokedAt = new Date();
  await stored.save();

  const tokens = await issueSession(user, meta, stored.family);
  return { user: toAuthUser(user), ...tokens };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await RefreshToken.updateOne(
    { tokenHash, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function logoutAll(userId: string): Promise<void> {
  await RefreshToken.updateMany(
    { userId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date() } },
  );
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized();
  return toAuthUser(user);
}

export async function forgotPassword(email: string): Promise<void> {
  const user = await User.findOne({ email });
  // Always report success regardless of whether the email matched — don't
  // let this endpoint reveal which emails have accounts.
  if (!user) return;

  const token = randomBytes(32).toString('hex');
  user.passwordResetTokenHash = sha256Hex(token);
  user.passwordResetExpiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
  await user.save();

  const resetLink = `/reset-password?token=${token}`;
  await emailAdapter.sendPasswordResetEmail(email, resetLink);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const invalidToken = () =>
    AppError.badRequest('RESET_TOKEN_INVALID', 'This reset link is invalid or has expired.');

  const user = await User.findOne({ passwordResetTokenHash: sha256Hex(token) }).select(
    '+passwordResetTokenHash',
  );
  if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw invalidToken();
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.loginAttempts = 0;
  user.lockedUntil = undefined;
  await user.save();

  // Password reset revokes every existing session — see docs/SECURITY.md §1.
  await logoutAll(String(user._id));
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.passwordHash)
    throw AppError.badRequest('INVALID_CREDENTIALS', 'Incorrect current password.');

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw AppError.badRequest('INVALID_CREDENTIALS', 'Incorrect current password.');

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  await user.save();
}
