import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
import { SlotCapacity } from '../src/models/SlotCapacity.js';
import { SlotTemplate } from '../src/models/SlotTemplate.js';
import { User } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { addDaysToDateString, dayOfWeekOfDateString, nowInKolkata } from '../src/utils/timezone.js';

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

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    ServiceArea.deleteMany({}),
    SlotTemplate.deleteMany({}),
    SlotCapacity.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('admin slot role gating', () => {
  it('lets staff read but rejects staff mutations', async () => {
    const staff = await createUserWithRole('staff');
    const list = await request(app)
      .get('/api/v1/admin/slots/templates')
      .set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/v1/admin/slots/templates')
      .set('Cookie', staff.cookie)
      .send({ type: 'pickup', dayOfWeek: 1, window: '09:00-11:00', label: '9-11', capacity: 15 });
    expect(create.status).toBe(403);
  });
});

describe('POST/PATCH/DELETE /admin/slots/templates', () => {
  it('creates, updates, and deactivates a template', async () => {
    const admin = await createUserWithRole('admin');

    const created = await request(app)
      .post('/api/v1/admin/slots/templates')
      .set('Cookie', admin.cookie)
      .send({ type: 'pickup', dayOfWeek: 1, window: '09:00-11:00', label: '9-11', capacity: 15 });
    expect(created.status).toBe(201);
    const id = bodyOf<{ template: { _id: string } }>(created).data!.template._id;

    const updated = await request(app)
      .patch(`/api/v1/admin/slots/templates/${id}`)
      .set('Cookie', admin.cookie)
      .send({ capacity: 20 });
    expect(updated.status).toBe(200);
    expect((await SlotTemplate.findById(id))!.capacity).toBe(20);

    const deactivated = await request(app)
      .delete(`/api/v1/admin/slots/templates/${id}`)
      .set('Cookie', admin.cookie);
    expect(deactivated.status).toBe(200);
    expect((await SlotTemplate.findById(id))!.isActive).toBe(false);
    expect(await AuditLog.countDocuments({ entityType: 'SlotTemplate' })).toBe(3);
  });
});

describe('GET/PATCH /admin/slots/capacity', () => {
  it('overriding capacity is reflected in the same calendar the customer-facing /slots endpoint reads', async () => {
    const admin = await createUserWithRole('admin');
    const area = await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Test Area',
      slug: `test-area-${Date.now()}`,
      pincodes: ['190001'],
      isActive: true,
    });
    const tomorrow = addDaysToDateString(nowInKolkata().dateString, 1);
    await SlotTemplate.create({
      type: 'pickup',
      dayOfWeek: dayOfWeekOfDateString(tomorrow),
      window: '09:00-11:00',
      label: '9-11',
      capacity: 15,
      cutoffMinutesBefore: 0,
      isActive: true,
      areaIds: [],
    });

    const beforeOverride = await request(app)
      .get('/api/v1/admin/slots/capacity')
      .set('Cookie', admin.cookie)
      .query({ type: 'pickup', areaId: String(area._id), from: tomorrow, days: 1 });
    expect(beforeOverride.status).toBe(200);
    expect(
      bodyOf<{ dates: { windows: { capacity: number }[] }[] }>(beforeOverride).data!.dates[0]!
        .windows[0]!.capacity,
    ).toBe(15);

    const override = await request(app)
      .patch('/api/v1/admin/slots/capacity')
      .set('Cookie', admin.cookie)
      .send({
        date: tomorrow,
        window: '09:00-11:00',
        type: 'pickup',
        areaId: String(area._id),
        capacity: 0,
      });
    expect(override.status).toBe(200);

    const afterOverride = await request(app)
      .get('/api/v1/admin/slots/capacity')
      .set('Cookie', admin.cookie)
      .query({ type: 'pickup', areaId: String(area._id), from: tomorrow, days: 1 });
    const window = bodyOf<{
      dates: { windows: { capacity: number; available: number; disabled: boolean }[] }[];
    }>(afterOverride).data!.dates[0]!.windows[0]!;
    expect(window.capacity).toBe(0);
    expect(window.available).toBe(0);
    expect(window.disabled).toBe(true);
  });

  it('rejects overriding a slot with no matching template', async () => {
    const admin = await createUserWithRole('admin');
    const area = await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Test Area 2',
      slug: `test-area-2-${Date.now()}`,
      pincodes: ['190002'],
      isActive: true,
    });

    const response = await request(app)
      .patch('/api/v1/admin/slots/capacity')
      .set('Cookie', admin.cookie)
      .send({
        date: '2026-06-01',
        window: '09:00-11:00',
        type: 'pickup',
        areaId: String(area._id),
        capacity: 5,
      });

    expect(response.status).toBe(404);
  });
});
