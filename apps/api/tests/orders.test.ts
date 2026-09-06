import type { OrderPayload, PlaceOrderInput } from '@clenzy/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
import * as ordersService from '../src/services/orders.service.js';
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
async function createUser(): Promise<{ id: string; cookie: string }> {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9190000${String(phoneSeed).padStart(5, '0')}`,
    phoneVerified: true,
    role: 'customer',
  });
  const token = signAccessToken(String(user._id), 'customer');
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

async function createArea(pincode: string) {
  return ServiceArea.create({
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    area: 'Test Area',
    slug: `test-area-${Date.now()}-${Math.random()}`,
    pincodes: [pincode],
    pickupAvailable: true,
    deliveryAvailable: true,
    expressAvailable: true,
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

async function createCategoryAndItem(
  overrides: Partial<{ price: number; taxRatePercent: number; turnaroundHours: number }> = {},
) {
  const category = await ServiceCategory.create({
    name: 'Test Category',
    slug: `test-category-${Date.now()}-${Math.random()}`,
    description: 'd',
    shortDescription: 'sd',
    icon: 'Shirt',
    turnaroundHours: overrides.turnaroundHours ?? 48,
    expressAvailable: true,
    isActive: true,
  });
  const item = await ServiceItem.create({
    categoryId: category._id,
    name: 'Test Shirt',
    slug: `test-shirt-${Date.now()}-${Math.random()}`,
    unit: 'piece',
    price: overrides.price ?? 40_000,
    taxRatePercent: overrides.taxRatePercent ?? 0,
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
  label?: string;
  capacity?: number;
  cutoffMinutesBefore?: number;
}) {
  return SlotTemplate.create({
    type: opts.type,
    dayOfWeek: dayOfWeekOfDateString(opts.date),
    window: opts.window,
    label: opts.label ?? opts.window,
    capacity: opts.capacity ?? 15,
    cutoffMinutesBefore: opts.cutoffMinutesBefore ?? 0,
    isActive: true,
    areaIds: [],
  });
}

/** A well-separated, cutoff-safe pickup/delivery pair: pickup tomorrow, delivery 4 days out. */
function futureDates(): { pickupDate: string; deliveryDate: string } {
  const today = nowInKolkata().dateString;
  return {
    pickupDate: addDaysToDateString(today, 1),
    deliveryDate: addDaysToDateString(today, 4),
  };
}

async function fullSetup(itemOverrides?: Parameters<typeof createCategoryAndItem>[0]) {
  const user = await createUser();
  const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const area = await createArea(pincode);
  const address = await createAddress(user.id, area._id, pincode);
  const { item } = await createCategoryAndItem(itemOverrides);
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

  return {
    user,
    area,
    address,
    item,
    input,
    pickupDate,
    deliveryDate,
    pickupWindow,
    deliveryWindow,
  };
}

afterEach(async () => {
  vi.useRealTimers();
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

describe('POST /orders', () => {
  it('places a COD order end to end', async () => {
    const { user, input } = await fullSetup();

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send(input);

    expect(response.status).toBe(201);
    const order = bodyOf<{ order: OrderPayload }>(response).data!.order;
    expect(order.orderNumber).toMatch(/^CLZ-\d{6}-\d{4}$/);
    expect(order.status).toBe('PLACED');
    expect(order.paymentMethod).toBe('cod');
    expect(order.paymentStatus).toBe('pending');
    expect(order.pricing.itemsSubtotal).toBe(40_000);
    expect(order.pricing.deliveryFee).toBe(4_900);
    expect(order.pricing.grandTotal).toBe(44_900);

    const stored = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(stored).not.toBeNull();
    const payment = await Payment.findOne({ orderId: stored!._id }).lean();
    expect(payment?.gateway).toBe('cod');
    expect(payment?.amount).toBe(44_900);

    // Capacity was actually decremented.
    const capacity = await SlotCapacity.findOne({
      date: input.pickupSlot.date,
      window: input.pickupSlot.window,
      type: 'pickup',
    }).lean();
    expect(capacity?.booked).toBe(1);
  });

  it('places an online order as PENDING_PAYMENT with a gateway order attached', async () => {
    const { user, input } = await fullSetup();
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, paymentMethod: 'online' });

    expect(response.status).toBe(201);
    const body = bodyOf<{
      order: OrderPayload;
      payment?: { gateway: string; razorpayOrderId: string };
    }>(response).data!;
    expect(body.order.status).toBe('PENDING_PAYMENT');
    expect(body.order.paymentStatus).toBe('pending');
    expect(body.payment?.gateway).toBe('razorpay');
    expect(body.payment?.razorpayOrderId).toMatch(/^order_fake_/);
  });

  it('rejects the wallet payment method — not built yet', async () => {
    const { user, input } = await fullSetup();
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, paymentMethod: 'wallet' });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('PAYMENT_METHOD_NOT_AVAILABLE');
  });

  it('rejects an order below the minimum order value', async () => {
    const { user, input } = await fullSetup({ price: 1_000 });
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send(input);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('MIN_ORDER_NOT_MET');
  });

  it('rejects COD above the maximum order value', async () => {
    const { user, input } = await fullSetup({ price: 600_000 });
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send(input);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('COD_LIMIT_EXCEEDED');
  });

  it('rejects a delivery date earlier than the item turnaround allows', async () => {
    const { user, input, pickupDate, pickupWindow } = await fullSetup({ turnaroundHours: 48 });
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, deliverySlot: { date: pickupDate, window: pickupWindow } });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('INVALID_DELIVERY_DATE');
  });

  it('rejects an address that does not belong to the user', async () => {
    const { user, input } = await fullSetup();
    const otherUser = await createUser();
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const otherArea = await createArea(pincode);
    const otherAddress = await createAddress(otherUser.id, otherArea._id, pincode);

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, pickupAddressId: String(otherAddress._id) });

    expect(response.status).toBe(404);
  });

  it('rejects an address with no resolvable service area', async () => {
    const { user, input } = await fullSetup();
    const unserviceableAddress = await Address.create({
      userId: user.id,
      label: 'work',
      contactName: 'Test',
      contactPhone: '+919000000002',
      line1: 'Somewhere unserviceable',
      area: 'Nowhere',
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      pincode: '999999',
      isDefault: false,
      // serviceAreaId intentionally omitted.
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, pickupAddressId: String(unserviceableAddress._id) });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('ADDRESS_NOT_SERVICEABLE');
  });

  it('rejects placing an order in an area an admin has paused since the address was saved', async () => {
    const { user, input, area } = await fullSetup();
    // Simulates docs/ADMIN_DASHBOARD.md §8's "pause area" — the address was
    // saved while the area was open; the area is paused afterward.
    await ServiceArea.updateOne({ _id: area._id }, { $set: { pickupAvailable: false } });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send(input);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('AREA_NOT_SERVICEABLE');
  });

  it('rejects a slot that is already fully booked', async () => {
    const { user, input, area, pickupDate, pickupWindow } = await fullSetup();
    await SlotTemplate.updateMany(
      { type: 'pickup', window: pickupWindow },
      { $set: { capacity: 1 } },
    );
    await SlotCapacity.create({
      date: pickupDate,
      window: pickupWindow,
      type: 'pickup',
      areaId: area._id,
      booked: 1,
      capacity: 1,
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send(input);

    expect(response.status).toBe(409);
    expect(bodyOf(response).error!.code).toBe('SLOT_UNAVAILABLE');
  });

  it('rejects a slot an admin has capacity-overridden to full, even though the template has room', async () => {
    const { user, input, area, pickupDate, pickupWindow } = await fullSetup();
    // Template still allows 15 — only the per-date SlotCapacity override (an
    // admin blocking this date for a holiday) should govern the actual guard.
    await SlotCapacity.create({
      date: pickupDate,
      window: pickupWindow,
      type: 'pickup',
      areaId: area._id,
      booked: 0,
      capacity: 0,
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send(input);

    expect(response.status).toBe(409);
    expect(bodyOf(response).error!.code).toBe('SLOT_UNAVAILABLE');
  });

  it('rejects a slot whose cutoff has passed', async () => {
    // Pin "now" so the test is deterministic regardless of when it runs.
    // Only Date is faked — leaving real timers alone keeps the Mongo driver working.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-06-15T15:00:00.000Z')); // 8:30 PM IST

    const { user, input } = await fullSetup();
    const today = nowInKolkata().dateString;
    await createSlotTemplate({ type: 'pickup', date: today, window: '09:00-11:00' });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, pickupSlot: { date: today, window: '09:00-11:00' } });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('SLOT_CUTOFF_PASSED');
  });

  it('replays the original order instead of creating a duplicate', async () => {
    const { user, input } = await fullSetup();

    const first = await request(app).post('/api/v1/orders').set('Cookie', user.cookie).send(input);
    expect(first.status).toBe(201);
    const firstOrderNumber = bodyOf<{ order: OrderPayload }>(first).data!.order.orderNumber;

    const replay = await request(app).post('/api/v1/orders').set('Cookie', user.cookie).send(input);
    expect(replay.status).toBe(409);
    const body = bodyOf<never>(replay);
    expect(body.error!.code).toBe('DUPLICATE_REQUEST');
    expect((body.error!.order as OrderPayload).orderNumber).toBe(firstOrderNumber);

    expect(await Order.countDocuments({})).toBe(1);
  });

  it('applies a valid coupon and records redemption', async () => {
    const { user, input } = await fullSetup();
    await Coupon.create({
      code: 'TESTCOUPON',
      description: 'Test',
      discountType: 'flat',
      discountValue: 5_000,
      minOrderValue: 0,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2030-01-01'),
      usageLimitPerUser: 1,
      firstOrderOnly: false,
      applicableCategories: [],
      applicableAreas: [],
      restrictedToUsers: [],
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/orders')
      .set('Cookie', user.cookie)
      .send({ ...input, couponCode: 'testcoupon' });

    expect(response.status).toBe(201);
    const order = bodyOf<{ order: OrderPayload }>(response).data!.order;
    expect(order.pricing.discountAmount).toBe(5_000);
    expect(order.couponCode).toBe('TESTCOUPON');

    const redemption = await CouponRedemption.findOne({ userId: user.id }).lean();
    expect(redemption?.discountAmount).toBe(5_000);
    const coupon = await Coupon.findOne({ code: 'TESTCOUPON' }).lean();
    expect(coupon?.usedCount).toBe(1);
  });

  it('handles 20 concurrent orders against a 5-capacity slot with no partial writes', async () => {
    const CAPACITY = 5;
    const CONCURRENCY = 20;

    const user = await createUser();
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const area = await createArea(pincode);
    const address = await createAddress(user.id, area._id, pincode);
    const { item } = await createCategoryAndItem();
    const { pickupDate, deliveryDate } = futureDates();
    const pickupWindow = '09:00-11:00';
    const deliveryWindow = '16:00-18:00';
    await createSlotTemplate({
      type: 'pickup',
      date: pickupDate,
      window: pickupWindow,
      capacity: CAPACITY,
    });
    await createSlotTemplate({
      type: 'delivery',
      date: deliveryDate,
      window: deliveryWindow,
      capacity: 25,
    });

    const attempts = Array.from({ length: CONCURRENCY }, () =>
      ordersService.placeOrder(user.id, {
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        pickupAddressId: String(address._id),
        deliveryAddressId: String(address._id),
        pickupSlot: { date: pickupDate, window: pickupWindow },
        deliverySlot: { date: deliveryDate, window: deliveryWindow },
        isExpress: false,
        paymentMethod: 'cod',
        idempotencyKey: randomUUID(),
      }),
    );

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(CAPACITY);
    expect(failed).toHaveLength(CONCURRENCY - CAPACITY);
    for (const failure of failed) {
      const reason = failure.reason as { code?: string };
      expect(reason.code).toBe('SLOT_UNAVAILABLE');
    }

    const capacityDoc = await SlotCapacity.findOne({
      date: pickupDate,
      window: pickupWindow,
      type: 'pickup',
    }).lean();
    expect(capacityDoc?.booked).toBe(CAPACITY);
    expect(await Order.countDocuments({})).toBe(CAPACITY);
    expect(await Payment.countDocuments({})).toBe(CAPACITY);
  }, 30_000);
});
