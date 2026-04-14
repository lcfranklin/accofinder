import request from 'supertest';
import app from '../../app.mjs';

describe('Auth API (MVP)', () => {
  test('POST /api/auth/register with invalid body returns 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'invalid' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  test('POST /api/auth/login with invalid body returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('status', 'error');
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.details)).toBe(true);
  });

  test('GET /api/auth/me returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Not authenticated, please log in');
  });
});
