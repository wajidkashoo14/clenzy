import type { AddressPayload } from '@clenzy/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { Address } from '../src/models/Address.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
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
    phone: `+9191000${String(phoneSeed).padStart(5, '0')}`,
    phoneVerified: true,
    role: 'customer',
  });
  const token = signAccessToken(String(user._id), 'customer');
  return { id: String(user._id), cookie: `clenzy_at=${token}` };
}

function validBody(pincode: string) {
  return {
    label: 'home',
    contactName: 'Test Customer',
    contactPhone: '+919000000001',
    line1: '123 Test Lane',
    area: 'Test Area',
    city: 'Srinagar',
    state: 'Jammu and Kashmir',
    pincode,
  };
}

afterEach(async () => {
  await Promise.all([User.deleteMany({}), ServiceArea.deleteMany({}), Address.deleteMany({})]);
});

describe('addresses', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await request(app).get('/api/v1/addresses');
    expect(response.status).toBe(401);
  });

  it('creates the first address as default, resolving its service area', async () => {
    const user = await createUser();
    await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Rajbagh',
      slug: `rajbagh-${Date.now()}`,
      pincodes: ['190008'],
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', user.cookie)
      .send(validBody('190008'));

    expect(response.status).toBe(201);
    const address = bodyOf<{ address: AddressPayload }>(response).data!.address;
    expect(address.isDefault).toBe(true);
    expect(address.isServiceable).toBe(true);
    expect(address.serviceAreaId).toBeDefined();
  });

  it('rejects an address in an unserviced pincode with nearby suggestions', async () => {
    const user = await createUser();
    await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Rajbagh',
      slug: `rajbagh-${Date.now()}`,
      pincodes: ['190008'],
      isActive: true,
    });

    const response = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', user.cookie)
      .send(validBody('999999'));

    expect(response.status).toBe(422);
    const error = bodyOf(response).error!;
    expect(error.code).toBe('AREA_NOT_SERVICEABLE');
    expect(Array.isArray(error.nearestServiceableAreas)).toBe(true);
  });

  it('only ever has one default address at a time', async () => {
    const user = await createUser();
    const area = await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Rajbagh',
      slug: `rajbagh-${Date.now()}`,
      pincodes: ['190008'],
      isActive: true,
    });

    const first = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', user.cookie)
      .send(validBody('190008'));
    const second = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', user.cookie)
      .send({ ...validBody('190008'), label: 'work', isDefault: true });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const list = await request(app).get('/api/v1/addresses').set('Cookie', user.cookie);
    const addresses = bodyOf<{ addresses: AddressPayload[] }>(list).data!.addresses;
    expect(addresses.filter((a) => a.isDefault)).toHaveLength(1);
    void area;
  });

  it('never returns another user’s address', async () => {
    const owner = await createUser();
    const intruder = await createUser();
    await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Rajbagh',
      slug: `rajbagh-${Date.now()}`,
      pincodes: ['190008'],
      isActive: true,
    });
    const created = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', owner.cookie)
      .send(validBody('190008'));
    const addressId = bodyOf<{ address: AddressPayload }>(created).data!.address.id;

    const response = await request(app)
      .get(`/api/v1/addresses/${addressId}`)
      .set('Cookie', intruder.cookie);
    expect(response.status).toBe(404);
  });

  it('enforces the 10-address limit', async () => {
    const user = await createUser();
    const area = await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Rajbagh',
      slug: `rajbagh-${Date.now()}`,
      pincodes: ['190008'],
      isActive: true,
    });
    await Address.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        userId: user.id,
        label: 'other',
        contactName: 'Test',
        contactPhone: '+919000000001',
        line1: `Line ${i}`,
        area: 'Test',
        city: 'Srinagar',
        state: 'Jammu and Kashmir',
        pincode: '190008',
        serviceAreaId: area._id,
        isDefault: i === 0,
      })),
    );

    const response = await request(app)
      .post('/api/v1/addresses')
      .set('Cookie', user.cookie)
      .send(validBody('190008'));
    expect(response.status).toBe(409);
    expect(bodyOf(response).error!.code).toBe('ADDRESS_LIMIT_REACHED');
  });
});
