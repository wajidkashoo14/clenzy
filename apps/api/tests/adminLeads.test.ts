import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { B2bEnquiry } from '../src/models/B2bEnquiry.js';
import { ContactSubmission } from '../src/models/ContactSubmission.js';
import { Lead } from '../src/models/Lead.js';
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
    phone: `+9197${String(phoneSeed).padStart(7, '0')}`,
    phoneVerified: true,
    role,
  });
  const token = signAccessToken(String(user._id), role);
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Lead.deleteMany({}),
    ContactSubmission.deleteMany({}),
    B2bEnquiry.deleteMany({}),
  ]);
});

describe('admin lead pipeline role gating', () => {
  it('lets staff read but rejects staff mutations', async () => {
    const staff = await createUserWithRole('staff');
    const lead = await Lead.create({ name: 'Jane', phone: '+919600000001', source: 'web' });

    const list = await request(app).get('/api/v1/admin/leads').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const update = await request(app)
      .patch(`/api/v1/admin/leads/${String(lead._id)}`)
      .set('Cookie', staff.cookie)
      .send({ status: 'contacted' });
    expect(update.status).toBe(403);
  });
});

describe('PATCH /admin/leads/:id', () => {
  it('updates status and assignment', async () => {
    const admin = await createUserWithRole('admin');
    const agent = await createUserWithRole('staff');
    const lead = await Lead.create({ name: 'Jane', phone: '+919600000001', source: 'web' });

    const response = await request(app)
      .patch(`/api/v1/admin/leads/${String(lead._id)}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'contacted', assignedTo: agent.id });

    expect(response.status).toBe(200);
    const updated = await Lead.findById(lead._id);
    expect(updated!.status).toBe('contacted');
    expect(String(updated!.assignedTo)).toBe(agent.id);
  });

  it('filters the list by status', async () => {
    const admin = await createUserWithRole('admin');
    await Lead.create({ name: 'New Lead', phone: '+919600000002', source: 'web', status: 'new' });
    await Lead.create({
      name: 'Lost Lead',
      phone: '+919600000003',
      source: 'web',
      status: 'lost',
    });

    const response = await request(app)
      .get('/api/v1/admin/leads')
      .query({ status: 'new' })
      .set('Cookie', admin.cookie);

    expect(response.status).toBe(200);
    const result = bodyOf<{ items: { name: string }[]; total: number }>(response).data!;
    expect(result.total).toBe(1);
    expect(result.items[0]!.name).toBe('New Lead');
  });
});

describe('POST /admin/leads/:id/notes and /convert', () => {
  it('appends a note', async () => {
    const admin = await createUserWithRole('admin');
    const lead = await Lead.create({ name: 'Jane', phone: '+919600000001', source: 'web' });

    const response = await request(app)
      .post(`/api/v1/admin/leads/${String(lead._id)}/notes`)
      .set('Cookie', admin.cookie)
      .send({ note: 'Called, will follow up tomorrow' });

    expect(response.status).toBe(200);
    const updated = await Lead.findById(lead._id);
    expect(updated!.notes).toHaveLength(1);
    expect(updated!.notes[0]!.note).toBe('Called, will follow up tomorrow');
  });

  it('marks a lead converted and links the order', async () => {
    const admin = await createUserWithRole('admin');
    const lead = await Lead.create({ name: 'Jane', phone: '+919600000001', source: 'web' });
    const fakeOrderId = String(admin.id);

    const response = await request(app)
      .post(`/api/v1/admin/leads/${String(lead._id)}/convert`)
      .set('Cookie', admin.cookie)
      .send({ orderId: fakeOrderId });

    expect(response.status).toBe(200);
    const updated = await Lead.findById(lead._id);
    expect(updated!.status).toBe('converted');
    expect(String(updated!.convertedOrderId)).toBe(fakeOrderId);
  });
});

describe('contact submissions & B2B enquiries — simpler queues', () => {
  it('lists and updates status for contact submissions', async () => {
    const admin = await createUserWithRole('admin');
    const submission = await ContactSubmission.create({
      name: 'Amit',
      phone: '+919600000005',
      message: 'Do you serve Hyderpora?',
    });

    const list = await request(app)
      .get('/api/v1/admin/contact-submissions')
      .set('Cookie', admin.cookie);
    expect(list.status).toBe(200);

    const update = await request(app)
      .patch(`/api/v1/admin/contact-submissions/${String(submission._id)}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'contacted' });
    expect(update.status).toBe(200);
    expect((await ContactSubmission.findById(submission._id))!.status).toBe('contacted');
  });

  it('lists and updates status for B2B enquiries', async () => {
    const admin = await createUserWithRole('admin');
    const enquiry = await B2bEnquiry.create({
      name: 'Rukhsar',
      businessName: 'Lake View Houseboats',
      phone: '+919600000006',
      email: 'rukhsar@example.com',
    });

    const list = await request(app).get('/api/v1/admin/b2b-enquiries').set('Cookie', admin.cookie);
    expect(list.status).toBe(200);

    const update = await request(app)
      .patch(`/api/v1/admin/b2b-enquiries/${String(enquiry._id)}`)
      .set('Cookie', admin.cookie)
      .send({ status: 'converted' });
    expect(update.status).toBe(200);
    expect((await B2bEnquiry.findById(enquiry._id))!.status).toBe('converted');
  });
});
