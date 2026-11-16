import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { clearDb, setupTestDb, teardownTestDb } from '../helpers/db';
import { ensureConfig, makeApprovedDriver, makeAuthedUser, makeStation } from '../helpers/factories';
import { resetSurgeCache } from '../../src/modules/pricing/surge';

let app: Express;

const DROPOFF = { lat: 9.0765, lng: 7.4698, addressText: '12 Ademola Adetokunbo Cres, Wuse II' };

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterEach(async () => {
  await clearDb();
  resetSurgeCache();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('POST /quotes', () => {
  it('returns a locked quote with a public breakdown', async () => {
    await ensureConfig();
    await makeStation({ lat: 9.0579, lng: 7.4951 });
    await makeApprovedDriver(app, { lat: 9.0579, lng: 7.4951 });
    const customer = await makeAuthedUser(app, 'customer');

    const res = await request(app)
      .post('/api/v1/quotes')
      .set('authorization', `Bearer ${customer.token}`)
      .send({ fuelType: 'PETROL', litres: 30, dropoff: DROPOFF });

    expect(res.status).toBe(201);
    expect(res.body.data.quoteId).toBeTruthy();
    expect(res.body.data.station.name).toBeTruthy();
    expect(res.body.data.etaMinutes % 5).toBe(0);
    expect(res.body.data.breakdown.totalKobo).toBeGreaterThan(0);
    expect(res.body.data.breakdown).not.toHaveProperty('driverEarningKobo');
    expect(res.body.data.breakdown).not.toHaveProperty('fuelCostKobo');
    expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a quote when no drivers are online', async () => {
    await ensureConfig();
    await makeStation();
    const customer = await makeAuthedUser(app, 'customer');

    const res = await request(app)
      .post('/api/v1/quotes')
      .set('authorization', `Bearer ${customer.token}`)
      .send({ fuelType: 'PETROL', litres: 30, dropoff: DROPOFF });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('NO_DRIVERS_ONLINE');
  });

  it('rejects a quote when no station is nearby', async () => {
    await ensureConfig();
    await makeApprovedDriver(app);
    const customer = await makeAuthedUser(app, 'customer');

    const res = await request(app)
      .post('/api/v1/quotes')
      .set('authorization', `Bearer ${customer.token}`)
      .send({ fuelType: 'PETROL', litres: 30, dropoff: DROPOFF });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('NO_STATION_AVAILABLE');
  });

  it('rejects unknown fields', async () => {
    await ensureConfig();
    await makeStation();
    await makeApprovedDriver(app);
    const customer = await makeAuthedUser(app, 'customer');

    const res = await request(app)
      .post('/api/v1/quotes')
      .set('authorization', `Bearer ${customer.token}`)
      .send({ fuelType: 'PETROL', litres: 30, dropoff: DROPOFF, extra: 1 });

    expect(res.status).toBe(400);
  });

  it('requires a customer token', async () => {
    const res = await request(app).post('/api/v1/quotes').send({ fuelType: 'PETROL', litres: 30, dropoff: DROPOFF });
    expect(res.status).toBe(401);
  });
});
