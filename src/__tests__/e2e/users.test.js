import request from 'supertest';
import app from '../../app.mjs';
import User from '../../models/User.mjs';

describe('Users API E2E', () => {
  let adminToken;
  let clientToken;
  let testUserId;
  let adminUser;
  let clientUser;

  beforeAll(async () => {
    await User.deleteMany({ email: { $in: ['admin-e2e@test.com', 'client-e2e@test.com'] } });

    // Create admin
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Admin E2E',
        email: 'admin-e2e@test.com',
        password: 'Admin123!',
        confirmPassword: 'Admin123!',
        residentialAddress: 'Admin Address'
      });
    adminToken = adminRes.body.data.accessToken;
    adminUser = adminRes.body.data;

    // Create client
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Client E2E',
        email: 'client-e2e@test.com',
        password: 'Client123!',
        confirmPassword: 'Client123!',
        residentialAddress: 'Client Address'
      });
    clientToken = clientRes.body.data.accessToken;
    clientUser = clientRes.body.data;
    testUserId = clientUser._id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['admin-e2e@test.com', 'client-e2e@test.com'] } });
  });

  describe('GET /api/users', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/users');
      expect(res.statusCode).toBe(401);
    });

    it('should return all users when authenticated', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/users/me/profile', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/users/me/profile')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('client-e2e@test.com');
      expect(res.body.data).toHaveProperty('name', 'Client E2E');
    });
  });

  describe('PATCH /api/users/me/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .patch('/api/users/me/profile')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: 'Updated Client Name',
          residentialAddress: 'Updated Address'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Client Name');
      expect(res.body.data.residentialAddress).toBe('Updated Address');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 403 when non-admin tries to access user by id', async () => {
      const res = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return user by id for admin', async () => {
      const res = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testUserId);
    });
  });

  describe('PATCH /api/users/:id/promote', () => {
    it('should promote user role (admin only)', async () => {
      const res = await request(app)
        .patch(`/api/users/${testUserId}/promote`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'landlord' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('User role changed to landlord');
    });

    it('should return 403 when non-admin tries to promote', async () => {
      const res = await request(app)
        .patch(`/api/users/${testUserId}/promote`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ role: 'admin' });

      expect(res.statusCode).toBe(403);
    });
  });
});