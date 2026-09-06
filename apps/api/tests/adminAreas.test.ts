import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
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
async function createUserWithRole(role: 'customer' | 'staff' | 'admin') {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9196${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

function validAreaPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    area: 'Test Area',
    slug: `test-area-${Date.now()}`,
    pincodes: ['190001'],
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all([User.deleteMany({}), ServiceArea.deleteMany({}), AuditLog.deleteMany({})]);
});

describe('admin area role gating', () => {
  it('lets staff read but rejects staff mutations', async () => {
    const staff = await createUserWithRole('staff');
    const list = await request(app).get('/api/v1/admin/areas').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/v1/admin/areas')
      .set('Cookie', staff.cookie)
      .send(validAreaPayload());
    expect(create.status).toBe(403);
  });
});

describe('POST /admin/areas', () => {
  it('creates an area', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/areas')
      .set('Cookie', admin.cookie)
      .send(validAreaPayload());
    expect(response.status).toBe(201);
    expect(await AuditLog.countDocuments({ action: 'area.create' })).toBe(1);
  });

  it('rejects a pincode already assigned to another area', async () => {
    const admin = await createUserWithRole('admin');
    await request(app)
      .post('/api/v1/admin/areas')
      .set('Cookie', admin.cookie)
      .send(validAreaPayload({ pincodes: ['190008'] }));

    const response = await request(app)
      .post('/api/v1/admin/areas')
      .set('Cookie', admin.cookie)
      .send(validAreaPayload({ slug: `other-area-${Date.now()}`, pincodes: ['190008'] }));

    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('PINCODE_ALREADY_ASSIGNED');
  });
});

describe('PATCH /admin/areas/:id/availability (pause area)', () => {
  it('toggles pickup/delivery availability independently', async () => {
    const admin = await createUserWithRole('admin');
    const area = await ServiceArea.create(validAreaPayload());

    const response = await request(app)
      .patch(`/api/v1/admin/areas/${String(area._id)}/availability`)
      .set('Cookie', admin.cookie)
      .send({ pickupAvailable: false });

    expect(response.status).toBe(200);
    const updated = await ServiceArea.findById(area._id);
    expect(updated!.pickupAvailable).toBe(false);
    expect(updated!.deliveryAvailable).toBe(true);
  });

  it('a paused area is reported unserviceable by GET /areas/check', async () => {
    const admin = await createUserWithRole('admin');
    const area = await ServiceArea.create(validAreaPayload({ pincodes: ['190009'] }));

    const beforePause = await request(app).get('/api/v1/areas/check').query({ pincode: '190009' });
    expect(bodyOf<{ serviceable: boolean }>(beforePause).data!.serviceable).toBe(true);

    await request(app)
      .patch(`/api/v1/admin/areas/${String(area._id)}/availability`)
      .set('Cookie', admin.cookie)
      .send({ pickupAvailable: false });

    const afterPause = await request(app).get('/api/v1/areas/check').query({ pincode: '190009' });
    expect(bodyOf<{ serviceable: boolean }>(afterPause).data!.serviceable).toBe(false);
  });
});

describe('PATCH/DELETE /admin/areas/:id', () => {
  it('updates area fields', async () => {
    const admin = await createUserWithRole('admin');
    const area = await ServiceArea.create(validAreaPayload());

    const response = await request(app)
      .patch(`/api/v1/admin/areas/${String(area._id)}`)
      .set('Cookie', admin.cookie)
      .send({ deliveryFee: 9900 });

    expect(response.status).toBe(200);
    expect((await ServiceArea.findById(area._id))!.deliveryFee).toBe(9900);
  });

  it('deactivates rather than deletes', async () => {
    const admin = await createUserWithRole('admin');
    const area = await ServiceArea.create(validAreaPayload());

    const response = await request(app)
      .delete(`/api/v1/admin/areas/${String(area._id)}`)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const stillExists = await ServiceArea.findById(area._id);
    expect(stillExists).not.toBeNull();
    expect(stillExists!.isActive).toBe(false);
  });
});
