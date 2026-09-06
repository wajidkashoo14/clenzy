import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Settings } from '../src/models/Settings.js';
import { User } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/tokens.js';

const app = createApp();

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}
function bodyOf<T>(response: request.Response): ApiEnvelope<T> {
  return response.body as ApiEnvelope<T>;
}

let phoneSeed = 0;
async function createUserWithRole(role: 'staff' | 'admin') {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9199${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Settings.deleteMany({}), AuditLog.deleteMany({})]);
});

describe('GET/PATCH /admin/settings', () => {
  it("is ADMIN only, unlike this router's STAFF+ read baseline", async () => {
    const staff = await createUserWithRole('staff');
    const response = await request(app).get('/api/v1/admin/settings').set('Cookie', staff.cookie);
    expect(response.status).toBe(403);
  });

  it('creates the singleton document with defaults on first read', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app).get('/api/v1/admin/settings').set('Cookie', admin.cookie);
    expect(response.status).toBe(200);
    expect(
      bodyOf<{ settings: { minOrderValue: number } }>(response).data!.settings.minOrderValue,
    ).toBe(29_900);
    expect(await Settings.countDocuments({})).toBe(1);
  });

  it('updates a field, keeps the rest, and audit-logs before/after', async () => {
    const admin = await createUserWithRole('admin');

    const response = await request(app)
      .patch('/api/v1/admin/settings')
      .set('Cookie', admin.cookie)
      .send({ minOrderValue: 39_900 });

    expect(response.status).toBe(200);
    const settings = await Settings.findById('singleton').lean();
    expect(settings!.minOrderValue).toBe(39_900);
    expect(settings!.deliveryFee).toBe(4_900);

    const log = await AuditLog.findOne({ action: 'settings.update' }).lean();
    expect((log!.before as { minOrderValue: number }).minOrderValue).toBe(29_900);
    expect((log!.after as { minOrderValue: number }).minOrderValue).toBe(39_900);
  });
});

describe('GET /content/settings/public', () => {
  it('exposes only the public subset', async () => {
    const admin = await createUserWithRole('admin');
    await request(app)
      .patch('/api/v1/admin/settings')
      .set('Cookie', admin.cookie)
      .send({ gstNumber: 'GSTIN12345' });

    const response = await request(app).get('/api/v1/content/settings/public');
    expect(response.status).toBe(200);
    const settings = bodyOf<Record<string, unknown>>(response).data!.settings as Record<
      string,
      unknown
    >;
    expect(settings.supportEmail).toBe('hello@clenzy.in');
    expect(settings.gstNumber).toBeUndefined();
    expect(settings.codMaxOrderValue).toBeUndefined();
  });
});
