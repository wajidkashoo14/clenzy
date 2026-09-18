import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Order } from '../src/models/Order.js';
import { User } from '../src/models/User.js';
import { signAccessToken } from '../src/utils/tokens.js';
import { nowInKolkata } from '../src/utils/timezone.js';

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

afterEach(async () => {
  await Promise.all([User.deleteMany({}), Order.deleteMany({}), AuditLog.deleteMany({})]);
});

describe('admin staff role gating', () => {
  it('lets staff list agents but rejects staff creating one', async () => {
    const staff = await createUserWithRole('staff');
    const list = await request(app).get('/api/v1/admin/staff').set('Cookie', staff.cookie);
    expect(list.status).toBe(200);

    const create = await request(app)
      .post('/api/v1/admin/staff')
      .set('Cookie', staff.cookie)
      .send({ name: 'New Agent', phone: '+919511111111' });
    expect(create.status).toBe(403);
  });

  it('rejects a non-superadmin changing a role', async () => {
    const admin = await createUserWithRole('admin');
    const customer = await createUserWithRole('customer');
    const response = await request(app)
      .patch(`/api/v1/admin/users/${customer.id}/role`)
      .set('Cookie', admin.cookie)
      .send({ role: 'staff' });
    expect(response.status).toBe(403);
  });
});

describe('POST /admin/staff', () => {
  it('creates an agent account with a normalized phone and staff profile', async () => {
    const admin = await createUserWithRole('admin');
    const response = await request(app)
      .post('/api/v1/admin/staff')
      .set('Cookie', admin.cookie)
      .send({
        name: 'Dev Agent',
        phone: '9511111111',
        employeeId: 'EMP-001',
        vehicleNumber: 'JK01AB1234',
        shiftStart: '09:00',
        shiftEnd: '18:00',
      });

    expect(response.status).toBe(201);
    const agent = bodyOf<{
      agent: { phone: string; role: string; staffProfile: { employeeId: string } };
    }>(response).data!.agent;
    expect(agent.phone).toBe('+919511111111');
    expect(agent.role).toBe('agent');
    expect(agent.staffProfile.employeeId).toBe('EMP-001');
    expect(await AuditLog.countDocuments({ action: 'agent.create' })).toBe(1);
  });

  it('rejects a phone already registered to another user', async () => {
    const admin = await createUserWithRole('admin');
    await User.create({ phone: '+919511111112', phoneVerified: true, role: 'customer' });

    const response = await request(app)
      .post('/api/v1/admin/staff')
      .set('Cookie', admin.cookie)
      .send({ name: 'Dev Agent', phone: '9511111112' });

    expect(response.status).toBe(400);
    expect(bodyOf(response).error!.code).toBe('PHONE_TAKEN');
  });
});

describe('PATCH /admin/staff/:id', () => {
  it('toggles availability without clobbering other staffProfile fields', async () => {
    const admin = await createUserWithRole('admin');
    const created = await request(app)
      .post('/api/v1/admin/staff')
      .set('Cookie', admin.cookie)
      .send({ name: 'Dev Agent', phone: '9511111113', employeeId: 'EMP-002' });
    const agentId = bodyOf<{ agent: { _id: string } }>(created).data!.agent._id;

    const response = await request(app)
      .patch(`/api/v1/admin/staff/${agentId}`)
      .set('Cookie', admin.cookie)
      .send({ isAvailable: false });

    expect(response.status).toBe(200);
    const updated = await User.findById(agentId);
    expect(updated!.staffProfile!.isAvailable).toBe(false);
    expect(updated!.staffProfile!.employeeId).toBe('EMP-002');
  });
});

describe('GET /admin/staff workload', () => {
  it("counts today's assigned pickups and deliveries for an agent", async () => {
    const admin = await createUserWithRole('admin');
    const agent = await createUserWithRole('agent');
    const today = nowInKolkata().dateString;
    const commonAddress = {
      label: 'other',
      contactName: 'Test',
      contactPhone: '+919000000000',
      line1: '1 Test Lane',
      area: 'Test Area',
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      pincode: '190001',
    };
    const slot = { date: today, window: '09:00-11:00', label: '9-11', areaId: admin.id };

    await Order.create({
      orderNumber: 'ORD-WORKLOAD-1',
      userId: admin.id,
      type: 'standard',
      status: 'PICKUP_SCHEDULED',
      items: [],
      pricing: {
        itemsSubtotal: 100,
        expressSurcharge: 0,
        deliveryFee: 0,
        pickupFee: 0,
        smallOrderFee: 0,
        discountAmount: 0,
        taxAmount: 0,
        walletApplied: 0,
        grandTotal: 100,
        amountPaid: 0,
        amountRefunded: 0,
      },
      pickupAddress: commonAddress,
      deliveryAddress: commonAddress,
      pickupSlot: slot,
      deliverySlot: slot,
      isExpress: false,
      paymentMethod: 'cod',
      paymentStatus: 'pending',
      assignedPickupAgentId: agent.id,
      statusHistory: [],
      internalNotes: [],
      source: 'web',
    });

    const response = await request(app).get('/api/v1/admin/staff').set('Cookie', admin.cookie);
    expect(response.status).toBe(200);
    const agents = bodyOf<{ agents: { _id: string; workload: { tasksToday: number } }[] }>(response)
      .data!.agents;
    const found = agents.find((a) => a._id === agent.id);
    expect(found!.workload.tasksToday).toBe(1);
  });
});

describe('PATCH /admin/users/:id/role', () => {
  it('lets a superadmin change a role', async () => {
    const superadmin = await createUserWithRole('superadmin');
    const customer = await createUserWithRole('customer');

    const response = await request(app)
      .patch(`/api/v1/admin/users/${customer.id}/role`)
      .set('Cookie', superadmin.cookie)
      .send({ role: 'staff' });

    expect(response.status).toBe(200);
    expect((await User.findById(customer.id))!.role).toBe('staff');
    expect(await AuditLog.countDocuments({ action: 'user.change-role' })).toBe(1);
  });
});
