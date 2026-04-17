import request from 'supertest';
import app from '../../app.mjs';
import Dispute from '../../models/Dispute.mjs';
import User from '../../models/User.mjs';

describe('Disputes API E2E', () => {
  let authToken;
  let testUser;

  beforeAll(async () => {
    await User.deleteMany({ email: 'dispute-test@example.com' });
    
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Dispute Test User',
        email: 'dispute-test@example.com',
        password: 'Test123!',
        confirmPassword: 'Test123!',
        residentialAddress: 'Test Address'
      });
    
    authToken = registerRes.body.data.accessToken;
    testUser = registerRes.body.data;
  });

  afterAll(async () => {
    await Dispute.deleteMany({});
    await User.deleteMany({ email: 'dispute-test@example.com' });
  });

  describe('GET /api/disputes', () => {
    it('should return all disputes', async () => {
      const res = await request(app)
        .get('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/disputes', () => {
    it('should create a new dispute', async () => {
      const disputeData = {
        title: 'Test Dispute',
        description: 'This is a test dispute',
        raisedBy: testUser._id,
        status: 'open'
      };

      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(disputeData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe(disputeData.title);
    });

    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });
  });
});