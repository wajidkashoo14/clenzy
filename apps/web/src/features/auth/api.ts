import type { AuthUser } from '@clenzy/shared';
import { toApiError } from '@/lib/api-client';

/**
 * All auth calls go to this app's own `/api/auth/*` proxy, not the Express
 * API directly — see apps/web/src/app/api/auth/[...path]/route.ts.
 */
async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/auth${path}`, {
    ...init,
    credentials: 'include',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
  });

  if (!response.ok) {
    throw await toApiError(
      response,
      `${init?.method ?? 'GET'} ${path} failed with ${response.status}`,
    );
  }

  const body = (await response.json()) as { success: true; data: T };
  return body.data;
}

export function requestOtp(
  phone: string,
  purpose: 'login' | 'verify_phone' | 'order_confirm' = 'login',
): Promise<{ requestId: string; expiresInSeconds: number; resendAfterSeconds: number }> {
  return authFetch('/otp/request', { method: 'POST', body: JSON.stringify({ phone, purpose }) });
}

export function verifyOtp(
  phone: string,
  code: string,
  requestId: string,
): Promise<{ user: AuthUser }> {
  return authFetch('/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, requestId }),
  });
}

export function loginWithPassword(email: string, password: string): Promise<{ user: AuthUser }> {
  return authFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function refreshSession(): Promise<{ user: AuthUser }> {
  return authFetch('/refresh', { method: 'POST' });
}

export function logout(): Promise<{ loggedOut: true }> {
  return authFetch('/logout', { method: 'POST' });
}

export function getMe(): Promise<{ user: AuthUser }> {
  return authFetch('/me', { method: 'GET' });
}

export function forgotPassword(email: string): Promise<{ sent: true }> {
  return authFetch('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export function resetPassword(token: string, newPassword: string): Promise<{ reset: true }> {
  return authFetch('/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
}
