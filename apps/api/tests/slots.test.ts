import type { SlotsResult } from '@clenzy/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ServiceArea } from '../src/models/ServiceArea.js';
import { SlotCapacity } from '../src/models/SlotCapacity.js';
import { SlotTemplate } from '../src/models/SlotTemplate.js';
import { addDaysToDateString, dayOfWeekOfDateString, nowInKolkata } from '../src/utils/timezone.js';

const app = createApp();

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

function bodyOf<T>(response: request.Response): ApiEnvelope<T> {
  return response.body as ApiEnvelope<T>;
}

afterEach(async () => {
  await Promise.all([
    ServiceArea.deleteMany({}),
    SlotTemplate.deleteMany({}),
    SlotCapacity.deleteMany({}),
  ]);
});

describe('GET /slots', () => {
  it('returns availability, marking a full window as disabled', async () => {
    const area = await ServiceArea.create({
      city: 'Srinagar',
      state: 'Jammu and Kashmir',
      area: 'Rajbagh',
      slug: `rajbagh-${Date.now()}`,
      pincodes: ['190008'],
      isActive: true,
    });
    const tomorrow = addDaysToDateString(nowInKolkata().dateString, 1);
    await SlotTemplate.create({
      type: 'pickup',
      dayOfWeek: dayOfWeekOfDateString(tomorrow),
      window: '09:00-11:00',
      label: '9 AM – 11 AM',
      capacity: 2,
      cutoffMinutesBefore: 0,
      isActive: true,
      areaIds: [],
    });
    await SlotCapacity.create({
      date: tomorrow,
      window: '09:00-11:00',
      type: 'pickup',
      areaId: area._id,
      booked: 2,
      capacity: 2,
    });

    const response = await request(app)
      .get('/api/v1/slots')
      .query({ type: 'pickup', areaId: String(area._id), from: tomorrow, days: 1 });

    expect(response.status).toBe(200);
    const result = bodyOf<SlotsResult>(response).data!;
    expect(result.dates).toHaveLength(1);
    const window = result.dates[0]!.windows[0]!;
    expect(window.booked).toBe(2);
    expect(window.available).toBe(0);
    expect(window.disabled).toBe(true);
    expect(window.disabledReason).toBe('Fully booked.');
  });

  it('rejects an invalid areaId', async () => {
    const response = await request(app)
      .get('/api/v1/slots')
      .query({ type: 'pickup', areaId: 'not-an-id', from: '2026-06-01', days: 1 });
    expect(response.status).toBe(404);
  });
});
