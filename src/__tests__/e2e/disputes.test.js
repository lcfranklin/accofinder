import request from 'supertest';
import app from '../../app.mjs';
import { Dispute } from '../../models/Dispute.mjs';
import { User } from '../../models/User.mjs';
import { Booking } from '../../models/Booking.mjs';
import { Property } from '../../models/Property.mjs';
import { createTestUser } from '../../test-utils/testUser.mjs';

describe('Disputes API E2E', () => {
  let authToken;
  let testUser;
  let bookingId;

  beforeAll(async () => {
    ({ user: testUser, accessToken: authToken } = await createTestUser({
      firstName: 'Dispute',
      email: 'dispute-test@example.com',
    }));

    // Create a property owned by an agent/admin is not needed; instead create
    // a booking directly is not possible without property. We'll rely on the
    // API to create a dispute only when a booking exists. For the 400 test we
    // don't need a booking.
  });

  afterAll(async () => {
    await Dispute.deleteMany({});
    await Booking.deleteMany({});
    await Property.deleteMany({});
    await User.deleteOne({ _id: testUser._id });
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
