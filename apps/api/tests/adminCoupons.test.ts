import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponRedemption } from '../src/models/CouponRedemption.js';
import { Order } from '../src/models/Order.js';
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

function validCouponPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    code: `SAVE${Date.now()}`,
    description: 'Save on your order',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 0,
    validFrom: '2026-01-01T00:00:00.000Z',
    validUntil: '2026-12-31T00:00:00.000Z',
    usageLimitPerUser: 1,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Coupon.deleteMany({}),
    CouponRedemption.deleteMany({}),
    Order.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('admin coupon role gating', () => {
  it('lets staff read but rejects staff mutations', async () => {
    const staff = await createUserWithRole('staff');
    const list = await request(app).get('/api/v1/admin/coupons').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', staff.cookie)
      .send(validCouponPayload());
    expect(create.status).toBe(403);
  });
});

describe('POST /admin/coupons', () => {
  it('creates a coupon, uppercasing the code', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(validCouponPayload({ code: 'welcome50' }));

    expect(response.status).toBe(201);
    expect(bodyOf<{ coupon: { code: string } }>(response).data!.coupon.code).toBe('WELCOME50');
    expect(await AuditLog.countDocuments({ action: 'coupon.create' })).toBe(1);
  });

  it('rejects a duplicate code', async () => {
    const admin = await createUserWithRole('admin');
    const payload = validCouponPayload();
    await request(app).post('/api/v1/admin/coupons').set('Cookie', admin.cookie).send(payload);

    const response = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(payload);
    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('CODE_TAKEN');
  });

  it('rejects a percentage discount over 100', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(validCouponPayload({ discountValue: 150 }));
    expect(response.status).toBe(400);
  });

  it('rejects validUntil before validFrom', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(
        validCouponPayload({
          validFrom: '2026-12-31T00:00:00.000Z',
          validUntil: '2026-01-01T00:00:00.000Z',
        }),
      );
    expect(response.status).toBe(400);
  });
});

describe('PATCH/DELETE /admin/coupons/:id', () => {
  it('updates a coupon', async () => {
    const admin = await createUserWithRole('admin');
    await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(validCouponPayload());
    const coupon = await Coupon.findOne({});

    const response = await request(app)
      .patch(`/api/v1/admin/coupons/${String(coupon!._id)}`)
      .set('Cookie', admin.cookie)
      .send({ description: 'Updated copy' });

    expect(response.status).toBe(200);
    expect(bodyOf<{ coupon: { description: string } }>(response).data!.coupon.description).toBe(
      'Updated copy',
    );
  });

  it('deactivates rather than deletes', async () => {
    const admin = await createUserWithRole('admin');
    await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(validCouponPayload());
    const coupon = await Coupon.findOne({});

    const response = await request(app)
      .delete(`/api/v1/admin/coupons/${String(coupon!._id)}`)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const stillExists = await Coupon.findById(coupon!._id);
    expect(stillExists).not.toBeNull();
    expect(stillExists!.isActive).toBe(false);
  });
});

describe('GET /admin/coupons/:id/redemptions', () => {
  it('lists redemptions with populated user and order info', async () => {
    const admin = await createUserWithRole('admin');
    const customer = await createUserWithRole('customer');
    await request(app)
      .post('/api/v1/admin/coupons')
      .set('Cookie', admin.cookie)
      .send(validCouponPayload());
    const coupon = await Coupon.findOne({});
    const order = await Order.create({
      orderNumber: 'ORD-TEST-1',
      userId: customer.id,
      type: 'standard',
      status: 'PLACED',
      items: [],
      pricing: {
        itemsSubtotal: 1000,
        expressSurcharge: 0,
        deliveryFee: 0,
        pickupFee: 0,
        smallOrderFee: 0,
        discountAmount: 100,
        taxAmount: 0,
        walletApplied: 0,
        grandTotal: 900,
        amountPaid: 0,
        amountRefunded: 0,
      },
      pickupAddress: {
        label: 'other',
        contactName: 'Test',
        contactPhone: '+919000000000',
        line1: '1 Test Lane',
        area: 'Test Area',
        city: 'Srinagar',
        state: 'Jammu and Kashmir',
        pincode: '190001',
      },
      deliveryAddress: {
        label: 'other',
        contactName: 'Test',
        contactPhone: '+919000000000',
        line1: '1 Test Lane',
        area: 'Test Area',
        city: 'Srinagar',
        state: 'Jammu and Kashmir',
        pincode: '190001',
      },
      pickupSlot: { date: '2026-06-01', window: '09:00-11:00', label: '9-11', areaId: coupon!._id },
      deliverySlot: {
        date: '2026-06-04',
        window: '09:00-11:00',
        label: '9-11',
        areaId: coupon!._id,
      },
      isExpress: false,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      statusHistory: [],
      internalNotes: [],
      source: 'web',
    });
    await CouponRedemption.create({
      couponId: coupon!._id,
      userId: customer.id,
      orderId: order._id,
      discountAmount: 100,
    });

    const response = await request(app)
      .get(`/api/v1/admin/coupons/${String(coupon!._id)}/redemptions`)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const redemptions = bodyOf<{
      redemptions: { discountAmount: number; orderId: { orderNumber: string } }[];
    }>(response).data!.redemptions;
    expect(redemptions).toHaveLength(1);
    expect(redemptions[0]!.discountAmount).toBe(100);
    expect(redemptions[0]!.orderId.orderNumber).toBe('ORD-TEST-1');
  });
});
