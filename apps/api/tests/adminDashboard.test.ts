import { Types } from 'mongoose';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Address } from '../src/models/Address.js';
import { Counter } from '../src/models/Counter.js';
import { Lead } from '../src/models/Lead.js';
import { Order } from '../src/models/Order.js';
import { Review } from '../src/models/Review.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { ServiceItem } from '../src/models/ServiceItem.js';
import { SlotCapacity } from '../src/models/SlotCapacity.js';
import { SlotTemplate } from '../src/models/SlotTemplate.js';
import { User } from '../src/models/User.js';
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

async function createCategoryAndItem(price = 40_000) {
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
    price,
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
}) {
  return SlotTemplate.create({
    type: opts.type,
    dayOfWeek: dayOfWeekOfDateString(opts.date),
    window: opts.window,
    label: opts.window,
    capacity: 15,
    cutoffMinutesBefore: 0,
    isActive: true,
    areaIds: [],
  });
}

function futureDates(): { pickupDate: string; deliveryDate: string } {
  const today = nowInKolkata().dateString;
  return { pickupDate: addDaysToDateString(today, 1), deliveryDate: addDaysToDateString(today, 4) };
}

async function manualOrderPayload(overrides: {
  pincode: string;
  itemId: string;
  pickupDate: string;
  deliveryDate: string;
  quantity?: number;
}) {
  const window = '09:00-11:00';
  await createSlotTemplate({ type: 'pickup', date: overrides.pickupDate, window });
  await createSlotTemplate({ type: 'delivery', date: overrides.deliveryDate, window });
  phoneSeed += 1;
  // Must be a plausible 10-digit Indian mobile number (starts 6-9) so it survives normalizePhoneIN.
  const phone = `+9195${String(phoneSeed).padStart(8, '0')}`;
  return {
    customerPhone: phone,
    customerName: 'Phone Customer',
    items: [{ serviceItemId: overrides.itemId, quantity: overrides.quantity ?? 1 }],
    pickupAddress: {
      contactName: 'Phone Customer',
      contactPhone: phone,
      line1: '1 Test Lane',
      area: 'Test Area',
      city: 'Srinagar',
      pincode: overrides.pincode,
    },
    deliveryAddress: {
      contactName: 'Phone Customer',
      contactPhone: phone,
      line1: '1 Test Lane',
      area: 'Test Area',
      city: 'Srinagar',
      pincode: overrides.pincode,
    },
    pickupSlot: { date: overrides.pickupDate, window },
    deliverySlot: { date: overrides.deliveryDate, window },
  };
}

/** Minimal-but-valid Order fixture for aggregation/needs-attention tests that don't go through checkout. */
async function createRawOrder(overrides: {
  areaId: Types.ObjectId;
  status?: string;
  paymentStatus?: string;
  grandTotal?: number;
  createdAt?: Date;
  updatedAt?: Date;
  priceRevision?: {
    requiresApproval: boolean;
    originalTotal: number;
    revisedTotal: number;
    reason: string;
  };
  categoryName?: string;
  lineTotal?: number;
}) {
  const counter = await Counter.findOneAndUpdate(
    { _id: 'orderNumber' },
    { $inc: { seq: 1 } },
    { upsert: true, new: true },
  );
  const user = await User.create({
    phone: `+9194${String(counter.seq).padStart(7, '0')}`,
    phoneVerified: true,
    role: 'customer',
  });
  const grandTotal = overrides.grandTotal ?? 40_000;
  const addr = {
    label: 'other',
    contactName: 'Test',
    contactPhone: '+919000000000',
    line1: '1 Test Lane',
    area: 'Test Area',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode: '190001',
  };
  const slot = {
    date: nowInKolkata().dateString,
    window: '09:00-11:00',
    label: '09:00-11:00',
    areaId: overrides.areaId,
  };
  const order = await Order.create({
    orderNumber: `ORD-TEST-${counter.seq}`,
    userId: user._id,
    type: 'standard',
    status: overrides.status ?? 'PLACED',
    items: overrides.categoryName
      ? [
          {
            serviceItemId: new Types.ObjectId(),
            categoryId: new Types.ObjectId(),
            name: 'Test Item',
            categoryName: overrides.categoryName,
            unit: 'piece',
            unitPrice: overrides.lineTotal ?? grandTotal,
            quantity: 1,
            taxRatePercent: 0,
            lineTotal: overrides.lineTotal ?? grandTotal,
            addedBy: 'customer',
            isAdjusted: false,
          },
        ]
      : [],
    pricing: {
      itemsSubtotal: grandTotal,
      expressSurcharge: 0,
      deliveryFee: 0,
      pickupFee: 0,
      smallOrderFee: 0,
      discountAmount: 0,
      taxAmount: 0,
      walletApplied: 0,
      grandTotal,
      amountPaid: 0,
      amountRefunded: 0,
    },
    pickupAddress: addr,
    deliveryAddress: addr,
    pickupSlot: slot,
    deliverySlot: slot,
    isExpress: false,
    paymentMethod: 'cod',
    paymentStatus: overrides.paymentStatus ?? 'pending',
    statusHistory: [],
    internalNotes: [],
    source: 'admin',
    ...(overrides.priceRevision ? { priceRevision: overrides.priceRevision } : {}),
  });
  if (overrides.createdAt || overrides.updatedAt) {
    // {timestamps: false} stops Mongoose from stamping its own `updatedAt: now`
    // over the backdated value we're explicitly setting here.
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
          ...(overrides.updatedAt ? { updatedAt: overrides.updatedAt } : {}),
        },
      },
      { timestamps: false },
    );
  }
  return order;
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
    Counter.deleteMany({}),
    Review.deleteMany({}),
    Lead.deleteMany({}),
  ]);
});

describe('POST /admin/orders (manual order creation)', () => {
  it('rejects a customer token with 403', async () => {
    const customer = await createUserWithRole('customer');
    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', customer.cookie)
      .send({});
    expect(response.status).toBe(403);
  });

  it('creates a new customer account from the phone number and places a COD order', async () => {
    const staff = await createUserWithRole('staff');
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await createArea(pincode);
    const { item } = await createCategoryAndItem();
    const { pickupDate, deliveryDate } = futureDates();
    const payload = await manualOrderPayload({
      pincode,
      itemId: String(item._id),
      pickupDate,
      deliveryDate,
    });

    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', staff.cookie)
      .send(payload);

    expect(response.status).toBe(201);
    const order = bodyOf<{
      order: { orderNumber: string; status: string; paymentMethod: string; source: string };
    }>(response).data!.order;
    expect(order.status).toBe('PLACED');
    expect(order.paymentMethod).toBe('cod');
    expect(order.source).toBe('admin');

    const customer = await User.findOne({ phone: payload.customerPhone });
    expect(customer).not.toBeNull();
    expect(customer!.name).toBe('Phone Customer');
  });

  it('reuses an existing customer found by phone rather than creating a duplicate', async () => {
    const staff = await createUserWithRole('staff');
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await createArea(pincode);
    const { item } = await createCategoryAndItem();
    const { pickupDate, deliveryDate } = futureDates();
    const payload = await manualOrderPayload({
      pincode,
      itemId: String(item._id),
      pickupDate,
      deliveryDate,
    });
    const existing = await User.create({
      phone: payload.customerPhone,
      phoneVerified: true,
      role: 'customer',
      name: 'Existing Name',
    });

    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', staff.cookie)
      .send(payload);

    expect(response.status).toBe(201);
    const order = bodyOf<{ order: { userId: string } }>(response).data!.order;
    expect(order.userId).toBe(String(existing._id));
    expect(await User.countDocuments({ phone: payload.customerPhone })).toBe(1);
  });

  it('rejects a subtotal below the minimum order value with MIN_ORDER_NOT_MET', async () => {
    const staff = await createUserWithRole('staff');
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await createArea(pincode);
    const { item } = await createCategoryAndItem(10_000);
    const { pickupDate, deliveryDate } = futureDates();
    const payload = await manualOrderPayload({
      pincode,
      itemId: String(item._id),
      pickupDate,
      deliveryDate,
    });

    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', staff.cookie)
      .send(payload);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('MIN_ORDER_NOT_MET');
  });

  it('rejects a grand total above the COD cap with COD_LIMIT_EXCEEDED', async () => {
    const staff = await createUserWithRole('staff');
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await createArea(pincode);
    const { item } = await createCategoryAndItem(600_000);
    const { pickupDate, deliveryDate } = futureDates();
    const payload = await manualOrderPayload({
      pincode,
      itemId: String(item._id),
      pickupDate,
      deliveryDate,
    });

    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', staff.cookie)
      .send(payload);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('COD_LIMIT_EXCEEDED');
  });

  it('rejects a delivery date earlier than the earliest possible turnaround', async () => {
    const staff = await createUserWithRole('staff');
    const pincode = `19${String(Math.floor(Math.random() * 9000) + 1000)}`;
    await createArea(pincode);
    const { item } = await createCategoryAndItem();
    const today = nowInKolkata().dateString;
    const pickupDate = addDaysToDateString(today, 1);
    const payload = await manualOrderPayload({
      pincode,
      itemId: String(item._id),
      pickupDate,
      deliveryDate: pickupDate,
    });

    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', staff.cookie)
      .send(payload);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('INVALID_DELIVERY_DATE');
  });

  it('rejects an address pincode outside any service area', async () => {
    const staff = await createUserWithRole('staff');
    const { item } = await createCategoryAndItem();
    const { pickupDate, deliveryDate } = futureDates();
    const payload = await manualOrderPayload({
      pincode: '999999',
      itemId: String(item._id),
      pickupDate,
      deliveryDate,
    });

    const response = await request(app)
      .post('/api/v1/admin/orders')
      .set('Cookie', staff.cookie)
      .send(payload);

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('ADDRESS_NOT_SERVICEABLE');
  });
});

describe('GET /admin/dashboard', () => {
  it('rejects a customer token with 403', async () => {
    const customer = await createUserWithRole('customer');
    const response = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Cookie', customer.cookie);
    expect(response.status).toBe(403);
  });

  it('returns the full stats/needsAttention/charts/today shape for staff', async () => {
    const staff = await createUserWithRole('staff');
    const response = await request(app).get('/api/v1/admin/dashboard').set('Cookie', staff.cookie);

    expect(response.status).toBe(200);
    const data = bodyOf<{
      stats: { revenue: { current: number; previous: number } };
      needsAttention: unknown[];
      charts: { revenueOverTime: unknown[]; ordersByStatus: unknown[]; popularServices: unknown[] };
      today: {
        pickupsDue: number;
        deliveriesDue: number;
        inFacility: number;
        agentsOnShift: number;
      };
    }>(response).data!;
    expect(data.stats.revenue).toEqual({ current: 0, previous: 0 });
    expect(Array.isArray(data.needsAttention)).toBe(true);
    expect(Array.isArray(data.charts.revenueOverTime)).toBe(true);
    expect(Array.isArray(data.charts.ordersByStatus)).toBe(true);
    expect(Array.isArray(data.charts.popularServices)).toBe(true);
    expect(typeof data.today.pickupsDue).toBe('number');
  });

  it('counts a non-cancelled order placed within the range toward revenue and ordersPlaced', async () => {
    const staff = await createUserWithRole('staff');
    const area = await createArea(`19${String(Math.floor(Math.random() * 9000) + 1000)}`);
    await createRawOrder({ areaId: area._id, grandTotal: 40_000 });

    const response = await request(app)
      .get('/api/v1/admin/dashboard?range=day')
      .set('Cookie', staff.cookie);

    expect(response.status).toBe(200);
    const stats = bodyOf<{
      stats: { revenue: { current: number }; ordersPlaced: { current: number } };
    }>(response).data!.stats;
    expect(stats.revenue.current).toBe(40_000);
    expect(stats.ordersPlaced.current).toBe(1);
  });

  it('flags a failed payment within 24h in the needs-attention queue', async () => {
    const staff = await createUserWithRole('staff');
    const area = await createArea(`19${String(Math.floor(Math.random() * 9000) + 1000)}`);
    await createRawOrder({ areaId: area._id, paymentStatus: 'failed' });

    const response = await request(app).get('/api/v1/admin/dashboard').set('Cookie', staff.cookie);

    expect(response.status).toBe(200);
    const needsAttention = bodyOf<{ needsAttention: { key: string; count: number }[] }>(response)
      .data!.needsAttention;
    const failedPayments = needsAttention.find((i) => i.key === 'failed_payments');
    expect(failedPayments?.count).toBe(1);
  });

  it('flags a price revision awaiting approval for more than 2h in the needs-attention queue', async () => {
    const staff = await createUserWithRole('staff');
    const area = await createArea(`19${String(Math.floor(Math.random() * 9000) + 1000)}`);
    await createRawOrder({
      areaId: area._id,
      priceRevision: {
        requiresApproval: true,
        originalTotal: 40_000,
        revisedTotal: 50_000,
        reason: 'test',
      },
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    });

    const response = await request(app).get('/api/v1/admin/dashboard').set('Cookie', staff.cookie);

    expect(response.status).toBe(200);
    const needsAttention = bodyOf<{ needsAttention: { key: string; count: number }[] }>(response)
      .data!.needsAttention;
    const pendingRevisions = needsAttention.find((i) => i.key === 'pending_revisions');
    expect(pendingRevisions?.count).toBe(1);
  });

  it('includes popular services aggregated from order line items', async () => {
    const staff = await createUserWithRole('staff');
    const area = await createArea(`19${String(Math.floor(Math.random() * 9000) + 1000)}`);
    await createRawOrder({ areaId: area._id, categoryName: 'Dry Cleaning', lineTotal: 40_000 });

    const response = await request(app)
      .get('/api/v1/admin/dashboard?range=day')
      .set('Cookie', staff.cookie);

    expect(response.status).toBe(200);
    const popularServices = bodyOf<{
      charts: { popularServices: { name: string; revenue: number }[] };
    }>(response).data!.charts.popularServices;
    expect(popularServices.some((s) => s.name === 'Dry Cleaning' && s.revenue === 40_000)).toBe(
      true,
    );
  });
});
