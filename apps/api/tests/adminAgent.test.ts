import type { OrderPayload } from '@clenzy/shared';
import { Types } from 'mongoose';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Address } from '../src/models/Address.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponRedemption } from '../src/models/CouponRedemption.js';
import { Counter } from '../src/models/Counter.js';
import { Order } from '../src/models/Order.js';
import { Payment } from '../src/models/Payment.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { ServiceItem } from '../src/models/ServiceItem.js';
import { SlotCapacity } from '../src/models/SlotCapacity.js';
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
async function createUserWithRole(role: 'customer' | 'agent' | 'staff' | 'admin' | 'superadmin') {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9196${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
    name: role === 'agent' ? 'Agent Test' : undefined,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

async function createArea(pincode: string) {
  return ServiceArea.create({
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    area: 'Test Area',
    slug: `test-area-${Date.now()}-${Math.random()}`,
    pincodes: [pincode],
    isActive: true,
  });
}

async function createAddress(userId: string, areaId: unknown, pincode: string) {
  return Address.create({
    userId,
    label: 'home',
    contactName: 'Test Customer',
    contactPhone: '+919000000001',
    line1: '123 Test Lane',
    area: 'Test Area',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode,
    serviceAreaId: areaId,
    isDefault: true,
  });
}

async function createCategoryAndItem() {
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
  return { category, item };
}

async function createSlotTemplate(opts: {
  type: 'pickup' | 'delivery';
  date: string;
  window: string;
  capacity?: number;
}) {
  return SlotTemplate.create({
    type: opts.type,
    dayOfWeek: dayOfWeekOfDateString(opts.date),
    window: opts.window,
    label: opts.window,
    capacity: opts.capacity ?? 15,
    cutoffMinutesBefore: 0,
    isActive: true,
    areaIds: [],
  });
}

function futureDates(): { pickupDate: string; deliveryDate: string } {
  const today = nowInKolkata().dateString;
  return { pickupDate: addDaysToDateString(today, 1), deliveryDate: addDaysToDateString(today, 4) };
}

async function placeCodOrder() {
  const user = await createUserWithRole('customer');
  const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const area = await createArea(pincode);
  const address = await createAddress(user.id, area._id, pincode);
  const { item } = await createCategoryAndItem();
  const { pickupDate, deliveryDate } = futureDates();
  const pickupWindow = '09:00-11:00';
  const deliveryWindow = '16:00-18:00';
  await createSlotTemplate({ type: 'pickup', date: pickupDate, window: pickupWindow });
  await createSlotTemplate({ type: 'delivery', date: deliveryDate, window: deliveryWindow });

  const response = await request(app)
    .post('/api/v1/orders')
    .set('Cookie', user.cookie)
    .send({
      items: [{ serviceItemId: String(item._id), quantity: 1 }],
      pickupAddressId: String(address._id),
      deliveryAddressId: String(address._id),
      pickupSlot: { date: pickupDate, window: pickupWindow },
      deliverySlot: { date: deliveryDate, window: deliveryWindow },
      isExpress: false,
      paymentMethod: 'cod',
      idempotencyKey: randomUUID(),
    });
  expect(response.status).toBe(201);
  const order = bodyOf<{ order: OrderPayload }>(response).data!.order;
  return {
    user,
    area,
    address,
    item,
    order,
    pickupDate,
    deliveryDate,
    pickupWindow,
    deliveryWindow,
  };
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    ServiceArea.deleteMany({}),
    Address.deleteMany({}),
    ServiceCategory.deleteMany({}),
    ServiceItem.deleteMany({}),
    SlotTemplate.deleteMany({}),
    SlotCapacity.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Coupon.deleteMany({}),
    CouponRedemption.deleteMany({}),
    Counter.deleteMany({}),
  ]);
});

describe('admin route role gating', () => {
  const routes: { method: 'get' | 'patch' | 'post'; path: (id: string) => string }[] = [
    { method: 'get', path: () => '/api/v1/admin/orders' },
    { method: 'get', path: () => '/api/v1/admin/orders/roster?date=2026-01-01&type=pickup' },
    { method: 'get', path: (id) => `/api/v1/admin/orders/${id}` },
    { method: 'patch', path: (id) => `/api/v1/admin/orders/${id}/status` },
    { method: 'patch', path: (id) => `/api/v1/admin/orders/${id}/items` },
    { method: 'patch', path: (id) => `/api/v1/admin/orders/${id}/assign` },
    { method: 'patch', path: (id) => `/api/v1/admin/orders/${id}/slots` },
    { method: 'post', path: (id) => `/api/v1/admin/orders/${id}/notes` },
    { method: 'post', path: (id) => `/api/v1/admin/orders/${id}/cancel` },
    { method: 'post', path: (id) => `/api/v1/admin/orders/${id}/refund` },
  ];

  it('rejects a customer token on every admin route with 403', async () => {
    const customer = await createUserWithRole('customer');
    for (const route of routes) {
      const response = await request(app)
        [route.method](route.path('000000000000000000000000'))
        .set('Cookie', customer.cookie);
      expect(response.status, `${route.method.toUpperCase()} ${route.path('id')}`).toBe(403);
    }
  });

  it('rejects a staff token on the admin-only refund route with 403', async () => {
    const staff = await createUserWithRole('staff');
    const response = await request(app)
      .post('/api/v1/admin/orders/000000000000000000000000/refund')
      .set('Cookie', staff.cookie)
      .send({ amount: 100, reason: 'test' });
    expect(response.status).toBe(403);
  });
});

describe('admin order list and detail', () => {
  it('lists orders and fetches a single order by id', async () => {
    const staff = await createUserWithRole('staff');
    const { order } = await placeCodOrder();

    const list = await request(app).get('/api/v1/admin/orders').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);
    const listData = bodyOf<{ orders: { orderNumber: string }[]; total: number }>(list).data!;
    expect(listData.orders.some((o) => o.orderNumber === order.orderNumber)).toBe(true);

    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    const detail = await request(app)
      .get(`/api/v1/admin/orders/${String(orderDoc!._id)}`)
      .set('Cookie', staff.cookie);
    expect(detail.status).toBe(200);
    expect(bodyOf<{ order: { orderNumber: string } }>(detail).data!.order.orderNumber).toBe(
      order.orderNumber,
    );
  });

  it('filters the roster by date and type', async () => {
    const staff = await createUserWithRole('staff');
    const { order, pickupDate } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
    await changeStatus(orderDoc!, 'CONFIRMED', 'admin', { actorUserId: admin.id });

    const response = await request(app)
      .get(`/api/v1/admin/orders/roster?date=${pickupDate}&type=pickup`)
      .set('Cookie', staff.cookie);
    expect(response.status).toBe(200);
    const roster = bodyOf<{ orders: { orderNumber: string }[] }>(response).data!.orders;
    expect(roster.some((o) => o.orderNumber === order.orderNumber)).toBe(true);
  });
});

describe('PATCH /admin/orders/:id/status', () => {
  it('lets staff move an order through a legal transition', async () => {
    const staff = await createUserWithRole('staff');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/status`)
      .set('Cookie', staff.cookie)
      .send({ status: 'CONFIRMED', note: 'Verified manually' });

    expect(response.status).toBe(200);
    expect(bodyOf<{ order: { status: string } }>(response).data!.order.status).toBe('CONFIRMED');
  });

  it('rejects an illegal transition with 422 INVALID_STATUS_TRANSITION', async () => {
    const staff = await createUserWithRole('staff');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/status`)
      .set('Cookie', staff.cookie)
      .send({ status: 'DELIVERED' });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('rejects a status a customer is not permitted to set, even from staff-gated route misuse', async () => {
    const staff = await createUserWithRole('staff');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/status`)
      .set('Cookie', staff.cookie)
      .send({ status: 'NOT_A_REAL_STATUS' });

    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('INVALID_STATUS');
  });
});

describe('PATCH /admin/orders/:id/assign', () => {
  it('assigning a pickup agent to a CONFIRMED order auto-advances it to PICKUP_SCHEDULED', async () => {
    const staff = await createUserWithRole('staff');
    const agent = await createUserWithRole('agent');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    await changeStatus(orderDoc!, 'CONFIRMED', 'staff', { actorUserId: staff.id });

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/assign`)
      .set('Cookie', staff.cookie)
      .send({ type: 'pickup', agentId: agent.id });

    expect(response.status).toBe(200);
    const updated = bodyOf<{ order: { status: string } }>(response).data!.order;
    expect(updated.status).toBe('PICKUP_SCHEDULED');
  });

  it('rejects an agentId that is not a registered agent', async () => {
    const staff = await createUserWithRole('staff');
    const notAnAgent = await createUserWithRole('customer');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/assign`)
      .set('Cookie', staff.cookie)
      .send({ type: 'pickup', agentId: notAnAgent.id });

    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('INVALID_AGENT');
  });
});

describe('POST /admin/orders/:id/notes and cancel', () => {
  it('adds an internal note', async () => {
    const staff = await createUserWithRole('staff');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/notes`)
      .set('Cookie', staff.cookie)
      .send({ note: 'Customer called about a stain' });

    expect(response.status).toBe(201);
    const updated = bodyOf<{ order: { internalNotes: { note: string }[] } }>(response).data!.order;
    expect(updated.internalNotes.some((n) => n.note === 'Customer called about a stain')).toBe(
      true,
    );
  });

  it('cancels a COD order pre-pickup and releases its slot, without touching payment', async () => {
    const staff = await createUserWithRole('staff');
    const { order, pickupDate, pickupWindow } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/cancel`)
      .set('Cookie', staff.cookie)
      .send({ reason: 'Customer requested by phone' });

    expect(response.status).toBe(200);
    const cancelled = bodyOf<{
      order: { status: string; cancellation: { cancelledByRole: string } };
    }>(response).data!.order;
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellation.cancelledByRole).toBe('staff');

    const capacity = await SlotCapacity.findOne({
      date: pickupDate,
      window: pickupWindow,
      type: 'pickup',
    }).lean();
    expect(capacity?.booked).toBe(0);
  });

  it('normalizes superadmin cancellation to the admin role bucket', async () => {
    const superadmin = await createUserWithRole('superadmin');
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/cancel`)
      .set('Cookie', superadmin.cookie)
      .send({ reason: 'test' });

    expect(response.status).toBe(200);
    expect(
      bodyOf<{ order: { cancellation: { cancelledByRole: string } } }>(response).data!.order
        .cancellation.cancelledByRole,
    ).toBe('admin');
  });
});

describe('PATCH /admin/orders/:id/items', () => {
  it('applies a small price revision (<=10% increase) directly to the grand total', async () => {
    const staff = await createUserWithRole('staff');
    const { order, item } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const originalTotal = orderDoc!.pricing.grandTotal;

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/items`)
      .set('Cookie', staff.cookie)
      .send({
        items: [{ serviceItemId: String(item._id), quantity: 1, unitPrice: item.price + 100 }],
        reason: 'Minor adjustment',
      });

    expect(response.status).toBe(200);
    const updated = bodyOf<{ order: { pricing: { grandTotal: number }; priceRevision?: unknown } }>(
      response,
    ).data!.order;
    expect(updated.pricing.grandTotal).not.toBe(originalTotal);
    expect(updated.priceRevision).toBeUndefined();
  });

  it('holds a large price revision (>10% increase) for customer approval', async () => {
    const staff = await createUserWithRole('staff');
    const { order, item } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const originalTotal = orderDoc!.pricing.grandTotal;

    const response = await request(app)
      .patch(`/api/v1/admin/orders/${String(orderDoc!._id)}/items`)
      .set('Cookie', staff.cookie)
      .send({
        items: [{ serviceItemId: String(item._id), quantity: 5, unitPrice: item.price }],
        reason: 'Customer added items at pickup',
      });

    expect(response.status).toBe(200);
    const updated = bodyOf<{
      order: {
        pricing: { grandTotal: number };
        priceRevision?: { requiresApproval: boolean; revisedTotal: number };
      };
    }>(response).data!.order;
    expect(updated.pricing.grandTotal).toBe(originalTotal);
    expect(updated.priceRevision?.requiresApproval).toBe(true);
    expect(updated.priceRevision?.revisedTotal).toBeGreaterThan(originalTotal);
  });
});

describe('agent route role gating', () => {
  it('rejects a customer token on every agent route with 403', async () => {
    const customer = await createUserWithRole('customer');
    const routes: { method: 'get' | 'patch'; path: string }[] = [
      { method: 'get', path: '/api/v1/agent/tasks?date=2026-01-01' },
      { method: 'patch', path: '/api/v1/agent/tasks/ORD-0001/picked-up' },
      { method: 'patch', path: '/api/v1/agent/tasks/ORD-0001/delivered' },
      { method: 'patch', path: '/api/v1/agent/tasks/ORD-0001/failed' },
    ];
    for (const route of routes) {
      const response = await request(app)[route.method](route.path).set('Cookie', customer.cookie);
      expect(response.status, route.path).toBe(403);
    }
  });
});

describe('GET /agent/tasks', () => {
  it("lists only the agent's own assigned pickup and delivery tasks for the given date", async () => {
    const agent = await createUserWithRole('agent');
    const otherAgent = await createUserWithRole('agent');
    const { order, pickupDate } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    await changeStatus(orderDoc!, 'CONFIRMED', 'staff');
    orderDoc!.assignedPickupAgentId = new Types.ObjectId(agent.id);
    await changeStatus(orderDoc!, 'PICKUP_SCHEDULED', 'staff');

    const mine = await request(app)
      .get(`/api/v1/agent/tasks?date=${pickupDate}`)
      .set('Cookie', agent.cookie);
    expect(mine.status).toBe(200);
    const mineTasks = bodyOf<{ tasks: { orderNumber: string }[] }>(mine).data!.tasks;
    expect(mineTasks.some((t) => t.orderNumber === order.orderNumber)).toBe(true);

    const notMine = await request(app)
      .get(`/api/v1/agent/tasks?date=${pickupDate}`)
      .set('Cookie', otherAgent.cookie);
    const notMineTasks = bodyOf<{ tasks: { orderNumber: string }[] }>(notMine).data!.tasks;
    expect(notMineTasks.some((t) => t.orderNumber === order.orderNumber)).toBe(false);
  });
});

describe('agent task actions', () => {
  async function placeAndAssignForPickup(agentId: string) {
    const setup = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: setup.order.orderNumber });
    await changeStatus(orderDoc!, 'CONFIRMED', 'staff');
    orderDoc!.assignedPickupAgentId = new Types.ObjectId(agentId);
    await changeStatus(orderDoc!, 'PICKUP_SCHEDULED', 'staff');
    return { ...setup, orderDoc: orderDoc! };
  }

  it('marks a task picked up, advancing PICKUP_SCHEDULED to PICKED_UP', async () => {
    const agent = await createUserWithRole('agent');
    const { order } = await placeAndAssignForPickup(agent.id);

    const response = await request(app)
      .patch(`/api/v1/agent/tasks/${order.orderNumber}/picked-up`)
      .set('Cookie', agent.cookie)
      .send({});
    expect(response.status).toBe(200);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PICKED_UP');
  });

  it('rejects marking a task picked up when the order is assigned to a different agent', async () => {
    const agent = await createUserWithRole('agent');
    const otherAgent = await createUserWithRole('agent');
    const { order } = await placeAndAssignForPickup(agent.id);

    const response = await request(app)
      .patch(`/api/v1/agent/tasks/${order.orderNumber}/picked-up`)
      .set('Cookie', otherAgent.cookie)
      .send({});
    expect(response.status).toBe(404);
  });

  it('auto-cancels the order after 2 failed pickup attempts', async () => {
    const agent = await createUserWithRole('agent');
    const { order } = await placeAndAssignForPickup(agent.id);

    const first = await request(app)
      .patch(`/api/v1/agent/tasks/${order.orderNumber}/failed`)
      .set('Cookie', agent.cookie)
      .send({ type: 'pickup', reason: 'Customer not home' });
    expect(first.status).toBe(200);
    let current = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(current?.status).toBe('PICKUP_FAILED');

    // Reschedule keeps it assigned to the same agent and returns it to PICKUP_SCHEDULED.
    await Order.updateOne(
      { orderNumber: order.orderNumber },
      { $set: { status: 'PICKUP_SCHEDULED' } },
    );

    const second = await request(app)
      .patch(`/api/v1/agent/tasks/${order.orderNumber}/failed`)
      .set('Cookie', agent.cookie)
      .send({ type: 'pickup', reason: 'Customer not home again' });
    expect(second.status).toBe(200);
    current = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(current?.status).toBe('CANCELLED');
    expect(current?.failedPickupAttempts).toBe(2);
  });

  it('marks a delivery task delivered, advancing OUT_FOR_DELIVERY to DELIVERED', async () => {
    const agent = await createUserWithRole('agent');
    const { order, orderDoc } = await placeAndAssignForPickup(agent.id);
    for (const status of ['PICKED_UP', 'PROCESSING', 'QUALITY_CHECK', 'READY'] as const) {
      await changeStatus(orderDoc, status, 'staff');
    }
    orderDoc.assignedDeliveryAgentId = orderDoc.assignedPickupAgentId;
    await changeStatus(orderDoc, 'OUT_FOR_DELIVERY', 'staff');

    const response = await request(app)
      .patch(`/api/v1/agent/tasks/${order.orderNumber}/delivered`)
      .set('Cookie', agent.cookie)
      .send({});
    expect(response.status).toBe(200);
    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('DELIVERED');
    expect(updated?.deliveredAt).toBeInstanceOf(Date);
  });
});
