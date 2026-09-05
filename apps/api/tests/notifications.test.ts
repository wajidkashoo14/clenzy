import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Notification } from '../src/models/Notification.js';
import { NotificationSettings } from '../src/models/NotificationSettings.js';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';
import { sendNotification } from '../src/services/notifications/notificationService.js';
import { retryFailedNotifications } from '../src/jobs/retryFailedNotifications.js';
import { signAccessToken } from '../src/utils/tokens.js';

const app = createApp();

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; [key: string]: unknown };
}
function bodyOf<T>(response: request.Response): ApiEnvelope<T> {
  return response.body as ApiEnvelope<T>;
}

let phoneSeed = 0;
async function createUserWithRole(
  role: 'customer' | 'staff' | 'admin',
  overrides: Partial<{
    email: string;
    phoneVerified: boolean;
    notificationPrefs: Record<string, boolean>;
  }> = {},
) {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9197${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: overrides.phoneVerified ?? true,
    email: overrides.email,
    role,
    ...(overrides.notificationPrefs ? { notificationPrefs: overrides.notificationPrefs } : {}),
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Notification.deleteMany({}),
    NotificationSettings.deleteMany({}),
    Order.deleteMany({}),
  ]);
});

describe('sendNotification — channel resolution', () => {
  it('writes in-app, email, and sms rows for an event the matrix allows on all three', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    await sendNotification({
      userId: user.id,
      type: 'order_placed',
      orderId: undefined,
      data: {
        orderNumber: 'CLZ-TEST-0001',
        pickupDate: '2026-09-05',
        pickupWindow: '09:00-11:00',
        grandTotal: 42900,
        paymentMethod: 'cod',
      },
    });

    const rows = await Notification.find({ userId: user.id }).lean();
    const channels = rows.map((r) => r.channel).sort();
    expect(channels).toEqual(['email', 'in_app', 'sms']);

    const inApp = rows.find((r) => r.channel === 'in_app')!;
    expect(inApp.status).toBe('sent');
    expect((inApp.data as { orderNumber: string }).orderNumber).toBe('CLZ-TEST-0001');

    const email = rows.find((r) => r.channel === 'email')!;
    expect(email.status).toBe('sent');

    // No DLT template registered in this environment — see config/notifications.ts.
    const sms = rows.find((r) => r.channel === 'sms')!;
    expect(sms.status).toBe('failed');
    expect(sms.error).toBe('NO_DLT_TEMPLATE');
    expect(sms.nextRetryAt).toBeUndefined();
  });

  it('writes only an in-app row for an event the matrix marks in-app only', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    await sendNotification({
      userId: user.id,
      type: 'order_confirmed',
      data: { orderNumber: 'CLZ-TEST-0002' },
    });

    const rows = await Notification.find({ userId: user.id }).lean();
    expect(rows.map((r) => r.channel)).toEqual(['in_app']);
  });

  it('skips email when the user has none on file, even though the matrix allows it', async () => {
    const user = await createUserWithRole('customer');
    await sendNotification({
      userId: user.id,
      type: 'signup_welcome',
      data: { name: 'Test' },
    });

    const rows = await Notification.find({ userId: user.id }).lean();
    expect(rows.map((r) => r.channel)).toEqual(['in_app']);
  });

  it('respects a user opting out of sms', async () => {
    const user = await createUserWithRole('customer', {
      email: 'a@example.com',
      notificationPrefs: { email: true, sms: false, whatsapp: true, push: true, marketing: false },
    });
    await sendNotification({
      userId: user.id,
      type: 'order_placed',
      data: {
        orderNumber: 'CLZ-TEST-0003',
        pickupDate: '2026-09-05',
        pickupWindow: '9-11',
        grandTotal: 1000,
        paymentMethod: 'cod',
      },
    });

    const rows = await Notification.find({ userId: user.id }).lean();
    expect(rows.map((r) => r.channel).sort()).toEqual(['email', 'in_app']);
  });

  it('respects an unverified phone by skipping sms regardless of prefs', async () => {
    const user = await createUserWithRole('customer', {
      email: 'a@example.com',
      phoneVerified: false,
    });
    await sendNotification({
      userId: user.id,
      type: 'order_placed',
      data: {
        orderNumber: 'CLZ-TEST-0004',
        pickupDate: '2026-09-05',
        pickupWindow: '9-11',
        grandTotal: 1000,
        paymentMethod: 'cod',
      },
    });

    const rows = await Notification.find({ userId: user.id }).lean();
    expect(rows.map((r) => r.channel).sort()).toEqual(['email', 'in_app']);
  });

  it('respects an admin channel toggle disabling email for an event', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    await NotificationSettings.findByIdAndUpdate(
      'global',
      { $set: { 'toggles.order_placed.email': false } },
      { upsert: true },
    );

    await sendNotification({
      userId: user.id,
      type: 'order_placed',
      data: {
        orderNumber: 'CLZ-TEST-0005',
        pickupDate: '2026-09-05',
        pickupWindow: '9-11',
        grandTotal: 1000,
        paymentMethod: 'cod',
      },
    });

    const rows = await Notification.find({ userId: user.id }).lean();
    expect(rows.map((r) => r.channel).sort()).toEqual(['in_app', 'sms']);
  });

  it('never throws even when the user does not exist — a broken notification cannot break the caller', async () => {
    await expect(
      sendNotification({
        userId: '000000000000000000000000',
        type: 'order_confirmed',
        data: { orderNumber: 'X' },
      }),
    ).resolves.toBeUndefined();
    expect(await Notification.countDocuments({})).toBe(0);
  });
});

describe('retryFailedNotifications', () => {
  it('retries a due, under-the-cap failed email and marks it sent', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    const notification = await Notification.create({
      userId: user.id,
      type: 'order_placed',
      channel: 'email',
      title: 'Test',
      body: 'Test',
      data: { html: '<p>hi</p>' },
      status: 'failed',
      error: 'transient',
      attempts: 1,
      nextRetryAt: new Date(Date.now() - 1000),
    });

    const result = await retryFailedNotifications();
    expect(result.retried).toBe(1);

    const updated = await Notification.findById(notification._id).lean();
    expect(updated?.status).toBe('sent');
  });

  it('does not retry a notification whose nextRetryAt is in the future', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    await Notification.create({
      userId: user.id,
      type: 'order_placed',
      channel: 'email',
      title: 'Test',
      body: 'Test',
      status: 'failed',
      attempts: 1,
      nextRetryAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    const result = await retryFailedNotifications();
    expect(result.retried).toBe(0);
  });

  it('gives up after the max attempt count without retrying further', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    await Notification.create({
      userId: user.id,
      type: 'order_placed',
      channel: 'email',
      title: 'Test',
      body: 'Test',
      status: 'failed',
      attempts: 3,
      nextRetryAt: new Date(Date.now() - 1000),
    });

    const result = await retryFailedNotifications();
    expect(result.retried).toBe(0);
    expect(result.gaveUp).toBe(0);
  });

  it('never retries a notification stuck on a missing DLT template', async () => {
    const user = await createUserWithRole('customer', { email: 'a@example.com' });
    await Notification.create({
      userId: user.id,
      type: 'order_placed',
      channel: 'sms',
      title: 'Test',
      body: 'Test',
      status: 'failed',
      error: 'NO_DLT_TEMPLATE',
      attempts: 0,
      nextRetryAt: new Date(Date.now() - 1000),
    });

    const result = await retryFailedNotifications();
    expect(result.retried).toBe(0);
  });
});

describe('in-app notification endpoints', () => {
  it('lists notifications and reports an accurate unread count', async () => {
    const user = await createUserWithRole('customer');
    await Notification.create([
      {
        userId: user.id,
        type: 'order_confirmed',
        channel: 'in_app',
        title: 'A',
        body: 'A',
        status: 'sent',
      },
      {
        userId: user.id,
        type: 'order_confirmed',
        channel: 'in_app',
        title: 'B',
        body: 'B',
        status: 'sent',
      },
    ]);

    const countResponse = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Cookie', user.cookie);
    expect(bodyOf<{ count: number }>(countResponse).data!.count).toBe(2);

    const listResponse = await request(app).get('/api/v1/notifications').set('Cookie', user.cookie);
    expect(bodyOf<{ total: number }>(listResponse).data!.total).toBe(2);
  });

  it('marks a single notification read and excludes it from unreadOnly listings', async () => {
    const user = await createUserWithRole('customer');
    const [notification] = await Notification.create([
      {
        userId: user.id,
        type: 'order_confirmed',
        channel: 'in_app',
        title: 'A',
        body: 'A',
        status: 'sent',
      },
    ]);

    const response = await request(app)
      .patch(`/api/v1/notifications/${String(notification!._id)}/read`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(200);

    const unreadOnly = await request(app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set('Cookie', user.cookie);
    expect(bodyOf<{ total: number }>(unreadOnly).data!.total).toBe(0);
  });

  it('cannot mark another user’s notification as read', async () => {
    const owner = await createUserWithRole('customer');
    const intruder = await createUserWithRole('customer');
    const [notification] = await Notification.create([
      {
        userId: owner.id,
        type: 'order_confirmed',
        channel: 'in_app',
        title: 'A',
        body: 'A',
        status: 'sent',
      },
    ]);

    const response = await request(app)
      .patch(`/api/v1/notifications/${String(notification!._id)}/read`)
      .set('Cookie', intruder.cookie);
    expect(response.status).toBe(404);
  });

  it('marks all notifications read in one call', async () => {
    const user = await createUserWithRole('customer');
    await Notification.create([
      {
        userId: user.id,
        type: 'order_confirmed',
        channel: 'in_app',
        title: 'A',
        body: 'A',
        status: 'sent',
      },
      {
        userId: user.id,
        type: 'order_confirmed',
        channel: 'in_app',
        title: 'B',
        body: 'B',
        status: 'sent',
      },
    ]);

    await request(app).patch('/api/v1/notifications/read-all').set('Cookie', user.cookie);
    const count = await Notification.countDocuments({
      userId: user.id,
      readAt: { $exists: false },
    });
    expect(count).toBe(0);
  });

  it('updates notification preferences', async () => {
    const user = await createUserWithRole('customer');
    const response = await request(app)
      .patch('/api/v1/notifications/preferences')
      .set('Cookie', user.cookie)
      .send({ sms: false, marketing: true });
    expect(response.status).toBe(200);

    const updated = await User.findById(user.id).lean();
    expect(updated?.notificationPrefs.sms).toBe(false);
    expect(updated?.notificationPrefs.marketing).toBe(true);
    expect(updated?.notificationPrefs.email).toBe(true);
  });
});

describe('admin notification settings', () => {
  it('rejects a staff token — this endpoint is admin-only', async () => {
    const staff = await createUserWithRole('staff');
    const response = await request(app)
      .get('/api/v1/admin/notifications/settings')
      .set('Cookie', staff.cookie);
    expect(response.status).toBe(403);
  });

  it('lets an admin toggle a channel and reads it back', async () => {
    const admin = await createUserWithRole('admin');

    const before = await request(app)
      .get('/api/v1/admin/notifications/settings')
      .set('Cookie', admin.cookie);
    expect(
      bodyOf<{ toggles: Record<string, { email: boolean; sms: boolean }> }>(before).data!.toggles
        .order_placed,
    ).toEqual({ email: true, sms: true });

    const update = await request(app)
      .patch('/api/v1/admin/notifications/settings')
      .set('Cookie', admin.cookie)
      .send({ type: 'order_placed', channel: 'sms', enabled: false });
    expect(update.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/admin/notifications/settings')
      .set('Cookie', admin.cookie);
    expect(
      bodyOf<{ toggles: Record<string, { email: boolean; sms: boolean }> }>(after).data!.toggles
        .order_placed,
    ).toEqual({ email: true, sms: false });
  });

  it('rejects toggling a channel an event has no matrix entry for', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .patch('/api/v1/admin/notifications/settings')
      .set('Cookie', admin.cookie)
      .send({ type: 'order_confirmed', channel: 'sms', enabled: false });
    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('NOT_TOGGLEABLE');
  });
});

describe('end-to-end: real lifecycle events trigger real notifications', () => {
  it('placing a COD order fires order_placed with a deep-linkable in-app record', async () => {
    // Minimal placement via direct model writes would skip too much business logic to be a
    // meaningful integration check — reuse the full checkout path via a tiny inline fixture set.
    const { ServiceArea } = await import('../src/models/ServiceArea.js');
    const { Address } = await import('../src/models/Address.js');
    const { ServiceCategory } = await import('../src/models/ServiceCategory.js');
    const { ServiceItem } = await import('../src/models/ServiceItem.js');
    const { SlotTemplate } = await import('../src/models/SlotTemplate.js');
    const { addDaysToDateString, dayOfWeekOfDateString, nowInKolkata } =
      await import('../src/utils/timezone.js');

    const user = await createUserWithRole('customer', { email: 'buyer@example.com' });
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const area = await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Test Area',
      slug: `test-area-${Date.now()}`,
      pincodes: [pincode],
      isActive: true,
    });
    const address = await Address.create({
      userId: user.id,
      label: 'home',
      contactName: 'Test',
      contactPhone: '+919000000001',
      line1: '1 Test Lane',
      area: 'Test Area',
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      pincode,
      serviceAreaId: area._id,
      isDefault: true,
    });
    const category = await ServiceCategory.create({
      name: 'Test Category',
      slug: `test-category-${Date.now()}`,
      description: 'd',
      shortDescription: 'sd',
      icon: 'Shirt',
      turnaroundHours: 48,
      expressAvailable: true,
      isActive: true,
    });
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Test Shirt',
      slug: `test-shirt-${Date.now()}`,
      unit: 'piece',
      price: 40_000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
    });
    const today = nowInKolkata().dateString;
    const pickupDate = addDaysToDateString(today, 1);
    const deliveryDate = addDaysToDateString(today, 4);
    await SlotTemplate.create({
      type: 'pickup',
      dayOfWeek: dayOfWeekOfDateString(pickupDate),
      window: '09:00-11:00',
      label: '9-11',
      capacity: 15,
      cutoffMinutesBefore: 0,
      isActive: true,
      areaIds: [],
    });
    await SlotTemplate.create({
      type: 'delivery',
      dayOfWeek: dayOfWeekOfDateString(deliveryDate),
      window: '16:00-18:00',
      label: '4-6',
      capacity: 15,
      cutoffMinutesBefore: 0,
      isActive: true,
      areaIds: [],
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        pickupAddressId: String(address._id),
        deliveryAddressId: String(address._id),
        pickupSlot: { date: pickupDate, window: '09:00-11:00' },
        deliverySlot: { date: deliveryDate, window: '16:00-18:00' },
        isExpress: false,
        paymentMethod: 'cod',
        idempotencyKey: randomUUID(),
      });
    expect(response.status).toBe(201);
    const orderNumber = bodyOf<{ order: { orderNumber: string } }>(response).data!.order
      .orderNumber;

    // changeStatus fires notifyOrderStatusChange fire-and-forget — give the microtask queue a tick.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const rows = await Notification.find({ userId: user.id, type: 'order_placed' }).lean();
    expect(rows.map((r) => r.channel).sort()).toEqual(['email', 'in_app', 'sms']);
    const inApp = rows.find((r) => r.channel === 'in_app')!;
    expect((inApp.data as { orderNumber: string }).orderNumber).toBe(orderNumber);
  });
});
