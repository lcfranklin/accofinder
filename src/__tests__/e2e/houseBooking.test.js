import request from 'supertest';
import app from '../../app.mjs';
import { Booking } from '../../models/Booking.mjs';
import { Property } from '../../models/Property.mjs';
import { User } from '../../models/User.mjs';
import { createTestUser } from '../../test-utils/testUser.mjs';

describe('Booking API E2E', () => {
  let admin;
  let client;
  let agent;
  let property;
  let cancellationProperty;
  let bookingToCancel;

  beforeAll(async () => {
    admin = await createTestUser({
      email: 'booking-admin@test.com',
      role: 'ADMIN',
    });
    client = await createTestUser({
      email: 'booking-client@test.com',
    });
    agent = await createTestUser({
      email: 'booking-agent@test.com',
      role: 'AGENT',
    });

    property = await Property.create({
      title: 'Bookable test property',
      owner: agent.user._id,
      rentalFee: 500,
    });
    cancellationProperty = await Property.create({
      title: 'Cancellation test property',
      owner: agent.user._id,
      rentalFee: 500,
    });
  });

  afterAll(async () => {
    await Booking.deleteMany({ clientId: client.user._id });
    await Property.deleteMany({
      _id: { $in: [property._id, cancellationProperty._id] },
    });
    await User.deleteMany({
      _id: { $in: [admin.user._id, client.user._id, agent.user._id] },
    });
  });

  describe('GET /api/bookings', () => {
    it('requires authentication', async () => {
      const res = await request(app).get('/api/bookings');

      expect(res.statusCode).toBe(401);
    });

    it('returns bookings for an authenticated client', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${client.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('returns bookings for an admin', async () => {
      const res = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${admin.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/bookings', () => {
    it('creates a pending-payment booking for a bookable property', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${client.accessToken}`)
        .send({
          bookableItemId: property._id,
          amount: 1500,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bookableItemType).toBe('Property');
      expect(res.body.data.amount).toBe(1500);
      expect(res.body.status).toBe('PendingPayment');
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .send({ bookableItemId: property._id, amount: 100 });

      expect(res.statusCode).toBe(401);
    });

    it('returns 404 when the bookable item does not exist', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${client.accessToken}`)
        .send({
          bookableItemId: '507f1f77bcf86cd799439011',
          amount: 100,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('Bookable item not found');
    });
  });

  describe('PATCH /api/bookings/:id/cancel', () => {
    beforeEach(async () => {
      bookingToCancel = await Booking.create({
        clientId: client.user._id,
        bookableItemType: 'Property',
        bookableItemId: cancellationProperty._id,
        amount: 500,
      });
    });

    afterEach(async () => {
      await Booking.deleteOne({ _id: bookingToCancel._id });
    });

    it('cancels a pending booking and releases the property', async () => {
      const res = await request(app)
        .patch(`/api/bookings/${bookingToCancel._id}/cancel`)
        .set('Authorization', `Bearer ${client.accessToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Cancelled');
      expect(res.body.roomReleased).toBe(true);
    });
  });
});
