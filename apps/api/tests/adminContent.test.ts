import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Banner } from '../src/models/Banner.js';
import { Faq } from '../src/models/Faq.js';
import { Testimonial } from '../src/models/Testimonial.js';
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
    phone: `+9198${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Faq.deleteMany({}),
    Testimonial.deleteMany({}),
    Banner.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

describe('admin content role gating', () => {
  it('lets staff read but rejects staff mutations', async () => {
    const staff = await createUserWithRole('staff');
    const list = await request(app).get('/api/v1/admin/content/faqs').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/v1/admin/content/faqs')
      .set('Cookie', staff.cookie)
      .send({ question: 'Q?', answer: 'A.', category: 'general' });
    expect(create.status).toBe(403);
  });
});

describe('FAQs', () => {
  it('creates an FAQ and strips unsafe HTML from the rich-text answer', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/content/faqs')
      .set('Cookie', admin.cookie)
      .send({
        question: 'Do you serve Sundays?',
        answer: '<p>Yes</p><script>alert(1)</script><img src=x onerror=alert(1)>',
        category: 'general',
      });

    expect(response.status).toBe(201);
    const faq = await Faq.findOne({ question: 'Do you serve Sundays?' });
    expect(faq!.answer).not.toContain('<script');
    expect(faq!.answer).not.toContain('onerror');
    expect(faq!.answer).toContain('<p>Yes</p>');
  });

  it('reorders FAQs by the given id order', async () => {
    const admin = await createUserWithRole('admin');
    const a = await Faq.create({ question: 'A', answer: 'a', category: 'general', sortOrder: 0 });
    const b = await Faq.create({ question: 'B', answer: 'b', category: 'general', sortOrder: 1 });

    const response = await request(app)
      .post('/api/v1/admin/content/faqs/reorder')
      .set('Cookie', admin.cookie)
      .send({ orderedIds: [String(b._id), String(a._id)] });

    expect(response.status).toBe(200);
    expect((await Faq.findById(b._id))!.sortOrder).toBe(0);
    expect((await Faq.findById(a._id))!.sortOrder).toBe(1);
  });

  it('deactivates rather than deletes', async () => {
    const admin = await createUserWithRole('admin');
    const faq = await Faq.create({ question: 'Q', answer: 'A', category: 'general' });

    const response = await request(app)
      .delete(`/api/v1/admin/content/faqs/${String(faq._id)}`)
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const stillExists = await Faq.findById(faq._id);
    expect(stillExists).not.toBeNull();
    expect(stillExists!.isActive).toBe(false);
  });

  it('only serves active FAQs publicly', async () => {
    await Faq.create({ question: 'Active', answer: 'a', category: 'general', isActive: true });
    await Faq.create({ question: 'Inactive', answer: 'a', category: 'general', isActive: false });

    const response = await request(app).get('/api/v1/content/faqs');
    expect(response.status).toBe(200);
    const questions = bodyOf<{ faqs: { question: string }[] }>(response).data!.faqs.map(
      (f) => f.question,
    );
    expect(questions).toEqual(['Active']);
  });
});

describe('Testimonials', () => {
  it('creates and updates a testimonial', async () => {
    const admin = await createUserWithRole('admin');
    const create = await request(app)
      .post('/api/v1/admin/content/testimonials')
      .set('Cookie', admin.cookie)
      .send({ name: 'Sana', area: 'Rajbagh', rating: 5, text: 'Excellent service!' });
    expect(create.status).toBe(201);

    const id = bodyOf<{ testimonial: { _id: string } }>(create).data!.testimonial._id;
    const update = await request(app)
      .patch(`/api/v1/admin/content/testimonials/${id}`)
      .set('Cookie', admin.cookie)
      .send({ isFeatured: true });
    expect(update.status).toBe(200);
    expect((await Testimonial.findById(id))!.isFeatured).toBe(true);
  });

  it('treats a blank image URL as unset rather than an invalid URL', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/content/testimonials')
      .set('Cookie', admin.cookie)
      .send({ name: 'Sana', rating: 5, text: 'Excellent service!', image: '' });
    expect(response.status).toBe(201);
    const id = bodyOf<{ testimonial: { _id: string } }>(response).data!.testimonial._id;
    expect((await Testimonial.findById(id))!.image).toBeUndefined();
  });

  it('only serves active testimonials publicly', async () => {
    await Testimonial.create({ name: 'Active', rating: 5, text: 'x', isActive: true });
    await Testimonial.create({ name: 'Inactive', rating: 5, text: 'x', isActive: false });

    const response = await request(app).get('/api/v1/content/testimonials');
    const names = bodyOf<{ testimonials: { name: string }[] }>(response).data!.testimonials.map(
      (t) => t.name,
    );
    expect(names).toEqual(['Active']);
  });
});

describe('Banners', () => {
  it('creates a banner and rejects endsAt before startsAt', async () => {
    const admin = await createUserWithRole('admin');
    const invalid = await request(app)
      .post('/api/v1/admin/content/banners')
      .set('Cookie', admin.cookie)
      .send({
        title: 'Winter sale',
        image: 'https://example.com/banner.jpg',
        placement: 'home_hero',
        startsAt: '2026-12-31',
        endsAt: '2026-01-01',
      });
    expect(invalid.status).toBe(400);

    const valid = await request(app)
      .post('/api/v1/admin/content/banners')
      .set('Cookie', admin.cookie)
      .send({
        title: 'Winter sale',
        image: 'https://example.com/banner.jpg',
        placement: 'home_hero',
      });
    expect(valid.status).toBe(201);
  });

  it('treats a blank mobileImage as unset rather than an invalid URL', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/content/banners')
      .set('Cookie', admin.cookie)
      .send({
        title: 'Winter sale',
        image: 'https://example.com/banner.jpg',
        mobileImage: '',
        placement: 'home_hero',
      });
    expect(response.status).toBe(201);
    const id = bodyOf<{ banner: { _id: string } }>(response).data!.banner._id;
    expect((await Banner.findById(id))!.mobileImage).toBeUndefined();
  });

  it('only serves active banners within their schedule window, filtered by placement', async () => {
    const now = Date.now();
    await Banner.create({
      title: 'Active hero',
      image: 'https://example.com/1.jpg',
      placement: 'home_hero',
      isActive: true,
    });
    await Banner.create({
      title: 'Expired hero',
      image: 'https://example.com/2.jpg',
      placement: 'home_hero',
      isActive: true,
      endsAt: new Date(now - 24 * 60 * 60 * 1000),
    });
    await Banner.create({
      title: 'Active strip',
      image: 'https://example.com/3.jpg',
      placement: 'home_strip',
      isActive: true,
    });

    const response = await request(app)
      .get('/api/v1/content/banners')
      .query({ placement: 'home_hero' });
    const titles = bodyOf<{ banners: { title: string }[] }>(response).data!.banners.map(
      (b) => b.title,
    );
    expect(titles).toEqual(['Active hero']);
  });
});
