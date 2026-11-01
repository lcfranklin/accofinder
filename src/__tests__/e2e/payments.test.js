import request from 'supertest';
import app from '../../app.mjs';
import { User } from '../../models/User.mjs';
import { createTestUser } from '../../test-utils/testUser.mjs';

describe('Payments API E2E', () => {
  let clientToken;
  let clientUser;

  beforeAll(async () => {
    ({ user: clientUser, accessToken: clientToken } = await createTestUser({
      firstName: 'Payment',
      surname: 'Client',
      email: 'payment-client@test.com',
    }));
  });

  afterAll(async () => {
    await User.deleteOne({ _id: clientUser._id });
  });

  describe('POST /api/payments/process/:bookingId', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/payments/process/507f1f77bcf86cd799439011')
        .send({ amount: 1000 });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/payments/process/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/payments/user/:userId', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .get(`/api/payments/user/${clientUser._id}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});