import type { CouponValidateResult } from '@clenzy/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Coupon } from '../src/models/Coupon.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { ServiceItem } from '../src/models/ServiceItem.js';
import { User } from '../src/models/User.js';
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
async function createUser(): Promise<{ id: string; cookie: string }> {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9192000${String(phoneSeed).padStart(5, '0')}`,
    phoneVerified: true,
    role: 'customer',
  });
  const token = signAccessToken(String(user._id), 'customer');
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

async function createItem() {
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
  return ServiceItem.create({
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
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    ServiceCategory.deleteMany({}),
    ServiceItem.deleteMany({}),
    Coupon.deleteMany({}),
  ]);
});

describe('POST /coupons/validate', () => {
  it('computes a flat discount for a valid coupon', async () => {
    const user = await createUser();
    const item = await createItem();
    await Coupon.create({
      code: 'FLAT50',
      description: 'Flat 50',
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
      .post('/api/v1/coupons/validate')
      .set('Cookie', user.cookie)
      .send({
        code: 'flat50',
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        subtotal: 40_000,
      });

    expect(response.status).toBe(200);
    const result = bodyOf<CouponValidateResult>(response).data!;
    expect(result.discountAmount).toBe(5_000);
    expect(result.newTotal).toBe(35_000);
  });

  it('returns 404 for a code that does not exist', async () => {
    const user = await createUser();
    const item = await createItem();
    const response = await request(app)
      .post('/api/v1/coupons/validate')
      .set('Cookie', user.cookie)
      .send({
        code: 'NOPE',
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        subtotal: 40_000,
      });
    expect(response.status).toBe(404);
  });

  it('rejects an order below the coupon minimum with a shortfall amount', async () => {
    const user = await createUser();
    const item = await createItem();
    await Coupon.create({
      code: 'BIGORDER',
      description: 'Needs a big order',
      discountType: 'flat',
      discountValue: 5_000,
      minOrderValue: 100_000,
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
      .post('/api/v1/coupons/validate')
      .set('Cookie', user.cookie)
      .send({
        code: 'BIGORDER',
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        subtotal: 40_000,
      });

    expect(response.status).toBe(422);
    const error = bodyOf(response).error!;
    expect(error.code).toBe('COUPON_MIN_ORDER_NOT_MET');
    expect(error.shortfallAmount).toBe(60_000);
  });

  it('rejects an expired coupon', async () => {
    const user = await createUser();
    const item = await createItem();
    await Coupon.create({
      code: 'EXPIRED',
      description: 'Expired',
      discountType: 'flat',
      discountValue: 5_000,
      minOrderValue: 0,
      validFrom: new Date('2020-01-01'),
      validUntil: new Date('2020-06-01'),
      usageLimitPerUser: 1,
      firstOrderOnly: false,
      applicableCategories: [],
      applicableAreas: [],
      restrictedToUsers: [],
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/coupons/validate')
      .set('Cookie', user.cookie)
      .send({
        code: 'EXPIRED',
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        subtotal: 40_000,
      });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('COUPON_EXPIRED');
  });
});
