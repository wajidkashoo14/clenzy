import type { OrderPayload, PlaceOrderInput } from '@clenzy/shared';
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
import { assertTransitionAllowed, changeStatus } from '../src/services/orderStatus.service.js';
import { handleRazorpayWebhook } from '../src/services/webhooks.service.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { signWebhookPayload } from '../src/utils/razorpaySignature.js';
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
async function createUserWithRole(
  role: 'customer' | 'agent' | 'staff' | 'admin',
): Promise<{ id: string; cookie: string }> {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9195${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
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

/** Places a real COD order via the HTTP API. */
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

  const input: PlaceOrderInput = {
    items: [{ serviceItemId: String(item._id), quantity: 1 }],
    pickupAddressId: String(address._id),
    deliveryAddressId: String(address._id),
    pickupSlot: { date: pickupDate, window: pickupWindow },
    deliverySlot: { date: deliveryDate, window: deliveryWindow },
    isExpress: false,
    paymentMethod: 'cod',
    idempotencyKey: randomUUID(),
  };

  const response = await request(app).post('/api/v1/orders').set('Cookie', user.cookie).send(input);
  expect(response.status).toBe(201);
  const order = bodyOf<{ order: OrderPayload }>(response).data!.order;
  return { user, area, address, order, pickupDate, deliveryDate, pickupWindow, deliveryWindow };
}

/** Places a real online order and drives it to PLACED/paid via a correctly-signed webhook. */
async function placePaidOrder() {
  const setup = await placeCodOrder();
  // Reuse the same setup shape but replace with an online order for this one order.
  const { item } = await createCategoryAndItem();
  const pickupWindow = '11:00-13:00';
  const deliveryWindow = '18:00-20:00';
  await createSlotTemplate({ type: 'pickup', date: setup.pickupDate, window: pickupWindow });
  await createSlotTemplate({ type: 'delivery', date: setup.deliveryDate, window: deliveryWindow });

  const input: PlaceOrderInput = {
    items: [{ serviceItemId: String(item._id), quantity: 1 }],
    pickupAddressId: String(setup.address._id),
    deliveryAddressId: String(setup.address._id),
    pickupSlot: { date: setup.pickupDate, window: pickupWindow },
    deliverySlot: { date: setup.deliveryDate, window: deliveryWindow },
    isExpress: false,
    paymentMethod: 'online',
    idempotencyKey: randomUUID(),
  };
  const response = await request(app)
    .post('/api/v1/orders')
    .set('Cookie', setup.user.cookie)
    .send(input);
  expect(response.status).toBe(201);
  const body = bodyOf<{
    order: OrderPayload;
    payment: { razorpayOrderId: string; amount: number };
  }>(response).data!;

  const rawBody = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: `pay_${randomUUID()}`,
          order_id: body.payment.razorpayOrderId,
          amount: body.payment.amount,
          status: 'captured',
        },
      },
    },
  });
  await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));

  return { user: setup.user, order: body.order, amount: body.payment.amount };
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

describe('order status transition map', () => {
  it('allows a legal transition and records who did it', async () => {
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const staff = await createUserWithRole('staff');

    await changeStatus(orderDoc!, 'CONFIRMED', 'staff', {
      actorUserId: staff.id,
      note: 'Looks good',
    });

    expect(orderDoc!.status).toBe('CONFIRMED');
    const lastEntry = orderDoc!.statusHistory.at(-1);
    expect(lastEntry?.status).toBe('CONFIRMED');
    expect(lastEntry?.changedByRole).toBe('staff');
    expect(lastEntry?.note).toBe('Looks good');
  });

  it('rejects a transition that skips steps', () => {
    expect(() => assertTransitionAllowed('PLACED', 'PICKED_UP', 'staff')).toThrow(/cannot move/);
  });

  it('rejects a transition from a terminal status', () => {
    expect(() => assertTransitionAllowed('CANCELLED', 'PLACED', 'admin')).toThrow(/cannot move/);
  });

  it('enforces the permission matrix — a customer cannot confirm an order', () => {
    expect(() => assertTransitionAllowed('PLACED', 'CONFIRMED', 'customer')).toThrow(/cannot move/);
  });

  it('lets superadmin do anything admin can', () => {
    expect(() => assertTransitionAllowed('PLACED', 'CONFIRMED', 'superadmin')).not.toThrow();
  });

  it('sets deliveredAt/completedAt automatically on those transitions', async () => {
    const { order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');

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
      await changeStatus(orderDoc!, status, 'admin', { actorUserId: admin.id });
    }
    expect(orderDoc!.deliveredAt).toBeInstanceOf(Date);

    await changeStatus(orderDoc!, 'COMPLETED', 'admin', { actorUserId: admin.id });
    expect(orderDoc!.completedAt).toBeInstanceOf(Date);
  });
});

describe('POST /orders/:orderNumber/cancel', () => {
  it('cancels a PLACED order and releases its slot capacity', async () => {
    const { user, order, pickupDate, pickupWindow } = await placeCodOrder();

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/cancel`)
      .set('Cookie', user.cookie)
      .send({ reason: 'Changed my mind' });

    expect(response.status).toBe(200);
    const cancelled = bodyOf<{ order: OrderPayload }>(response).data!.order;
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellation?.reason).toBe('Changed my mind');

    const capacity = await SlotCapacity.findOne({
      date: pickupDate,
      window: pickupWindow,
      type: 'pickup',
    }).lean();
    expect(capacity?.booked).toBe(0);
  });

  it('reverses coupon usage on cancellation', async () => {
    const { user, order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const coupon = await Coupon.create({
      code: 'CANCELTEST',
      description: 'test',
      discountType: 'flat',
      discountValue: 1000,
      minOrderValue: 0,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2030-01-01'),
      usageLimitPerUser: 1,
      firstOrderOnly: false,
      applicableCategories: [],
      applicableAreas: [],
      restrictedToUsers: [],
      isActive: true,
      usedCount: 1,
    });
    await CouponRedemption.create({
      couponId: coupon._id,
      userId: user.id,
      orderId: orderDoc!._id,
      discountAmount: 1000,
      redeemedAt: new Date(),
    });
    orderDoc!.couponId = coupon._id;
    await orderDoc!.save();

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/cancel`)
      .set('Cookie', user.cookie)
      .send({ reason: 'test' });
    expect(response.status).toBe(200);

    expect((await Coupon.findById(coupon._id).lean())?.usedCount).toBe(0);
    expect(await CouponRedemption.countDocuments({ orderId: orderDoc!._id })).toBe(0);
  });

  it('refunds a prepaid order automatically on cancellation', async () => {
    const { user, order, amount } = await placePaidOrder();

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/cancel`)
      .set('Cookie', user.cookie)
      .send({ reason: 'test' });
    expect(response.status).toBe(200);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.paymentStatus).toBe('refunded');
    expect(updated?.pricing.amountRefunded).toBe(amount);
    expect(updated?.cancellation?.refundEligible).toBe(true);
  });

  it('refuses to cancel an order that has already been picked up', async () => {
    const { user, order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
    for (const status of ['CONFIRMED', 'PICKUP_SCHEDULED', 'PICKED_UP'] as const) {
      await changeStatus(orderDoc!, status, 'admin', { actorUserId: admin.id });
    }

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/cancel`)
      .set('Cookie', user.cookie)
      .send({ reason: 'test' });
    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('CANCELLATION_NOT_ALLOWED');
  });
});

describe('POST /orders/:orderNumber/reschedule', () => {
  it('reschedules the pickup slot, releasing the old one and booking the new one', async () => {
    const { user, order, pickupDate, pickupWindow, deliveryDate } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
    await changeStatus(orderDoc!, 'CONFIRMED', 'admin', { actorUserId: admin.id });

    const newDate = addDaysToDateString(deliveryDate, 1);
    await createSlotTemplate({ type: 'pickup', date: newDate, window: '14:00-16:00' });

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/reschedule`)
      .set('Cookie', user.cookie)
      .send({ type: 'pickup', date: newDate, window: '14:00-16:00' });

    expect(response.status).toBe(200);
    const updated = bodyOf<{ order: OrderPayload }>(response).data!.order;
    expect(updated.rescheduleCount).toBe(1);

    const oldCapacity = await SlotCapacity.findOne({
      date: pickupDate,
      window: pickupWindow,
      type: 'pickup',
    }).lean();
    expect(oldCapacity?.booked).toBe(0);
    const newCapacity = await SlotCapacity.findOne({
      date: newDate,
      window: '14:00-16:00',
      type: 'pickup',
    }).lean();
    expect(newCapacity?.booked).toBe(1);
  });

  it('rejects rescheduling beyond the cap of 2', async () => {
    const { user, order, deliveryDate } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    orderDoc!.rescheduleCount = 2;
    await orderDoc!.save();

    const newDate = addDaysToDateString(deliveryDate, 1);
    await createSlotTemplate({ type: 'pickup', date: newDate, window: '14:00-16:00' });

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/reschedule`)
      .set('Cookie', user.cookie)
      .send({ type: 'pickup', date: newDate, window: '14:00-16:00' });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('MAX_RESCHEDULES_REACHED');
  });

  it('recovers PICKUP_FAILED back to PICKUP_SCHEDULED on reschedule', async () => {
    const { user, order, deliveryDate } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
    await changeStatus(orderDoc!, 'CONFIRMED', 'admin', { actorUserId: admin.id });
    await changeStatus(orderDoc!, 'PICKUP_SCHEDULED', 'admin', { actorUserId: admin.id });
    await changeStatus(orderDoc!, 'PICKUP_FAILED', 'admin', { actorUserId: admin.id });

    const newDate = addDaysToDateString(deliveryDate, 1);
    await createSlotTemplate({ type: 'pickup', date: newDate, window: '14:00-16:00' });

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/reschedule`)
      .set('Cookie', user.cookie)
      .send({ type: 'pickup', date: newDate, window: '14:00-16:00' });

    expect(response.status).toBe(200);
    expect(bodyOf<{ order: OrderPayload }>(response).data!.order.status).toBe('PICKUP_SCHEDULED');
  });
});

describe('POST /orders/:orderNumber/reclean', () => {
  it('creates a free re-clean order within the 72h window', async () => {
    const { user, order, deliveryWindow } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
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
      await changeStatus(orderDoc!, status, 'admin', { actorUserId: admin.id });
    }
    // Re-clean auto-picks pickup = tomorrow, delivery = +3 days from today,
    // reusing the parent's windows — provision a template matching that
    // specific day-of-week/window combo (the parent's own delivery slot
    // template was booked for a different date, so it won't match here).
    const recleanDeliveryDate = addDaysToDateString(nowInKolkata().dateString, 3);
    await createSlotTemplate({
      type: 'delivery',
      date: recleanDeliveryDate,
      window: deliveryWindow,
    });

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/reclean`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(201);
    const reclean = bodyOf<{ order: OrderPayload }>(response).data!.order;
    expect(reclean.pricing.grandTotal).toBe(0);
    expect(reclean.orderNumber).not.toBe(order.orderNumber);
  });

  it('rejects a re-clean request after the 72h window has passed', async () => {
    const { user, order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
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
      await changeStatus(orderDoc!, status, 'admin', { actorUserId: admin.id });
    }
    await Order.collection.updateOne(
      { _id: orderDoc!._id },
      { $set: { deliveredAt: new Date(Date.now() - 100 * 60 * 60 * 1000) } },
    );

    const response = await request(app)
      .post(`/api/v1/orders/${order.orderNumber}/reclean`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('RECLEAN_WINDOW_EXPIRED');
  });
});

describe('GET /orders/:orderNumber/track', () => {
  it('shows the happy-path timeline with future steps marked incomplete', async () => {
    const { user, order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
    await changeStatus(orderDoc!, 'CONFIRMED', 'admin', { actorUserId: admin.id });

    const response = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}/track`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(200);
    const data = bodyOf<{
      status: string;
      timeline: { status: string; isCompleted: boolean; isCurrent: boolean }[];
    }>(response).data!;
    expect(data.status).toBe('CONFIRMED');
    const placed = data.timeline.find((t) => t.status === 'PLACED')!;
    const confirmed = data.timeline.find((t) => t.status === 'CONFIRMED')!;
    const pickupScheduled = data.timeline.find((t) => t.status === 'PICKUP_SCHEDULED')!;
    expect(placed.isCompleted).toBe(true);
    expect(confirmed.isCompleted).toBe(true);
    expect(confirmed.isCurrent).toBe(true);
    expect(pickupScheduled.isCompleted).toBe(false);
  });

  it('exposes agent contact only while PICKUP_SCHEDULED, and not before', async () => {
    const { user, order } = await placeCodOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });
    const admin = await createUserWithRole('admin');
    const agent = await createUserWithRole('agent');
    await User.updateOne({ _id: agent.id }, { $set: { name: 'Agent Bob' } });

    const before = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}/track`)
      .set('Cookie', user.cookie);
    expect(bodyOf<{ agent: unknown }>(before).data!.agent).toBeNull();

    await changeStatus(orderDoc!, 'CONFIRMED', 'admin', { actorUserId: admin.id });
    orderDoc!.assignedPickupAgentId = new (await import('mongoose')).Types.ObjectId(agent.id);
    await changeStatus(orderDoc!, 'PICKUP_SCHEDULED', 'admin', { actorUserId: admin.id });

    const after = await request(app)
      .get(`/api/v1/orders/${order.orderNumber}/track`)
      .set('Cookie', user.cookie);
    const data = bodyOf<{ agent: { name: string; phone: string } | null }>(after).data!;
    expect(data.agent?.name).toBe('Agent Bob');
  });
});
