import { env } from '../../config/env.js';

/**
 * Google OAuth 2.0 (authorization-code flow) — see docs/INTEGRATIONS.md §2.13.
 * Implemented directly against Google's endpoints (no passport/googleapis
 * dependency): the flow is two HTTPS calls plus a redirect, and the session
 * issuance itself goes through the normal auth.service path.
 *
 * Unset GOOGLE_CLIENT_ID/SECRET means Google sign-in is disabled — the
 * start endpoint redirects back to the web app with a clear error instead
 * of failing, so the frontend button can stay visible unconditionally.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  avatarUrl?: string;
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/** The API route Google redirects back to after consent. */
function redirectUri(): string {
  return `${env.API_BASE_URL}/api/v1/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID ?? '',
    redirect_uri: redirectUri(),
    response_type: 'code',
    // openid gives the stable `sub` id; email+profile give the identity claims.
    scope: 'openid email profile',
    state,
    // Always show the account chooser — shared machines must be able to switch.
    prompt: 'select_account',
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
}

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const tokenRes = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? '',
      client_secret: env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Google token exchange failed (${tokenRes.status})`);
  }
  const { access_token } = (await tokenRes.json()) as GoogleTokenResponse;

  const profileRes = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!profileRes.ok) {
    throw new Error(`Google profile fetch failed (${profileRes.status})`);
  }
  const profile = (await profileRes.json()) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!profile.email) {
    throw new Error('Google account has no email address.');
  }

  return {
    googleId: profile.sub,
    email: profile.email.toLowerCase(),
    emailVerified: profile.email_verified ?? false,
    name: profile.name,
    avatarUrl: profile.picture,
  };
}
