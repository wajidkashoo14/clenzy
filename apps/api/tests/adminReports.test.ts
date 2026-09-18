import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponRedemption } from '../src/models/CouponRedemption.js';
import { Order, type OrderDocument } from '../src/models/Order.js';
import { SlotCapacity } from '../src/models/SlotCapacity.js';
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
    phone: `+9194${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
    name: `User ${phoneSeed}`,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

let orderSeed = 0;
async function createOrder(
  userId: string,
  overrides: Partial<Record<string, unknown>> = {},
): Promise<OrderDocument & { _id: Types.ObjectId }> {
  orderSeed += 1;
  const areaId = new Types.ObjectId();
  const order = await Order.create({
    orderNumber: `ORD-REPORT-${orderSeed}`,
    userId,
    status: 'DELIVERED',
    items: [
      {
        serviceItemId: new Types.ObjectId(),
        categoryId: new Types.ObjectId(),
        name: 'Shirt',
        categoryName: 'Laundry',
        unit: 'piece',
        unitPrice: 4000,
        quantity: 1,
        lineTotal: 4000,
        addedBy: 'customer',
      },
    ],
    pricing: { itemsSubtotal: 4000, grandTotal: 4000, discountAmount: 0, amountRefunded: 0 },
    pickupAddress: {
      label: 'home',
      contactName: 'A',
      contactPhone: '+919600000000',
      line1: 'x',
      area: 'Dalgate',
      city: 'Srinagar',
      state: 'JK',
      pincode: '190001',
    },
    deliveryAddress: {
      label: 'home',
      contactName: 'A',
      contactPhone: '+919600000000',
      line1: 'x',
      area: 'Dalgate',
      city: 'Srinagar',
      state: 'JK',
      pincode: '190001',
    },
    pickupSlot: { date: '2026-06-01', window: '09:00-11:00', label: '9-11am', areaId },
    deliverySlot: { date: '2026-06-03', window: '09:00-11:00', label: '9-11am', areaId },
    paymentMethod: 'online',
    paymentStatus: 'paid',
    ...overrides,
  });
  if (overrides.createdAt) {
    await Order.updateOne({ _id: order._id }, { $set: { createdAt: overrides.createdAt } });
  }
  return order;
}

const RANGE = { from: '2026-06-01', to: '2026-06-30' };
const inRange = new Date('2026-06-15T00:00:00.000Z');
const outOfRange = new Date('2026-07-15T00:00:00.000Z');

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
    CouponRedemption.deleteMany({}),
    SlotCapacity.deleteMany({}),
  ]);
});

describe('admin reports role gating', () => {
  it('rejects a staff caller — reports are ADMIN only', async () => {
    const staff = await createUserWithRole('staff');
    const response = await request(app)
      .get('/api/v1/admin/reports/revenue')
      .query(RANGE)
      .set('Cookie', staff.cookie);
    expect(response.status).toBe(403);
  });
});

describe('GET /admin/reports/revenue', () => {
  it('sums gross/discounts/refunds within range and ignores orders outside it', async () => {
    const admin = await createUserWithRole('admin');
    const customer = await createUserWithRole('customer');
    await createOrder(customer.id, {
      createdAt: inRange,
      paymentMethod: 'online',
      pricing: { itemsSubtotal: 4000, grandTotal: 4000, discountAmount: 400, amountRefunded: 0 },
    });
    await createOrder(customer.id, {
      createdAt: inRange,
      paymentMethod: 'cod',
      pricing: { itemsSubtotal: 4000, grandTotal: 2000, discountAmount: 0, amountRefunded: 500 },
    });
    await createOrder(customer.id, { createdAt: outOfRange });

    const response = await request(app)
      .get('/api/v1/admin/reports/revenue')
      .query(RANGE)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const report = bodyOf<{
      report: { gross: number; discounts: number; refunds: number; net: number };
    }>(response).data!.report;
    expect(report.gross).toBe(6000);
    expect(report.discounts).toBe(400);
    expect(report.refunds).toBe(500);
    expect(report.net).toBe(5500);
  });

  it('exports CSV with the right content type', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .get('/api/v1/admin/reports/revenue.csv')
      .query(RANGE)
      .set('Cookie', admin.cookie);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('gross');
  });
});

describe('GET /admin/reports/orders', () => {
  it('counts by status and computes the cancellation rate', async () => {
    const admin = await createUserWithRole('admin');
    const customer = await createUserWithRole('customer');
    await createOrder(customer.id, { createdAt: inRange, status: 'DELIVERED' });
    await createOrder(customer.id, { createdAt: inRange, status: 'DELIVERED' });
    await createOrder(customer.id, {
      createdAt: inRange,
      status: 'CANCELLED',
      cancellation: {
        reason: 'Changed my mind',
        cancelledByRole: 'customer',
        at: inRange,
        refundEligible: true,
      },
    });

    const response = await request(app)
      .get('/api/v1/admin/reports/orders')
      .query(RANGE)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const report = bodyOf<{
      report: {
        totalOrders: number;
        cancellationRatePercent: number;
        cancellationReasons: { reason: string; count: number }[];
      };
    }>(response).data!.report;
    expect(report.totalOrders).toBe(3);
    expect(report.cancellationRatePercent).toBeCloseTo(33.3, 1);
    expect(report.cancellationReasons).toEqual([{ reason: 'Changed my mind', count: 1 }]);
  });
});

describe('GET /admin/reports/customers', () => {
  it('separates new vs. returning customers and ranks top spenders', async () => {
    const admin = await createUserWithRole('admin');
    const loyal = await createUserWithRole('customer');
    const oneTime = await createUserWithRole('customer');
    await createOrder(loyal.id, {
      createdAt: inRange,
      pricing: { itemsSubtotal: 4000, grandTotal: 4000 },
    });
    await createOrder(loyal.id, {
      createdAt: inRange,
      pricing: { itemsSubtotal: 4000, grandTotal: 4000 },
    });
    await createOrder(oneTime.id, {
      createdAt: inRange,
      pricing: { itemsSubtotal: 1000, grandTotal: 1000 },
    });

    const response = await request(app)
      .get('/api/v1/admin/reports/customers')
      .query(RANGE)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const report = bodyOf<{
      report: {
        newCustomers: number;
        returningCustomers: number;
        topCustomers: { userId: string; totalSpent: number }[];
      };
    }>(response).data!.report;
    expect(report.newCustomers).toBe(1);
    expect(report.returningCustomers).toBe(1);
    expect(report.topCustomers[0]!.userId).toBe(loyal.id);
    expect(report.topCustomers[0]!.totalSpent).toBe(8000);
  });
});

describe('GET /admin/reports/operations', () => {
  it('reports slot utilization and items processed by category', async () => {
    const admin = await createUserWithRole('admin');
    const customer = await createUserWithRole('customer');
    const areaId = new Types.ObjectId();
    await SlotCapacity.create({
      date: '2026-06-10',
      window: '09:00-11:00',
      type: 'pickup',
      areaId,
      booked: 6,
      capacity: 15,
    });
    await createOrder(customer.id, { createdAt: inRange });

    const response = await request(app)
      .get('/api/v1/admin/reports/operations')
      .query(RANGE)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const report = bodyOf<{
      report: {
        slotUtilization: { booked: number; capacity: number; utilizationPercent: number }[];
        itemsByCategory: { category: string; quantity: number }[];
      };
    }>(response).data!.report;
    expect(report.slotUtilization).toContainEqual({
      type: 'pickup',
      window: '09:00-11:00',
      booked: 6,
      capacity: 15,
      utilizationPercent: 40,
    });
    expect(report.itemsByCategory).toContainEqual({
      category: 'Laundry',
      quantity: 1,
      revenue: 4000,
    });
  });
});

describe('GET /admin/reports/coupons', () => {
  it('reports redemptions, discount cost, and revenue attributed', async () => {
    const admin = await createUserWithRole('admin');
    const customer = await createUserWithRole('customer');
    const coupon = await Coupon.create({
      code: 'SAVE10',
      description: '10% off',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 0,
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
    });
    const order = await createOrder(customer.id, {
      createdAt: inRange,
      couponId: coupon._id,
      pricing: { itemsSubtotal: 4000, grandTotal: 3600, discountAmount: 400 },
    });
    await CouponRedemption.create({
      couponId: coupon._id,
      userId: customer.id,
      orderId: order._id,
      discountAmount: 400,
      redeemedAt: inRange,
    });

    const response = await request(app)
      .get('/api/v1/admin/reports/coupons')
      .query(RANGE)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const report = bodyOf<{
      report: {
        coupons: {
          code: string;
          redemptions: number;
          discountCost: number;
          revenueAttributed: number;
        }[];
      };
    }>(response).data!.report;
    expect(report.coupons).toEqual([
      { code: 'SAVE10', redemptions: 1, discountCost: 400, revenueAttributed: 3600 },
    ]);
  });
});
