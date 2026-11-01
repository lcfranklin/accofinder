import request from 'supertest';
import app from '../../app.mjs';
import { Notification } from '../../models/Notification.mjs';
import { User } from '../../models/User.mjs';
import { createTestUser } from '../../test-utils/testUser.mjs';

describe('Notifications API E2E', () => {
  let adminUser;
  let authToken;

  beforeAll(async () => {
    ({ user: adminUser, accessToken: authToken } = await createTestUser({
      firstName: 'Notification',
      email: 'notification-test@example.com',
      role: 'ADMIN',
    }));
  });

  afterAll(async () => {
    await Notification.deleteMany({ recipientId: adminUser._id });
    await User.deleteOne({ _id: adminUser._id });
  });

  describe('GET /api/notifications', () => {
    it('should return all notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/notifications', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        message: 'Test notification',
        recipientId: adminUser._id,
        recipientRole: 'ADMIN',
        kind: 'SYSTEM',
      };

      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe(notificationData.message);
    });
  });
});