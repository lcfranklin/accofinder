import request from 'supertest';
import app from '../../app.mjs';
import User from '../../models/User.mjs';
import HouseListing from '../../models/HouseListing.mjs';
import HouseBooking from '../../models/HouseBooking.mjs';

describe('House Booking API E2E', () => {
  let adminToken;
  let clientToken;
  let landlordToken;
  let testHouse;
  let adminUser;
  let clientUser;
  let landlordUser;

  beforeAll(async () => {
    // Clean up existing data
    await User.deleteMany({ email: { $in: ['admin@test.com', 'client@test.com', 'landlord@test.com'] } });
    await HouseListing.deleteMany({});
    await HouseBooking.deleteMany({});

    // Create admin user
    const adminRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: {
          firstName: 'Admin',
          surname: 'User'
        },
        email: 'admin@test.com',
        password: 'Admin123!',
        confirmPassword: 'Admin123!',
        residentialAddress: {
          district: 'Lilongwe',
          traditionalAuthority: 'Chief Kwataine',
          village: 'Admin Village'
        }
      });
    adminToken = adminRes.body.data.accessToken;
    adminUser = adminRes.body.data;

    // Create client user
    const clientRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: {
          firstName: 'Client',
          surname: 'User'
        },
        email: 'client@test.com',
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

    // Create landlord user
    const landlordRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: {
          firstName: 'Landlord',
          surname: 'User'
        },
        email: 'landlord@test.com',
        password: 'Landlord123!',
        confirmPassword: 'Landlord123!',
        residentialAddress: {
          district: 'Mzuzu',
          traditionalAuthority: 'Chief Mbelwa',
          village: 'Landlord Village'
        }
      });
    landlordToken = landlordRes.body.data.accessToken;
    landlordUser = landlordRes.body.data;

    // Promote to landlord role
    await request(app)
      .patch(`/api/users/${landlordUser._id}/promote`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ role: 'landlord' });

    // Create a house listing
    testHouse = await HouseListing.create({
      title: 'Test House',
      description: 'A beautiful test house',
      price: 500,
      costCategory: 'monthly',
      owner: landlordUser._id,
      location: 'Test Location'
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: ['admin@test.com', 'client@test.com', 'landlord@test.com'] } });
    await HouseListing.deleteMany({});
    await HouseBooking.deleteMany({});
  });

  describe('GET /api/house-booking', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/house-booking');
      expect(res.statusCode).toBe(401);
    });

    it('should return 403 when user is not admin', async () => {
      const res = await request(app)
        .get('/api/house-booking')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(403);
    });

    it('should return all bookings for admin', async () => {
      const res = await request(app)
        .get('/api/house-booking')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('status', 'success');
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/house-booking', () => {
    it('should create a booking successfully', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 3);

      const res = await request(app)
        .post('/api/house-booking')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          houseId: testHouse._id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          specialNotes: 'Test booking notes'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveProperty('house');
      expect(res.body.data).toHaveProperty('tenant');
      expect(res.body.data.numberOfMonths).toBe(3);
      expect(res.body.data.totalAmount).toBe(1500);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app)
        .post('/api/house-booking')
        .send({ houseId: testHouse._id });

      expect(res.statusCode).toBe(401);
    });

    it('should return 404 when house not found', async () => {
      const res = await request(app)
        .post('/api/house-booking')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          houseId: '507f1f77bcf86cd799439011',
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString()
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('House not found');
    });
  });

  describe('PATCH /api/house-booking/:id/cancel', () => {
    let testBooking;

    beforeEach(async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 2);

      const bookingRes = await request(app)
        .post('/api/house-booking')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          houseId: testHouse._id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      testBooking = bookingRes.body.data;
    });

    it('should cancel a pending booking', async () => {
      const res = await request(app)
        .patch(`/api/house-booking/${testBooking._id}/cancel`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data).toHaveProperty('cancelledAt');
    });
  });
});