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
        name: {
          firstName: 'Admin',
          surname: 'E2E'
        },
        email: 'admin-e2e@test.com',
        password: 'Admin123!',
        confirmPassword: 'Admin123!',
        residentialAddress: {
          district: 'Lilongwe',
          traditionalAuthority: 'Chief Kwataine',
          village: 'Admin Village'
        }
      });
    adminUser = adminRes.body.data;
    
    // Promote to admin
    await User.findByIdAndUpdate(adminUser._id, { role: 'admin' });
    
    // Refresh admin token with new role
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin-e2e@test.com',
        password: 'Admin123!'
      });
    adminToken = adminLoginRes.body.data.accessToken;

    // Create client
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: {
          firstName: 'Client',
          surname: 'E2E'
        },
        email: 'client-e2e@test.com',
        password: 'Client123!',
        confirmPassword: 'Client123!',
        residentialAddress: {
          district: 'Blantyre',
          traditionalAuthority: 'Chief Chigaru',
          village: 'Client Village'
        }
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
      const res = await request(app).get(`/api/users`)
      
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when not user is not admin', async () => {
      const res = await request(app)
      .get(`/api/users`)
      .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return all users when authenticated and authenticated user has admin role', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

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
      expect(res.body.data.name.firstName).toBe('Client');
    });
  });

  describe('PATCH /api/users/me/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .patch('/api/users/me/profile')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          name: {
            firstName: 'Updated Client',
            surname: 'Name'
          },
          residentialAddress: {
            district: 'Mzuzu',
            traditionalAuthority: 'Chief Mbelwa',
            village: 'Updated Village'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name.firstName).toBe('Updated Client');
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