import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

describe('health and error envelope', () => {
  const app = createApp();

  it('GET /healthz returns the success envelope', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { status: 'ok' } });
  });

  it('unknown routes return the error envelope', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('invalid JSON bodies return a validation error', async () => {
    const res = await request(app)
      .post('/api/v1/ping')
      .set('content-type', 'application/json')
      .send('{ "broken": ');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
