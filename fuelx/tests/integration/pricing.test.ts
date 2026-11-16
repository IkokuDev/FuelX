import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createApp } from '../../src/app';
import { clearDb, setupTestDb, teardownTestDb } from '../helpers/db';
import { ensureConfig, makeAuthedUser } from '../helpers/factories';

let app: Express;

beforeAll(async () => {
  await setupTestDb();
  app = createApp();
});

afterEach(async () => {
  await clearDb();
});

afterAll(async () => {
  await teardownTestDb();
});

describe('public config and estimate', () => {
  it('GET /public/config exposes enabled fuels and fees', async () => {
    await ensureConfig();
    const res = await request(app).get('/api/v1/public/config');
    expect(res.status).toBe(200);
    expect(res.body.data.fuels.map((f: { fuelType: string }) => f.fuelType)).toEqual(['PETROL', 'DIESEL']);
    expect(res.body.data.fees.serviceFeeRate).toBeCloseTo(0.175);
    expect(res.body.data.minLitres).toBe(10);
    expect(res.body.data.maxLitres).toBe(50);
  });

  it('POST /public/estimate prices a 30 L order with the 6 km default', async () => {
    await ensureConfig();
    const res = await request(app).post('/api/v1/public/estimate').send({ fuelType: 'PETROL', litres: 30 });
    expect(res.status).toBe(200);
    expect(res.body.data.breakdown.totalKobo).toBe(2_381_000);
    expect(res.body.data.breakdown).not.toHaveProperty('driverEarningKobo');
    expect(res.body.data.breakdown).not.toHaveProperty('fuelCostKobo');
    expect(res.body.data.distanceKm).toBe(6);
  });

  it('POST /public/estimate rejects unknown keys', async () => {
    await ensureConfig();
    const res = await request(app)
      .post('/api/v1/public/estimate')
      .send({ fuelType: 'PETROL', litres: 30, bogus: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /public/estimate when no station is nearby still returns a price', async () => {
    await ensureConfig();
    const res = await request(app)
      .post('/api/v1/public/estimate')
      .send({ fuelType: 'PETROL', litres: 30, lat: 9.0765, lng: 7.4698 });
    expect(res.status).toBe(200);
    expect(res.body.data.breakdown.totalKobo).toBeGreaterThan(0);
  });
});

describe('admin pricing', () => {
  it('requires an admin role', async () => {
    await ensureConfig();
    const customer = await makeAuthedUser(app, 'customer');
    const res = await request(app)
      .get('/api/v1/admin/pricing')
      .set('authorization', `Bearer ${customer.token}`);
    expect(res.status).toBe(403);
  });

  it('returns the config for an admin', async () => {
    await ensureConfig();
    const admin = await makeAuthedUser(app, 'admin');
    const res = await request(app)
      .get('/api/v1/admin/pricing')
      .set('authorization', `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.config.fuel.PETROL.retailPerLitreKobo).toBe(65_000);
  });

  it('rejects matching weights that do not sum to 1', async () => {
    await ensureConfig();
    const admin = await makeAuthedUser(app, 'admin');
    const res = await request(app)
      .put('/api/v1/admin/pricing')
      .set('authorization', `Bearer ${admin.token}`)
      .send({ matching: { weights: { proximity: 0.9, rating: 0.2, acceptance: 0.15, idle: 0.15 } } });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('applies a valid partial update', async () => {
    await ensureConfig();
    const admin = await makeAuthedUser(app, 'admin');
    const res = await request(app)
      .put('/api/v1/admin/pricing')
      .set('authorization', `Bearer ${admin.token}`)
      .send({ fuel: { PETROL: { retailPerLitreKobo: 70_000 } } });
    expect(res.status).toBe(200);
    expect(res.body.data.config.fuel.PETROL.retailPerLitreKobo).toBe(70_000);
    // untouched fields keep their values
    expect(res.body.data.config.fuel.PETROL.wholesalePerLitreKobo).toBe(60_000);
  });

  it('writes an audit log entry on update', async () => {
    await ensureConfig();
    const admin = await makeAuthedUser(app, 'admin');
    await request(app)
      .put('/api/v1/admin/pricing')
      .set('authorization', `Bearer ${admin.token}`)
      .send({ fees: { roundingKobo: 500 } });
    const { AuditLog } = await import('../../src/models/audit-log.model');
    const entry = await AuditLog.findOne({ action: 'pricing.update' });
    expect(entry).not.toBeNull();
  });
});

describe('admin stations', () => {
  it('creates, lists and updates a station', async () => {
    const admin = await makeAuthedUser(app, 'admin');
    const auth = { authorization: `Bearer ${admin.token}` };

    const created = await request(app)
      .post('/api/v1/admin/stations')
      .set(auth)
      .send({ name: 'Wuse Station', address: 'Wuse II', lat: 9.0765, lng: 7.4698, fuelTypes: ['PETROL'] });
    expect(created.status).toBe(201);
    const id = created.body.data.station.id;

    const list = await request(app).get('/api/v1/admin/stations').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.stations).toHaveLength(1);

    const updated = await request(app)
      .patch(`/api/v1/admin/stations/${id}`)
      .set(auth)
      .send({ isOpen: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.station.isOpen).toBe(false);
  });
});

describe('public seal verification', () => {
  it('returns genuine false for an unknown code', async () => {
    const res = await request(app).get('/api/v1/public/seals/FX-AAAA-BBBB/verify');
    expect(res.status).toBe(200);
    expect(res.body.data.genuine).toBe(false);
    expect(res.body.data.status).toBe('UNKNOWN');
  });
});
