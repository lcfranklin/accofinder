import request from 'supertest';
import app from '../../app.mjs';

describe('Disputes API (MVP)', () => {
  test('GET /api/nonexistent returns 404', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/Not Found/);
  });
});
