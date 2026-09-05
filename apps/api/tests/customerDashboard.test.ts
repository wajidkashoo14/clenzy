import type { OrderPayload, PlaceOrderInput } from '@clenzy/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Address } from '../src/models/Address.js';
import { Order } from '../src/models/Order.js';
import { Review } from '../src/models/Review.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { ServiceItem } from '../src/models/ServiceItem.js';
import { SlotTemplate } from '../src/models/SlotTemplate.js';
import { User } from '../src/models/User.js';
import { changeStatus } from '../src/services/orderStatus.service.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { addDaysToDateString, dayOfWeekOfDateString, nowInKolkata } from '../src/utils/timezone.js';

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
async function createCustomer() {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9198${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role: 'customer',
  });
  const token = signAccessToken(String(user._id), 'customer');
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

async function placeCodOrder(customer: { id: string; cookie: string }) {
  const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const area = await ServiceArea.create({
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    area: 'Test Area',
    slug: `test-area-${Date.now()}-${Math.random()}`,
    pincodes: [pincode],
    isActive: true,
  });
  const address = await Address.create({
    userId: customer.id,
    label: 'home',
    contactName: 'Test Customer',
    contactPhone: '+919000000001',
    line1: '123 Test Lane',
    area: 'Test Area',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode,
    serviceAreaId: area._id,
    isDefault: true,
  });
  const category = await ServiceCategory.create({
    name: 'Test Category',
    slug: `test-category-${Date.now()}-${Math.random()}`,
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
    slug: `test-shirt-${Date.now()}-${Math.random()}`,
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

  const input: PlaceOrderInput = {
    items: [{ serviceItemId: String(item._id), quantity: 1 }],
    pickupAddressId: String(address._id),
    deliveryAddressId: String(address._id),
    pickupSlot: { date: pickupDate, window: '09:00-11:00' },
    deliverySlot: { date: deliveryDate, window: '16:00-18:00' },
    isExpress: false,
    paymentMethod: 'cod',
    idempotencyKey: randomUUID(),
  };
  const response = await request(app)
    .post('/api/v1/orders')
    .set('Cookie', customer.cookie)
    .send(input);
  expect(response.status).toBe(201);
  return bodyOf<{ order: OrderPayload }>(response).data!.order;
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    ServiceArea.deleteMany({}),
    Address.deleteMany({}),
    ServiceCategory.deleteMany({}),
    ServiceItem.deleteMany({}),
    SlotTemplate.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
  ]);
});

describe('GET /orders — pagination and filters', () => {
  it('paginates a customer’s own order history', async () => {
    const customer = await createCustomer();
    await placeCodOrder(customer);
    await placeCodOrder(customer);
    await placeCodOrder(customer);

    const page1 = await request(app)
      .get('/api/v1/orders?page=1&pageSize=2')
      .set('Cookie', customer.cookie);
    expect(page1.status).toBe(200);
    const data1 = bodyOf<{ orders: OrderPayload[]; total: number; page: number; pageSize: number }>(
      page1,
    ).data!;
    expect(data1.orders).toHaveLength(2);
    expect(data1.total).toBe(3);

    const page2 = await request(app)
      .get('/api/v1/orders?page=2&pageSize=2')
      .set('Cookie', customer.cookie);
    const data2 = bodyOf<{ orders: OrderPayload[] }>(page2).data!;
    expect(data2.orders).toHaveLength(1);
  });

  it('filters by status', async () => {
    const customer = await createCustomer();
    const order = await placeCodOrder(customer);
    await placeCodOrder(customer);
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    await changeStatus(orderDoc!, 'CONFIRMED', 'staff');

    const response = await request(app)
      .get('/api/v1/orders?status=CONFIRMED')
      .set('Cookie', customer.cookie);
    const data = bodyOf<{ orders: OrderPayload[]; total: number }>(response).data!;
    expect(data.total).toBe(1);
    expect(data.orders[0]!.orderNumber).toBe(order.orderNumber);
  });

  it('never returns another customer’s orders', async () => {
    const customerA = await createCustomer();
    const customerB = await createCustomer();
    await placeCodOrder(customerA);

    const response = await request(app).get('/api/v1/orders').set('Cookie', customerB.cookie);
    const data = bodyOf<{ orders: OrderPayload[]; total: number }>(response).data!;
    expect(data.total).toBe(0);
  });
});

describe('GET /orders/:orderNumber/invoice', () => {
  it('returns a PDF for the order owner', async () => {
    const customer = await createCustomer();
    const order = await placeCodOrder(customer);

    const response = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}/invoice`)
      .set('Cookie', customer.cookie)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    const buffer = response.body as Buffer;
    expect(buffer.subarray(0, 4).toString('utf-8')).toBe('%PDF');
  });

  it('refuses to generate an invoice for another customer’s order', async () => {
    const owner = await createCustomer();
    const intruder = await createCustomer();
    const order = await placeCodOrder(owner);

    const response = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}/invoice`)
      .set('Cookie', intruder.cookie);
    expect(response.status).toBe(404);
  });
});

describe('POST /orders/:orderNumber/review', () => {
  async function deliverOrder(order: OrderPayload) {
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    for (const status of [
      'CONFIRMED',
      'PICKUP_SCHEDULED',
      'PICKED_UP',
      'PROCESSING',
      'QUALITY_CHECK',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ] as const) {
      await changeStatus(orderDoc!, status, 'staff');
    }
  }

  it('rejects a review before the order is delivered', async () => {
    const customer = await createCustomer();
    const order = await placeCodOrder(customer);

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/review`)
      .set('Cookie', customer.cookie)
      .send({ rating: 5 });
    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('REVIEW_NOT_ALLOWED');
  });

  it('accepts a review once delivered and rejects a second one for the same order', async () => {
    const customer = await createCustomer();
    const order = await placeCodOrder(customer);
    await deliverOrder(order);

    const first = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/review`)
      .set('Cookie', customer.cookie)
      .send({ rating: 4, comment: 'Good service' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/review`)
      .set('Cookie', customer.cookie)
      .send({ rating: 5 });
    expect(second.status).toBe(409);
    expect(bodyOf(second).error!.code).toBe('ALREADY_REVIEWED');
  });

  it('rejects a rating outside 1-5', async () => {
    const customer = await createCustomer();
    const order = await placeCodOrder(customer);
    await deliverOrder(order);

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/review`)
      .set('Cookie', customer.cookie)
      .send({ rating: 6 });
    expect(response.status).toBe(400);
  });

  it('cannot review another customer’s order', async () => {
    const owner = await createCustomer();
    const intruder = await createCustomer();
    const order = await placeCodOrder(owner);
    await deliverOrder(order);

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/review`)
      .set('Cookie', intruder.cookie)
      .send({ rating: 3 });
    expect(response.status).toBe(404);
  });
});

describe('PATCH /users/me', () => {
  it('updates name and notification preferences', async () => {
    const customer = await createCustomer();

    const response = await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', customer.cookie)
      .send({ name: 'Updated Name', notificationPrefs: { sms: false } });
    expect(response.status).toBe(200);
    const user = bodyOf<{
      user: { name: string; notificationPrefs: { sms: boolean; email: boolean } };
    }>(response).data!.user;
    expect(user.name).toBe('Updated Name');
    expect(user.notificationPrefs.sms).toBe(false);
    expect(user.notificationPrefs.email).toBe(true);
  });

  it('rejects setting an email already used by another account', async () => {
    const customerA = await createCustomer();
    const customerB = await createCustomer();
    await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', customerA.cookie)
      .send({ email: 'shared@example.com' });

    const response = await request(app)
      .patch('/api/v1/users/me')
      .set('Cookie', customerB.cookie)
      .send({ email: 'shared@example.com' });
    expect(response.status).toBe(409);
    expect(bodyOf(response).error!.code).toBe('EMAIL_TAKEN');
  });

  it('GET /users/me returns the current profile', async () => {
    const customer = await createCustomer();
    const response = await request(app).get('/api/v1/users/me').set('Cookie', customer.cookie);
    expect(response.status).toBe(200);
    expect(bodyOf<{ user: { id: string } }>(response).data!.user.id).toBe(customer.id);
  });
});
