import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
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
async function createUserWithRole(role: 'admin' | 'superadmin') {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9195${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

afterEach(async () => {
  await Promise.all([User.deleteMany({}), AuditLog.deleteMany({})]);
});

describe('GET /admin/audit-logs', () => {
  it('is SUPERADMIN only — an admin is forbidden', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app).get('/api/v1/admin/audit-logs').set('Cookie', admin.cookie);
    expect(response.status).toBe(403);
  });

  it('lists logs, newest first, filterable by entityType', async () => {
    const superadmin = await createUserWithRole('superadmin');
    await AuditLog.create({
      actorId: superadmin.id,
      actorRole: 'admin',
      action: 'area.create',
      entityType: 'ServiceArea',
      entityId: 'a1',
    });
    await AuditLog.create({
      actorId: superadmin.id,
      actorRole: 'admin',
      action: 'settings.update',
      entityType: 'Settings',
      entityId: 'singleton',
    });

    const response = await request(app)
      .get('/api/v1/admin/audit-logs')
      .query({ entityType: 'Settings' })
      .set('Cookie', superadmin.cookie);

    expect(response.status).toBe(200);
    const result = bodyOf<{ logs: { action: string }[]; total: number }>(response).data!;
    expect(result.total).toBe(1);
    expect(result.logs[0]!.action).toBe('settings.update');
  });
});
