import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Order } from '../src/models/Order.js';
import { Review } from '../src/models/Review.js';
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
    name: 'Test User',
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

async function createReview(overrides: Partial<Record<string, unknown>> = {}) {
  const customer = await createUserWithRole('customer');
  const order = await Order.create({
    orderNumber: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
    userId: customer.id,
    status: 'DELIVERED',
    items: [],
    pricing: { itemsSubtotal: 1000, grandTotal: 1000 },
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
    pickupSlot: { date: '2026-09-10', window: '09:00-11:00', label: '9-11am', areaId: customer.id },
    deliverySlot: {
      date: '2026-09-12',
      window: '09:00-11:00',
      label: '9-11am',
      areaId: customer.id,
    },
    paymentMethod: 'cod',
    paymentStatus: 'pending',
  });
  return Review.create({
    orderId: order._id,
    userId: customer.id,
    rating: 5,
    comment: 'Great service',
    ...overrides,
  });
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Order.deleteMany({}),
    Review.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('admin review role gating', () => {
  it('lets staff read but rejects staff moderation', async () => {
    const staff = await createUserWithRole('staff');
    const review = await createReview();

    const list = await request(app).get('/api/v1/admin/reviews').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const moderate = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', staff.cookie)
      .send({ action: 'approve' });
    expect(moderate.status).toBe(403);
  });
});

describe('PATCH /admin/reviews/:id', () => {
  it('approves a pending review and records who moderated it', async () => {
    const admin = await createUserWithRole('admin');
    const review = await createReview({ status: 'pending' });

    const response = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'approve' });

    expect(response.status).toBe(200);
    const updated = await Review.findById(review._id);
    expect(updated!.status).toBe('approved');
    expect(String(updated!.moderatedBy)).toBe(admin.id);
  });

  it('rejects a review requiring a reason, and keeps the reason only in the audit trail', async () => {
    const admin = await createUserWithRole('admin');
    const review = await createReview({ status: 'pending' });

    const missingReason = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'reject' });
    expect(missingReason.status).toBe(400);

    const response = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'reject', reason: 'Spam content' });
    expect(response.status).toBe(200);

    const updated = await Review.findById(review._id);
    expect(updated!.status).toBe('rejected');

    const log = await AuditLog.findOne({ action: 'review.reject' }).lean();
    expect((log!.after as { reason: string }).reason).toBe('Spam content');
  });

  it('sets a public reply', async () => {
    const admin = await createUserWithRole('admin');
    const review = await createReview({ status: 'approved' });

    const response = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'reply', reply: 'Thank you for your feedback!' });

    expect(response.status).toBe(200);
    expect((await Review.findById(review._id))!.adminReply).toBe('Thank you for your feedback!');
  });

  it('rejects featuring a review that is not yet approved', async () => {
    const admin = await createUserWithRole('admin');
    const review = await createReview({ status: 'pending' });

    const response = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'feature' });

    expect(response.status).toBe(422);
    expect(bodyOf(response).error!.code).toBe('REVIEW_NOT_APPROVED');
  });

  it('features an approved review', async () => {
    const admin = await createUserWithRole('admin');
    const review = await createReview({ status: 'approved' });

    const response = await request(app)
      .patch(`/api/v1/admin/reviews/${String(review._id)}`)
      .set('Cookie', admin.cookie)
      .send({ action: 'feature' });

    expect(response.status).toBe(200);
    expect((await Review.findById(review._id))!.isFeatured).toBe(true);
  });
});

describe('GET /reviews (public)', () => {
  it('only returns approved reviews, and filters to featured when asked', async () => {
    await createReview({ status: 'pending' });
    const approved = await createReview({ status: 'approved', isFeatured: false });
    const featured = await createReview({ status: 'approved', isFeatured: true });

    const all = await request(app).get('/api/v1/reviews');
    expect(all.status).toBe(200);
    const allIds = bodyOf<{ reviews: { id: string }[] }>(all).data!.reviews.map((r) => r.id);
    expect(allIds).toContain(String(approved._id));
    expect(allIds).toContain(String(featured._id));

    const featuredOnly = await request(app).get('/api/v1/reviews').query({ featured: 'true' });
    const featuredIds = bodyOf<{ reviews: { id: string }[] }>(featuredOnly).data!.reviews.map(
      (r) => r.id,
    );
    expect(featuredIds).toEqual([String(featured._id)]);
  });
});
