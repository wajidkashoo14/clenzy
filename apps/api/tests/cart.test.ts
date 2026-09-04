import type { CartEstimateResult } from '@clenzy/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { ServiceItem } from '../src/models/ServiceItem.js';

const app = createApp();

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Supertest types `response.body` as `any` — cast to the envelope shape at the point of use. */
function bodyOf(response: request.Response): ApiEnvelope<CartEstimateResult> {
  return response.body as ApiEnvelope<CartEstimateResult>;
}

async function seedCategory() {
  return ServiceCategory.create({
    name: 'Test Category',
    slug: `test-category-${Date.now()}-${Math.random()}`,
    description: 'd',
    shortDescription: 'sd',
    icon: 'Shirt',
    turnaroundHours: 48,
    expressAvailable: true,
    isActive: true,
  });
}

afterEach(async () => {
  await Promise.all([ServiceItem.deleteMany({}), ServiceCategory.deleteMany({})]);
});

describe('POST /cart/estimate', () => {
  it('prices a single item at its base price', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Shirt',
      slug: 'shirt',
      unit: 'piece',
      price: 4000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 2 }] });

    expect(response.status).toBe(200);
    const data = bodyOf(response).data!;
    expect(data.items).toEqual([
      expect.objectContaining({ unitPrice: 4000, quantity: 2, lineTotal: 8000 }),
    ]);
    expect(data.itemsSubtotal).toBe(8000);
    expect(data.expressSurcharge).toBe(0);
    expect(data.couponDiscount).toBe(0);
  });

  it('clamps quantity to the item minQuantity/maxQuantity', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Carpet sqft',
      slug: 'carpet-sqft',
      unit: 'sqft',
      price: 2500,
      taxRatePercent: 0,
      minQuantity: 5,
      maxQuantity: 20,
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 1 }] });

    expect(response.status).toBe(200);
    expect(bodyOf(response).data!.items[0]).toMatchObject({
      quantity: 5,
      unitPrice: 2500,
      lineTotal: 12500,
    });
  });

  it('uses tiered pricing once the quantity qualifies', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Bulk shirt',
      slug: 'bulk-shirt',
      unit: 'piece',
      price: 4000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      tieredPricing: [
        { minQty: 5, unitPrice: 3500 },
        { minQty: 10, unitPrice: 3000 },
      ],
      isActive: true,
    });

    const below = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 3 }] });
    expect(bodyOf(below).data!.items[0].unitPrice).toBe(4000);

    const midTier = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 5 }] });
    expect(bodyOf(midTier).data!.items[0].unitPrice).toBe(3500);

    const topTier = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 12 }] });
    expect(bodyOf(topTier).data!.items[0].unitPrice).toBe(3000);
  });

  it('applies the global express surcharge with its minimum floor', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Shirt',
      slug: 'shirt',
      unit: 'piece',
      price: 4000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
    });

    // subtotal 4000 * 1 = 4000; 40% would be 1600, below the 9900 floor.
    const small = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 1 }], isExpress: true });
    expect(bodyOf(small).data!.expressSurcharge).toBe(9900);

    // subtotal 4000 * 10 = 40000; 40% = 16000, above the floor.
    const large = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 10 }], isExpress: true });
    expect(bodyOf(large).data!.expressSurcharge).toBe(16000);

    const notExpress = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 10 }] });
    expect(bodyOf(notExpress).data!.expressSurcharge).toBe(0);
  });

  it('uses the per-item express price instead of the global surcharge when set', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Pheran',
      slug: 'pheran',
      unit: 'piece',
      price: 30000,
      expressPrice: 40000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 1 }], isExpress: true });

    const data = bodyOf(response).data!;
    expect(data.items[0].unitPrice).toBe(40000);
    expect(data.expressSurcharge).toBe(0);
  });

  it('charges delivery below the free threshold and waives it above', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Towel',
      slug: 'towel',
      unit: 'piece',
      price: 3000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
    });

    const below = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 1 }] });
    expect(bodyOf(below).data!.deliveryFee).toBe(4900);
    expect(bodyOf(below).data!.meetsMinimumOrder).toBe(false);

    const above = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 200 }] });
    expect(bodyOf(above).data!.deliveryFee).toBe(0);
    expect(bodyOf(above).data!.meetsMinimumOrder).toBe(true);
  });

  it('computes tax per line at the item’s own rate', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Suit',
      slug: 'suit',
      unit: 'set',
      price: 35000,
      taxRatePercent: 18,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 1 }] });

    const data = bodyOf(response).data!;
    expect(data.taxTotal).toBe(6300); // 18% of 35000
    expect(data.grandTotal).toBe(35000 + 6300 + 4900);
  });

  it('rejects an item that is inactive', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Discontinued',
      slug: 'discontinued',
      unit: 'piece',
      price: 1000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: false,
    });

    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: String(item._id), quantity: 1 }] });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('ITEM_INACTIVE');
  });

  it('returns 404 for an item that does not exist', async () => {
    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: '6a9a71bb62fcb4416a48df43', quantity: 1 }] });

    expect(response.status).toBe(404);
  });

  it('rejects an item not available in the requested area', async () => {
    const category = await seedCategory();
    const item = await ServiceItem.create({
      categoryId: category._id,
      name: 'Zone-restricted',
      slug: 'zone-restricted',
      unit: 'piece',
      price: 1000,
      taxRatePercent: 0,
      minQuantity: 1,
      maxQuantity: 99,
      isActive: true,
      availableInAreas: ['6a9a71bb62fcb4416a48df7d'],
    });

    const wrongArea = await request(app)
      .post('/api/v1/cart/estimate')
      .send({
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        areaId: '6a9a71bb62fcb4416a48dfff',
      });
    expect(wrongArea.status).toBe(422);
    expect(bodyOf(wrongArea).error!.code).toBe('ITEM_NOT_AVAILABLE_IN_AREA');

    const rightArea = await request(app)
      .post('/api/v1/cart/estimate')
      .send({
        items: [{ serviceItemId: String(item._id), quantity: 1 }],
        areaId: '6a9a71bb62fcb4416a48df7d',
      });
    expect(rightArea.status).toBe(200);
  });

  it('rejects a malformed payload instead of matching arbitrary data', async () => {
    const response = await request(app)
      .post('/api/v1/cart/estimate')
      .send({ items: [{ serviceItemId: { $ne: null }, quantity: 1 }] });
    expect(response.status).toBe(400);
  });

  it('returns a zero total for an empty cart without charging delivery', async () => {
    const response = await request(app).post('/api/v1/cart/estimate').send({ items: [] });

    expect(response.status).toBe(200);
    const data = bodyOf(response).data!;
    expect(data.grandTotal).toBe(0);
    expect(data.deliveryFee).toBe(0);
  });
});
