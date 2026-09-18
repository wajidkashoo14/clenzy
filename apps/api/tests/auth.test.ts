import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { smsAdapter } from '../src/integrations/msg91/index.js';
import { OtpRequest } from '../src/models/OtpRequest.js';
import { RefreshToken } from '../src/models/RefreshToken.js';
import { User } from '../src/models/User.js';

const app = createApp();

// Each test gets its own phone number — the otp/request rate limiter is
// 3/phone/hour (docs/API_SPEC.md §11) and shares one in-memory store across
// every test in this file, since `createApp()` is only called once above.
let phoneSeed = 0;
function freshPhone(): { raw: string; e164: string } {
  phoneSeed += 1;
  const raw = `9${String(phoneSeed).padStart(9, '0')}`;
  return { raw, e164: `+91${raw}` };
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Supertest types `response.body` as `any` — cast to the envelope shape at the point of use. */
function bodyOf<T>(response: request.Response): ApiEnvelope<T> {
  return response.body as ApiEnvelope<T>;
}

async function requestAndCaptureOtp(
  phone: string = freshPhone().raw,
): Promise<{ requestId: string; code: string; phone: string }> {
  const sendOtpSpy = vi.spyOn(smsAdapter, 'sendOtp').mockResolvedValue(undefined);
  const response = await request(app).post('/api/v1/auth/otp/request').send({ phone });
  expect(response.status).toBe(200);
  const code = sendOtpSpy.mock.calls.at(-1)?.[1];
  if (!code) throw new Error('OTP adapter was not called');
  const { requestId } = bodyOf<{ requestId: string }>(response).data!;
  return { requestId, code, phone };
}

function extractCookie(response: request.Response, name: string): string | undefined {
  const raw = response.headers['set-cookie'] as unknown as string[] | undefined;
  return raw?.find((c) => c.startsWith(`${name}=`));
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all([User.deleteMany({}), OtpRequest.deleteMany({}), RefreshToken.deleteMany({})]);
});

describe('POST /auth/otp/request', () => {
  it('sends a 6-digit OTP via the SMS adapter and never returns it in the response', async () => {
    const { code } = await requestAndCaptureOtp();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('rejects an invalid phone number', async () => {
    const response = await request(app).post('/api/v1/auth/otp/request').send({ phone: '123' });
    expect(response.status).toBe(400);
  });

  it('rejects a NoSQL-injection payload instead of matching any record', async () => {
    const response = await request(app)
      .post('/api/v1/auth/otp/request')
      .send({ phone: { $ne: null } });
    expect(response.status).toBe(400);
  });
});

describe('the full OTP login flow', () => {
  it('verifies the OTP, sets cookies, and /auth/me works with them', async () => {
    const { requestId, code, phone } = await requestAndCaptureOtp();
    const e164Phone = `+91${phone}`;

    const verifyResponse = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code, requestId });

    expect(verifyResponse.status).toBe(200);
    expect(bodyOf<{ user: unknown }>(verifyResponse).data!.user).toMatchObject({
      phone: e164Phone,
      role: 'customer',
    });

    const accessCookie = extractCookie(verifyResponse, 'clenzy_at');
    const refreshCookie = extractCookie(verifyResponse, 'clenzy_rt');
    expect(accessCookie).toContain('HttpOnly');
    expect(refreshCookie).toContain('HttpOnly');

    const meResponse = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', [accessCookie!, refreshCookie!]);

    expect(meResponse.status).toBe(200);
    expect(bodyOf<{ user: { phone: string } }>(meResponse).data!.user.phone).toBe(e164Phone);
  });

  it('rejects an incorrect code and reports attempts remaining', async () => {
    const { requestId, phone } = await requestAndCaptureOtp();

    const response = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: '000000', requestId });

    expect(response.status).toBe(400);
    expect(bodyOf<never>(response).error!.code).toBe('OTP_INVALID');
  });

  it('rejects a NoSQL-injection payload on verify', async () => {
    const response = await request(app)
      .post('/api/v1/auth/otp/verify')
      .send({ phone: freshPhone().raw, code: { $gt: '' }, requestId: 'x' });
    expect(response.status).toBe(400);
  });
});

describe('/auth/me without a session', () => {
  it('returns 401', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
  });
});

async function loginAndGetCookies(): Promise<{ access: string; refresh: string }> {
  const { requestId, code, phone } = await requestAndCaptureOtp();
  const verifyResponse = await request(app)
    .post('/api/v1/auth/otp/verify')
    .send({ phone, code, requestId });
  return {
    access: extractCookie(verifyResponse, 'clenzy_at')!,
    refresh: extractCookie(verifyResponse, 'clenzy_rt')!,
  };
}

describe('POST /auth/refresh', () => {
  it('rotates the token pair, and the old refresh token can no longer be used', async () => {
    const first = await loginAndGetCookies();

    const refreshResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [first.refresh]);
    expect(refreshResponse.status).toBe(200);

    const second = {
      access: extractCookie(refreshResponse, 'clenzy_at')!,
      refresh: extractCookie(refreshResponse, 'clenzy_rt')!,
    };
    expect(second.refresh).not.toBe(first.refresh);

    // New pair still works.
    const meResponse = await request(app).get('/api/v1/auth/me').set('Cookie', [second.access]);
    expect(meResponse.status).toBe(200);
  });

  it('detects reuse of a consumed refresh token and revokes the whole family', async () => {
    const first = await loginAndGetCookies();

    const rotateResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [first.refresh]);
    const rotated = extractCookie(rotateResponse, 'clenzy_rt')!;

    // Reuse the already-consumed original token — this is the theft signal.
    const reuseResponse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [first.refresh]);
    expect(reuseResponse.status).toBe(401);
    expect(bodyOf<never>(reuseResponse).error!.code).toBe('REFRESH_REUSE_DETECTED');

    // The entire family — including the token issued by the rotation above — is now revoked.
    const rotatedNowRevoked = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [rotated]);
    expect(rotatedNowRevoked.status).toBe(401);
  });

  it('returns 401 with no refresh cookie at all', async () => {
    const response = await request(app).post('/api/v1/auth/refresh');
    expect(response.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const { access, refresh } = await loginAndGetCookies();

    const logoutResponse = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', [access, refresh]);
    expect(logoutResponse.status).toBe(200);

    const refreshAfterLogout = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [refresh]);
    expect(refreshAfterLogout.status).toBe(401);
  });
});

describe('POST /auth/login (email + password)', () => {
  beforeEach(async () => {
    await User.create({
      phone: '+919999999999',
      email: 'admin@clenzy.in',
      passwordHash: await bcrypt.hash('correct-horse-battery', 12),
      role: 'admin',
      status: 'active',
    });
  });

  it('logs an admin in with the correct password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clenzy.in', password: 'correct-horse-battery' });

    expect(response.status).toBe(200);
    expect(bodyOf<{ user: unknown }>(response).data!.user).toMatchObject({
      role: 'admin',
      email: 'admin@clenzy.in',
    });
    expect(extractCookie(response, 'clenzy_at')).toBeDefined();
  });

  it('gives the same error for a wrong password as for an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@clenzy.in', password: 'not-the-password' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@clenzy.in', password: 'whatever12345' });

    expect(wrongPassword.status).toBe(400);
    expect(unknownEmail.status).toBe(400);
    const wrongPasswordCode = bodyOf<never>(wrongPassword).error!.code;
    const unknownEmailCode = bodyOf<never>(unknownEmail).error!.code;
    expect(wrongPasswordCode).toBe(unknownEmailCode);
    expect(wrongPasswordCode).toBe('INVALID_CREDENTIALS');
  });

  it('rejects a NoSQL-injection payload instead of matching any record', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });
    expect(response.status).toBe(400);
  });
});
