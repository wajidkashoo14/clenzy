import type { AuthUser, UpdateProfileInput } from '@clenzy/shared';
import { toAuthUser } from './auth.service.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

/** See docs/API_SPEC.md §2 — GET /users/me. Same shape as GET /auth/me; kept as its own resource per the documented route grouping. */
export async function getProfile(userId: string): Promise<AuthUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized();
  return toAuthUser(user);
}

/** See docs/API_SPEC.md §2 — PATCH /users/me. Email verification and account deletion aren't built yet — out of Phase 11's scope. */
export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<AuthUser> {
  const user = await User.findById(userId);
  if (!user) throw AppError.unauthorized();

  if (input.name !== undefined) user.name = input.name;
  if (input.email !== undefined && input.email !== user.email) {
    const existing = await User.findOne({ email: input.email });
    if (existing) throw AppError.conflict('EMAIL_TAKEN', 'That email is already in use.');
    user.email = input.email;
    user.emailVerified = false;
  }
  if (input.notificationPrefs) {
    Object.assign(user.notificationPrefs, input.notificationPrefs);
  }

  await user.save();
  return toAuthUser(user);
}
