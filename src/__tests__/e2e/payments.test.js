import request from 'supertest';
import app from '../../app.mjs';

describe('Payments API (MVP)', () => {
  test('POST /api/payments/init returns 401 when not authenticated', async () => {
    const res = await request(app).post('/api/payments/init').send({ amount: 1000 });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/payments/user/:userId returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/payments/user/123');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
