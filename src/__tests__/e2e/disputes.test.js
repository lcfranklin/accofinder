import request from 'supertest';
import app from '../../app.mjs';
import { Dispute } from '../../models/Dispute.mjs';
import { User } from '../../models/User.mjs';
import { Booking } from '../../models/Booking.mjs';
import { Property } from '../../models/Property.mjs';

describe('Disputes API E2E', () => {
  let authToken;
  let testUser;
  let bookingId;

  beforeAll(async () => {
    await User.deleteMany({ email: 'dispute-test@example.com' });

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        firstName: 'Dispute',
        surname: 'User',
        email: 'dispute-test@example.com',
        phone: '+265999000111',
        password: 'Test123!',
        confirmPassword: 'Test123!',
        residentialAddress: 'Dispute Village, Lilongwe',
      });

    authToken = registerRes.body.data.accessToken;
    testUser = registerRes.body.data;

    // Create a property owned by an agent/admin is not needed; instead create
    // a booking directly is not possible without property. We'll rely on the
    // API to create a dispute only when a booking exists. For the 400 test we
    // don't need a booking.
  });

  afterAll(async () => {
    await Dispute.deleteMany({});
    await Booking.deleteMany({});
    await Property.deleteMany({});
    await User.deleteMany({ email: 'dispute-test@example.com' });
  });

  describe('GET /api/disputes', () => {
    it('should return 200 with an array in data', async () => {
      const res = await request(app)
        .get('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/disputes', () => {
    it('should return 400 for invalid data', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 for a non-existent booking', async () => {
      const res = await request(app)
        .post('/api/disputes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ bookingId: '507f1f77bcf86cd799439011', issue: 'This is a test dispute issue' });

      expect(res.statusCode).toBe(404);
    });
  });
});
