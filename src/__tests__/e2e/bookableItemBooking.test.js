import request from 'supertest';
import app from '../../app.mjs';
import { Booking } from '../../models/Booking.mjs';
import { Property } from '../../models/Property.mjs';
import { PropertyType } from '../../models/enums/PropertyType.mjs';
import { Room } from '../../models/Room.mjs';

jest.mock('../../middleware/authMiddleware.mjs', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = {
      _id: '6a057ca99d9d0fbeb233073d',
      id: '6a057ca99d9d0fbeb233073d',
      role: 'CLIENT',
    };
    next();
  },
  checkRole: () => (req, res, next) => next(),
}));

jest.mock('../../services/notificationService.mjs', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

const ownerId = '6a057ca99d9d0fbeb233073e';

describe('bookable item bookings', () => {
  beforeEach(async () => {
    await Booking.deleteMany({});
    await Property.deleteMany({});
    await Room.deleteMany({});
  });

  it('books a whole property using only bookableItemId', async () => {
    const property = await Property.create({
      title: 'Whole property',
      propertyType: PropertyType.WHOLE,
      owner: ownerId,
    });

    const response = await request(app)
      .post('/api/bookings')
      .send({ bookableItemId: property._id.toString(), amount: 120000 });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.bookableItemType).toBe('Property');
    expect(response.body.data.bookableItemId._id).toBe(property._id.toString());
    expect(response.body.data.bookableItemId.title).toBe('Whole property');
    expect(response.body.data).not.toHaveProperty('roomId');
    expect(response.body.data).not.toHaveProperty('propertyId');
    expect((await Property.findById(property._id)).available).toBe(false);
  });

  it('books a hostel room by ID and rejects a hostel property ID', async () => {
    const property = await Property.create({
      title: 'Hostel property',
      propertyType: PropertyType.HOSTEL,
      owner: ownerId,
    });
    const room = await Room.create({
      propertyId: property._id,
      type: 'SINGLE',
    });

    const propertyResponse = await request(app)
      .post('/api/bookings')
      .send({ bookableItemId: property._id.toString(), amount: 120000 });
    expect(propertyResponse.statusCode).toBe(400);

    const roomResponse = await request(app)
      .post('/api/bookings')
      .send({ bookableItemId: room._id.toString(), amount: 120000 });

    expect(roomResponse.statusCode).toBe(201);
    expect(roomResponse.body.data.bookableItemType).toBe('Room');
    expect(roomResponse.body.data.bookableItemId._id).toBe(room._id.toString());
    expect(roomResponse.body.data.bookableItemId.type).toBe('SINGLE');
    expect(roomResponse.body.data).not.toHaveProperty('roomId');
    expect(roomResponse.body.data).not.toHaveProperty('propertyId');
    expect((await Room.findById(room._id)).available).toBe(false);
  });
});
