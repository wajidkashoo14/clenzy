import type { AuthUser, UpdateProfileInput } from '@clenzy/shared';
import { apiPatch } from '@/lib/api-client';

export function updateProfile(input: UpdateProfileInput): Promise<{ user: AuthUser }> {
  return apiPatch('/api/v1/users/me', input);
}
