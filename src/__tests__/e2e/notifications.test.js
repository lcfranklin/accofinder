import request from 'supertest';
import app from '../../app.mjs';
import Notification from '../../models/Notification.mjs';
import User from '../../models/User.mjs';

describe('Notifications API E2E', () => {
  let authToken;

  beforeAll(async () => {
    await User.deleteMany({ email: 'notification-test@example.com' });
    
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Notification Test User',
        email: 'notification-test@example.com',
        password: 'Test123!',
        confirmPassword: 'Test123!',
        residentialAddress: 'Test Address'
      });
    
    authToken = registerRes.body.data.accessToken;
  });

  afterAll(async () => {
    await Notification.deleteMany({});
    await User.deleteMany({ email: 'notification-test@example.com' });
  });

  describe('GET /api/notifications', () => {
    it('should return all notifications', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/notifications', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        message: 'Test notification',
        userId: 'test-user-id',
        type: 'info'
      };

      const res = await request(app)
        .post('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(notificationData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.message).toBe(notificationData.message);
    });
  });
});