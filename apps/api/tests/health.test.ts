import type { HealthResponse } from '@clenzy/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('GET /api/v1/health', () => {
  const app = createApp();

  it('returns 200 with a well-formed health payload', async () => {
    const response = await request(app).get('/api/v1/health');
    const body = response.body as HealthResponse;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ status: 'ok', service: 'clenzy-api' });
    expect(typeof body.uptimeSeconds).toBe('number');
  });
});

describe('unknown routes', () => {
  const app = createApp();

  it('returns a structured 404', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ success: false, error: { code: 'ROUTE_NOT_FOUND' } });
  });
});
