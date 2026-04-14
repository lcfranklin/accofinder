import request from 'supertest';
import app from '../../app.mjs';

describe('Users API (MVP)', () => {
  test('GET /api/users returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/users');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/users/:id returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/users/12345');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
