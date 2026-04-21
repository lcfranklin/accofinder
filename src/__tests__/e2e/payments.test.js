import request from 'supertest';
import app from '../../app.mjs';
import User from '../../models/User.mjs';
import Payment from '../../models/Payment.mjs';

describe('Payments API E2E', () => {
  let clientToken;
  let clientUser;

  beforeAll(async () => {
    await User.deleteMany({ email: 'payment-client@test.com' });
    
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: {
          firstName: 'Payment',
          surname: 'Client'
        },
        email: 'payment-client@test.com',
        password: 'Client123!',
        confirmPassword: 'Client123!',
        residentialAddress: {
          district: 'Lilongwe',
          traditionalAuthority: 'Chief Kwataine',
          village: 'Payment Village'
        }
      });
    
    clientToken = registerRes.body.data.accessToken;
    clientUser = registerRes.body.data;
  });

  afterAll(async () => {
    await Payment.deleteMany({});
    await User.deleteMany({ email: 'payment-client@test.com' });
  });

  describe('POST /api/payments/init', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/payments/init')
        .send({ amount: 1000 });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/payments/init')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('passportID and fee is required');
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