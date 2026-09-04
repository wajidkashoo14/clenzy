import type { OrderPayload, PlaceOrderInput } from '@clenzy/shared';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { PAYMENT_TIMING } from '../src/config/payments.js';
import { razorpayAdapter } from '../src/integrations/razorpay/index.js';
import { expireAbandonedOrders } from '../src/jobs/expireAbandonedOrders.js';
import { reconcilePayments } from '../src/jobs/reconcilePayments.js';
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
async function createUser(): Promise<{ id: string; cookie: string }> {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9193000${String(phoneSeed).padStart(5, '0')}`,
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

/**
 * Mongoose's `timestamps: true` plugin re-stamps `createdAt` on
 * updateOne/updateMany even when the update explicitly `$set`s it, so
 * backdating for these "is this stale enough" tests has to go through the
 * native driver collection directly, bypassing that hook.
 */
async function backdatePaymentCreatedAt(orderNumber: string, minutesAgo: number): Promise<void> {
  const order = await Order.findOne({ orderNumber }).lean();
  await Payment.collection.updateMany(
    { orderId: order!._id },
    { $set: { createdAt: new Date(Date.now() - minutesAgo * 60 * 1000) } },
  );
}
async function backdateOrderCreatedAt(orderNumber: string, minutesAgo: number): Promise<void> {
  await Order.collection.updateOne(
    { orderNumber },
    { $set: { createdAt: new Date(Date.now() - minutesAgo * 60 * 1000) } },
  );
}

/** Places a real online order via the HTTP API and returns everything needed to drive its payment lifecycle. */
async function placeOnlineOrder() {
  const user = await createUser();
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
    paymentMethod: 'online',
    idempotencyKey: randomUUID(),
  };

  const response = await request(app).post('/api/v1/orders').set('Cookie', user.cookie).send(input);
  expect(response.status).toBe(201);
  const body = bodyOf<{
    order: OrderPayload;
    payment: { razorpayOrderId: string; amount: number };
  }>(response).data!;
  return {
    user,
    address,
    area,
    order: body.order,
    gatewayOrderId: body.payment.razorpayOrderId,
    amount: body.payment.amount,
  };
}

function capturedPayload(
  gatewayOrderId: string,
  amount: number,
  paymentId = `pay_${randomUUID()}`,
) {
  return JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: { entity: { id: paymentId, order_id: gatewayOrderId, amount, status: 'captured' } },
    },
  });
}
function failedPayload(gatewayOrderId: string, amount: number, paymentId = `pay_${randomUUID()}`) {
  return JSON.stringify({
    event: 'payment.failed',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: gatewayOrderId,
          amount,
          status: 'failed',
          error_description: 'Card declined',
        },
      },
    },
  });
}

afterEach(async () => {
  vi.restoreAllMocks();
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

describe('Razorpay webhook processing', () => {
  it('marks the order paid on a validly signed payment.captured', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);

    const result = await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));
    expect(result.status).toBe(200);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PLACED');
    expect(updated?.paymentStatus).toBe('paid');
    expect(updated?.pricing.amountPaid).toBe(amount);
  });

  it('rejects a tampered signature and makes no state change', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);

    const result = await handleRazorpayWebhook(rawBody, 'not-the-real-signature');
    expect(result.status).toBe(400);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PENDING_PAYMENT');
    expect(updated?.paymentStatus).toBe('pending');
  });

  it('processes a duplicate webhook delivery exactly once', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount, 'pay_fixed_id');
    const signature = signWebhookPayload(rawBody);

    const first = await handleRazorpayWebhook(rawBody, signature);
    const second = await handleRazorpayWebhook(rawBody, signature);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.pricing.amountPaid).toBe(amount);
    // Exactly one history entry for the capture, not two.
    expect(updated?.statusHistory.filter((h) => h.note === 'Payment captured')).toHaveLength(1);
  });

  it('flags a tampered amount instead of marking the order paid', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount + 100);

    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PENDING_PAYMENT');
    expect(updated?.paymentStatus).toBe('pending');
    const payment = await Payment.findOne({ orderId: updated?._id }).lean();
    expect(payment?.status).toBe('failed');
    expect(payment?.failureReason).toBe('AMOUNT_MISMATCH');
  });

  it('leaves the order retryable on payment.failed', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = failedPayload(gatewayOrderId, amount);

    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PENDING_PAYMENT');
    expect(updated?.paymentStatus).toBe('failed');
  });

  it('auto-refunds a second payment.captured against an already-paid order', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const first = capturedPayload(gatewayOrderId, amount, 'pay_one');
    await handleRazorpayWebhook(first, signWebhookPayload(first));

    const refundSpy = vi
      .spyOn(razorpayAdapter, 'createRefund')
      .mockResolvedValue({ id: 'rfnd_dup', amount, status: 'processed' });
    const second = capturedPayload(gatewayOrderId, amount, 'pay_two_duplicate');
    await handleRazorpayWebhook(second, signWebhookPayload(second));

    expect(refundSpy).toHaveBeenCalledWith({ paymentId: 'pay_two_duplicate', amount });
    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.paymentStatus).toBe('paid'); // First payment's state is untouched.
  });
});

describe('POST /api/v1/webhooks/razorpay (HTTP wiring)', () => {
  it('accepts a validly signed request and rejects a badly signed one', async () => {
    const { gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);

    const ok = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', signWebhookPayload(rawBody))
      .send(rawBody);
    expect(ok.status).toBe(200);

    const bad = await request(app)
      .post('/api/v1/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('X-Razorpay-Signature', 'wrong')
      .send(capturedPayload(gatewayOrderId, amount, 'pay_other'));
    expect(bad.status).toBe(400);
  });
});

describe('GET /payments/status/:orderNumber', () => {
  it('reflects the order and payment status', async () => {
    const { user, order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);
    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));

    const response = await request(app)
      .get(`/api/v1/payments/status/${order.orderNumber}`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(200);
    const data = bodyOf<{ orderStatus: string; paymentStatus: string }>(response).data!;
    expect(data.orderStatus).toBe('PLACED');
    expect(data.paymentStatus).toBe('paid');
  });
});

describe('POST /payments/retry/:orderNumber', () => {
  it('creates a fresh gateway order for a failed payment', async () => {
    const { user, order, gatewayOrderId, amount } = await placeOnlineOrder();
    const failRaw = failedPayload(gatewayOrderId, amount);
    await handleRazorpayWebhook(failRaw, signWebhookPayload(failRaw));

    const response = await request(app)
      .post(`/api/v1/payments/retry/${order.orderNumber}`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(200);
    const data = bodyOf<{ razorpayOrderId: string }>(response).data!;
    expect(data.razorpayOrderId).not.toBe(gatewayOrderId);
    const afterRetry = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(await Payment.countDocuments({ orderId: afterRetry!._id })).toBe(2);
    // The poller on /checkout/processing must stop seeing "failed" once a fresh attempt exists.
    expect(afterRetry?.paymentStatus).toBe('pending');
  });

  it('refuses to retry an order that is not awaiting payment', async () => {
    const { user, order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);
    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));

    const response = await request(app)
      .post(`/api/v1/payments/retry/${order.orderNumber}`)
      .set('Cookie', user.cookie);
    expect(response.status).toBe(422);
  });
});

describe('POST /admin/orders/:id/refund', () => {
  async function createAdmin(): Promise<{ id: string; cookie: string }> {
    phoneSeed += 1;
    const admin = await User.create({
      phone: `+9194000${String(phoneSeed).padStart(5, '0')}`,
      phoneVerified: true,
      role: 'admin',
    });
    const token = signAccessToken(String(admin._id), 'admin');
    return { id: String(admin._id), cookie: `clenzy_at=${token}` };
  }

  it('refunds a captured payment in full and marks the order refunded', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);
    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));
    const admin = await createAdmin();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const refundSpy = vi
      .spyOn(razorpayAdapter, 'createRefund')
      .mockResolvedValue({ id: 'rfnd_full', amount, status: 'processed' });

    const response = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/refund`)
      .set('Cookie', admin.cookie)
      .send({ reason: 'Customer cancelled before pickup' });

    expect(response.status).toBe(200);
    expect(refundSpy).toHaveBeenCalledTimes(1);
    expect(refundSpy.mock.calls[0]?.[0].amount).toBe(amount);
    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.paymentStatus).toBe('refunded');
    expect(updated?.pricing.amountRefunded).toBe(amount);
  });

  it('rejects a partial refund that exceeds the remaining refundable amount', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);
    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));
    const admin = await createAdmin();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    vi.spyOn(razorpayAdapter, 'createRefund').mockResolvedValue({
      id: 'rfnd_partial',
      amount: amount - 1000,
      status: 'processed',
    });
    const partial = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/refund`)
      .set('Cookie', admin.cookie)
      .send({ amount: amount - 1000, reason: 'Partial goodwill refund' });
    expect(partial.status).toBe(200);

    const tooMuch = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/refund`)
      .set('Cookie', admin.cookie)
      .send({ amount: 5000, reason: 'Should not exceed remainder' });
    expect(tooMuch.status).toBe(422);
    expect(bodyOf(tooMuch).error!.code).toBe('REFUND_EXCEEDS_REMAINING');
  });

  it('is unreachable by a non-admin', async () => {
    const { order, gatewayOrderId, amount, user } = await placeOnlineOrder();
    const rawBody = capturedPayload(gatewayOrderId, amount);
    await handleRazorpayWebhook(rawBody, signWebhookPayload(rawBody));
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    const response = await request(app)
      .post(`/api/v1/admin/orders/${String(orderDoc!._id)}/refund`)
      .set('Cookie', user.cookie)
      .send({ reason: 'Should be forbidden' });
    expect(response.status).toBe(403);
  });
});

describe('reconcilePayments (webhook-lost recovery)', () => {
  it('resolves a stale payment by querying the gateway directly', async () => {
    const { order, gatewayOrderId, amount } = await placeOnlineOrder();
    await backdatePaymentCreatedAt(
      order.orderNumber,
      PAYMENT_TIMING.reconciliationStalenessMinutes + 5,
    );

    vi.spyOn(razorpayAdapter, 'fetchOrderPayments').mockResolvedValue([
      { id: 'pay_reconciled', orderId: gatewayOrderId, amount, status: 'captured' },
    ]);

    const result = await reconcilePayments();
    expect(result.reconciled).toBe(1);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PLACED');
    expect(updated?.paymentStatus).toBe('paid');
  });

  it('leaves genuinely unresolved payments alone', async () => {
    const { order } = await placeOnlineOrder();
    await backdatePaymentCreatedAt(
      order.orderNumber,
      PAYMENT_TIMING.reconciliationStalenessMinutes + 5,
    );
    vi.spyOn(razorpayAdapter, 'fetchOrderPayments').mockResolvedValue([]);

    const result = await reconcilePayments();
    expect(result.reconciled).toBe(0);
    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PENDING_PAYMENT');
  });
});

describe('expireAbandonedOrders (checkout abandonment)', () => {
  it('cancels a stale PENDING_PAYMENT order, releases its slot, and reverses its coupon', async () => {
    const { order, area, user } = await placeOnlineOrder();
    const orderDoc = await Order.findOne({ orderNumber: order.orderNumber });

    // Simulate a coupon having been applied at placement time.
    const coupon = await Coupon.create({
      code: 'STALE10',
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

    // Placing the order already reserved pickup/delivery capacity — confirm the baseline before releasing it.
    const capacityBefore = await SlotCapacity.findOne({
      date: orderDoc!.pickupSlot.date,
      window: orderDoc!.pickupSlot.window,
      type: 'pickup',
      areaId: area._id,
    }).lean();
    expect(capacityBefore?.booked).toBe(1);

    await backdateOrderCreatedAt(order.orderNumber, PAYMENT_TIMING.abandonedOrderExpiryMinutes + 5);

    const result = await expireAbandonedOrders();
    expect(result.expired).toBe(1);

    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('CANCELLED');
    expect(updated?.cancellation?.reason).toBe('payment_timeout');

    const capacity = await SlotCapacity.findOne({
      date: orderDoc!.pickupSlot.date,
      window: orderDoc!.pickupSlot.window,
      type: 'pickup',
    }).lean();
    expect(capacity?.booked).toBe(0);

    const refreshedCoupon = await Coupon.findById(coupon._id).lean();
    expect(refreshedCoupon?.usedCount).toBe(0);
    expect(await CouponRedemption.countDocuments({ orderId: orderDoc!._id })).toBe(0);
  });

  it('does not touch a recent PENDING_PAYMENT order', async () => {
    const { order } = await placeOnlineOrder();
    const result = await expireAbandonedOrders();
    expect(result.expired).toBe(0);
    const updated = await Order.findOne({ orderNumber: order.orderNumber }).lean();
    expect(updated?.status).toBe('PENDING_PAYMENT');
  });
});

describe('POST /dev/simulate-payment', () => {
  it('drives an order to paid through the real webhook pipeline', async () => {
    const { user, order } = await placeOnlineOrder();
    const response = await request(app)
      .post('/api/v1/dev/simulate-payment')
      .set('Cookie', user.cookie)
      .send({ orderNumber: order.orderNumber, outcome: 'success' });

    expect(response.status).toBe(200);
    const data = bodyOf<{ orderStatus: string; paymentStatus: string }>(response).data!;
    expect(data.orderStatus).toBe('PLACED');
    expect(data.paymentStatus).toBe('paid');
  });

  it('cannot simulate a payment for another user’s order', async () => {
    const { order } = await placeOnlineOrder();
    const intruder = await createUser();
    const response = await request(app)
      .post('/api/v1/dev/simulate-payment')
      .set('Cookie', intruder.cookie)
      .send({ orderNumber: order.orderNumber, outcome: 'success' });
    expect(response.status).toBe(404);
  });
});
