import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { PriceHistory } from '../src/models/PriceHistory.js';
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
async function createUserWithRole(role: 'customer' | 'staff' | 'admin' | 'superadmin') {
  phoneSeed += 1;
  const user = await User.create({
    phone: `+9196${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

let slugSeed = 0;
function uniqueSlug(prefix: string): string {
  slugSeed += 1;
  return `${prefix}-${Date.now()}-${slugSeed}`;
}

async function createCategory(overrides: Partial<{ isActive: boolean }> = {}) {
  return ServiceCategory.create({
    name: 'Test Category',
    slug: uniqueSlug('test-category'),
    description: 'd',
    shortDescription: 'sd',
    icon: 'Shirt',
    turnaroundHours: 48,
    expressAvailable: true,
    isActive: overrides.isActive ?? true,
  });
}

async function createItem(
  categoryId: unknown,
  overrides: Partial<{ price: number; isActive: boolean }> = {},
) {
  return ServiceItem.create({
    categoryId,
    name: 'Test Shirt',
    slug: uniqueSlug('test-shirt'),
    unit: 'piece',
    price: overrides.price ?? 40_000,
    taxRatePercent: 0,
    minQuantity: 1,
    maxQuantity: 99,
    isActive: overrides.isActive ?? true,
  });
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    ServiceCategory.deleteMany({}),
    ServiceItem.deleteMany({}),
    PriceHistory.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('admin catalog role gating', () => {
  it('lets staff read categories and items but rejects mutations', async () => {
    const staff = await createUserWithRole('staff');
    const listCategories = await request(app)
      .get('/api/v1/admin/services')
      .set('Cookie', staff.cookie);
    expect(listCategories.status).toBe(200);
    const listItems = await request(app).get('/api/v1/admin/items').set('Cookie', staff.cookie);
    expect(listItems.status).toBe(200);

    const createResponse = await request(app)
      .post('/api/v1/admin/services')
      .set('Cookie', staff.cookie)
      .send({ name: 'x' });
    expect(createResponse.status).toBe(403);
  });

  it('rejects a customer entirely', async () => {
    const customer = await createUserWithRole('customer');
    const response = await request(app)
      .get('/api/v1/admin/services')
      .set('Cookie', customer.cookie);
    expect(response.status).toBe(403);
  });
});

describe('POST/PATCH/DELETE /admin/services (categories)', () => {
  it('creates a category with an auto-incremented sortOrder', async () => {
    const admin = await createUserWithRole('admin');
    await createCategory();

    const response = await request(app)
      .post('/api/v1/admin/services')
      .set('Cookie', admin.cookie)
      .send({
        name: 'Dry Cleaning',
        slug: `dry-cleaning-${Date.now()}`,
        description: 'd',
        shortDescription: 'sd',
        icon: 'Shirt',
        turnaroundHours: 48,
      });

    expect(response.status).toBe(201);
    const category = bodyOf<{ category: { sortOrder: number } }>(response).data!.category;
    expect(category.sortOrder).toBe(1);
    expect(await AuditLog.countDocuments({ action: 'category.create' })).toBe(1);
  });

  it('rejects creating a category with a slug already in use', async () => {
    const admin = await createUserWithRole('admin');
    const existing = await createCategory();

    const response = await request(app)
      .post('/api/v1/admin/services')
      .set('Cookie', admin.cookie)
      .send({
        name: 'Dupe',
        slug: existing.slug,
        description: 'd',
        shortDescription: 'sd',
        icon: 'Shirt',
        turnaroundHours: 48,
      });

    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('SLUG_TAKEN');
  });

  it('reorders categories', async () => {
    const admin = await createUserWithRole('admin');
    const a = await createCategory();
    const b = await createCategory();

    const response = await request(app)
      .post('/api/v1/admin/services/reorder')
      .set('Cookie', admin.cookie)
      .send({ orderedIds: [String(b._id), String(a._id)] });

    expect(response.status).toBe(200);
    expect((await ServiceCategory.findById(b._id))!.sortOrder).toBe(0);
    expect((await ServiceCategory.findById(a._id))!.sortOrder).toBe(1);
  });

  it('warns instead of deactivating when active items would be orphaned, then deactivates with force', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    await createItem(category._id);

    const blocked = await request(app)
      .delete(`/api/v1/admin/services/${String(category._id)}`)
      .set('Cookie', admin.cookie);
    expect(blocked.status).toBe(409);
    expect(bodyOf(blocked).error!.code).toBe('CATEGORY_HAS_ACTIVE_ITEMS');
    expect(bodyOf(blocked).error!.orphanedItemCount).toBe(1);

    const forced = await request(app)
      .delete(`/api/v1/admin/services/${String(category._id)}?force=true`)
      .set('Cookie', admin.cookie);
    expect(forced.status).toBe(200);
    expect((await ServiceCategory.findById(category._id))!.isActive).toBe(false);
  });
});

describe('POST/PATCH/DELETE /admin/items', () => {
  it('creates an item and rejects a duplicate slug within the same category', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const payload = {
      categoryId: String(category._id),
      name: 'Shirt',
      slug: `shirt-${Date.now()}`,
      unit: 'piece' as const,
      price: 4000,
    };

    const first = await request(app)
      .post('/api/v1/admin/items')
      .set('Cookie', admin.cookie)
      .send(payload);
    expect(first.status).toBe(201);

    const dupe = await request(app)
      .post('/api/v1/admin/items')
      .set('Cookie', admin.cookie)
      .send(payload);
    expect(dupe.status).toBe(400);
    expect(bodyOf(dupe).error!.code).toBe('SLUG_TAKEN');
  });

  it('records a PriceHistory row when an update changes the price', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item = await createItem(category._id, { price: 4000 });

    const response = await request(app)
      .patch(`/api/v1/admin/items/${String(item._id)}`)
      .set('Cookie', admin.cookie)
      .send({ price: 5000 });

    expect(response.status).toBe(200);
    const history = await PriceHistory.find({ serviceItemId: item._id }).lean();
    expect(history).toHaveLength(1);
    expect(history[0]!.oldPrice).toBe(4000);
    expect(history[0]!.newPrice).toBe(5000);
  });

  it('does not record PriceHistory when a non-price field changes', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item = await createItem(category._id, { price: 4000 });

    await request(app)
      .patch(`/api/v1/admin/items/${String(item._id)}`)
      .set('Cookie', admin.cookie)
      .send({ careNote: 'Handle gently' });

    expect(await PriceHistory.countDocuments({ serviceItemId: item._id })).toBe(0);
  });

  it('returns price history newest-first', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item = await createItem(category._id, { price: 4000 });
    await request(app)
      .patch(`/api/v1/admin/items/${String(item._id)}`)
      .set('Cookie', admin.cookie)
      .send({ price: 5000 });
    await request(app)
      .patch(`/api/v1/admin/items/${String(item._id)}`)
      .set('Cookie', admin.cookie)
      .send({ price: 6000 });

    const response = await request(app)
      .get(`/api/v1/admin/items/${String(item._id)}/price-history`)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const history = bodyOf<{ history: { oldPrice: number; newPrice: number }[] }>(response).data!
      .history;
    expect(history.map((h) => h.newPrice)).toEqual([6000, 5000]);
  });

  it('bulk-deactivates and bulk-changes category', async () => {
    const admin = await createUserWithRole('admin');
    const categoryA = await createCategory();
    const categoryB = await createCategory();
    const item1 = await createItem(categoryA._id);
    const item2 = await createItem(categoryA._id);

    const deactivate = await request(app)
      .patch('/api/v1/admin/items/bulk-status')
      .set('Cookie', admin.cookie)
      .send({ itemIds: [String(item1._id), String(item2._id)], action: 'deactivate' });
    expect(deactivate.status).toBe(200);
    expect(bodyOf<{ updated: number }>(deactivate).data!.updated).toBe(2);

    const recategorize = await request(app)
      .patch('/api/v1/admin/items/bulk-category')
      .set('Cookie', admin.cookie)
      .send({ itemIds: [String(item1._id)], categoryId: String(categoryB._id) });
    expect(recategorize.status).toBe(200);
    expect((await ServiceItem.findById(item1._id))!.categoryId.toString()).toBe(
      String(categoryB._id),
    );
  });

  it('bulk-reprice preview does not write, commit does', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item = await createItem(category._id, { price: 10_000 });

    const preview = await request(app)
      .post('/api/v1/admin/items/bulk-reprice/preview')
      .set('Cookie', admin.cookie)
      .send({
        itemIds: [String(item._id)],
        mode: 'percentage',
        value: 10,
        reason: 'Seasonal increase',
      });
    expect(preview.status).toBe(200);
    expect(bodyOf<{ rows: { newPrice: number }[] }>(preview).data!.rows[0]!.newPrice).toBe(11_000);
    expect((await ServiceItem.findById(item._id))!.price).toBe(10_000);

    const commit = await request(app)
      .post('/api/v1/admin/items/bulk-reprice/commit')
      .set('Cookie', admin.cookie)
      .send({
        itemIds: [String(item._id)],
        mode: 'percentage',
        value: 10,
        reason: 'Seasonal increase',
      });
    expect(commit.status).toBe(200);
    expect((await ServiceItem.findById(item._id))!.price).toBe(11_000);
    expect(await PriceHistory.countDocuments({ serviceItemId: item._id })).toBe(1);
  });
});

describe('GET/PATCH /admin/pricing', () => {
  it('saves an atomic multi-row edit and records price history only for changed prices', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item1 = await createItem(category._id, { price: 4000 });
    const item2 = await createItem(category._id, { price: 6000 });

    const response = await request(app)
      .patch('/api/v1/admin/items/bulk-price')
      .set('Cookie', admin.cookie)
      .send({
        updates: [
          { itemId: String(item1._id), price: 4500 },
          { itemId: String(item2._id), isActive: false },
        ],
        reason: 'Grid edit',
      });

    expect(response.status).toBe(200);
    expect((await ServiceItem.findById(item1._id))!.price).toBe(4500);
    expect((await ServiceItem.findById(item2._id))!.isActive).toBe(false);
    expect(await PriceHistory.countDocuments({ serviceItemId: item1._id })).toBe(1);
    expect(await PriceHistory.countDocuments({ serviceItemId: item2._id })).toBe(0);
  });

  it('exports a CSV of the pricing grid', async () => {
    const staff = await createUserWithRole('staff');
    const category = await createCategory();
    await createItem(category._id, { price: 4000 });

    const response = await request(app)
      .get('/api/v1/admin/pricing/export.csv')
      .set('Cookie', staff.cookie);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toContain('itemId,category,name,price');
    expect(response.text).toContain('Test Shirt');
  });
});

describe('POST /admin/pricing/import', () => {
  it('previews validation without writing, then commits', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item = await createItem(category._id, { price: 4000 });

    const preview = await request(app)
      .post('/api/v1/admin/pricing/import/preview')
      .set('Cookie', admin.cookie)
      .send({
        rows: [
          { itemId: String(item._id), price: 5000 },
          { itemId: '000000000000000000000000', price: 1000 },
        ],
      });
    expect(preview.status).toBe(200);
    const rows = bodyOf<{ rows: { valid: boolean }[] }>(preview).data!.rows;
    expect(rows[0]!.valid).toBe(true);
    expect(rows[1]!.valid).toBe(false);
    expect((await ServiceItem.findById(item._id))!.price).toBe(4000);

    const commit = await request(app)
      .post('/api/v1/admin/pricing/import/commit')
      .set('Cookie', admin.cookie)
      .send({ rows: [{ itemId: String(item._id), price: 5000 }] });
    expect(commit.status).toBe(200);
    expect((await ServiceItem.findById(item._id))!.price).toBe(5000);
  });

  it('rejects a commit containing any invalid row without writing anything', async () => {
    const admin = await createUserWithRole('admin');
    const category = await createCategory();
    const item = await createItem(category._id, { price: 4000 });

    const response = await request(app)
      .post('/api/v1/admin/pricing/import/commit')
      .set('Cookie', admin.cookie)
      .send({
        rows: [
          { itemId: String(item._id), price: 5000 },
          { itemId: '000000000000000000000000', price: 1000 },
        ],
      });

    expect(response.status).toBe(400);
    expect((await ServiceItem.findById(item._id))!.price).toBe(4000);
  });
});
