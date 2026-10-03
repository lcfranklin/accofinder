import request from 'supertest';

// The delete flow is guarded by two independent contracts: it must leave no
// trace of the property behind, and it must refuse while the property's rooms
// still hold bookings unless the admin explicitly overrides. These tests pin
// both, and they mock every model so they run without a database - the shared
// e2e suite needs Atlas, which is not available in every environment.

const PROPERTY_ID = '6a057ca99d9d0fbeb233073d';
const ROOM_ID = '6a057ca99d9d0fbeb233074e';

jest.mock('../../models/Property.mjs', () => ({
  Property: {
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('../../models/Room.mjs', () => ({
  Room: {
    find: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../models/media.mjs', () => ({
  Media: {
    find: jest.fn(),
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../models/Booking.mjs', () => ({
  Booking: {
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('../../models/Review.mjs', () => ({
  Review: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../models/Verifications.mjs', () => ({
  Verification: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../config/s3.mjs', () => ({
  deleteS3ObjectsByUrls: jest.fn(),
}));

jest.mock('../../services/notificationService.mjs', () => ({
  createNotification: jest.fn(),
}));

// Pretend to be a signed-in admin so the route's isAuthenticated/checkRole
// middleware lets the request through; the role check itself is asserted
// separately in propertyRoutes.
jest.mock('../../middleware/authMiddleware.mjs', () => ({
  isAuthenticated: jest.fn((req, res, next) => {
    req.user = { _id: '6a057ca99d9d0fbeb233073a', role: 'ADMIN' };
    next();
  }),
  checkRole: () => (req, res, next) => next(),
}));

import app from '../../app.mjs';
import { Property } from '../../models/Property.mjs';
import { Room } from '../../models/Room.mjs';
import { Media } from '../../models/media.mjs';
import { Booking } from '../../models/Booking.mjs';
import { Review } from '../../models/Review.mjs';
import { Verification } from '../../models/Verifications.mjs';
import { deleteS3ObjectsByUrls } from '../../config/s3.mjs';

// `Room.find().select()` is awaited directly, so the chain has to resolve.
function mockRooms(...ids) {
  Room.find.mockReturnValue({
    select: jest.fn().mockResolvedValue(ids.map((id) => ({ _id: id }))),
  });
}

describe('DELETE /api/house-listing/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRooms(ROOM_ID);
    Booking.countDocuments.mockResolvedValue(0);
    Property.findByIdAndDelete.mockResolvedValue({ _id: PROPERTY_ID, title: 'Demo house' });
    Media.find.mockResolvedValue([]);
    Room.deleteMany.mockResolvedValue({ deletedCount: 1 });
    Media.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Review.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Verification.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Booking.updateMany.mockResolvedValue({ modifiedCount: 0 });
  });

  it('removes every trace of the property, not just the property row', async () => {
    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);

    expect(Property.findByIdAndDelete).toHaveBeenCalledWith(PROPERTY_ID);
    expect(Room.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
    expect(Media.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
    // These two are keyed directly on propertyId and used to be left behind as
    // dangling rows, so a deleted listing kept its reviews and approval trail.
    expect(Review.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
    expect(Verification.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
  });

  it('deletes the S3 objects behind the media records, not just the rows', async () => {
    Media.find.mockResolvedValue([{ url: 'https://bucket/a.jpg' }, { url: 'https://bucket/b.jpg' }]);

    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}`);

    expect(res.statusCode).toBe(200);
    expect(deleteS3ObjectsByUrls).toHaveBeenCalledWith(['https://bucket/a.jpg', 'https://bucket/b.jpg']);
  });

  it('blocks the delete and reports the count when a room still has an active booking', async () => {
    Booking.countDocuments.mockResolvedValue(2);

    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}`);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    // The Qt client keys its override dialog off this exact field.
    expect(res.body.activeBookings).toBe(2);
    expect(res.body.message).toMatch(/2 active bookings/);

    // Nothing may be removed while the decision is still open.
    expect(Property.findByIdAndDelete).not.toHaveBeenCalled();
    expect(Room.deleteMany).not.toHaveBeenCalled();
    expect(Review.deleteMany).not.toHaveBeenCalled();
    expect(Verification.deleteMany).not.toHaveBeenCalled();
  });

  it('cancels the blocking bookings and deletes everything when force=true', async () => {
    Booking.countDocuments.mockResolvedValue(2);

    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}?force=true`);

    expect(res.statusCode).toBe(200);
    expect(Booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: { $in: [ROOM_ID] } }),
      { $set: { status: 'Cancelled' } },
    );
    expect(Room.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
    expect(Review.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
    expect(Verification.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
  });

  it('treats a cancelled or expired booking as not occupying the room', async () => {
    Booking.countDocuments.mockResolvedValue(0);

    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}`);

    expect(res.statusCode).toBe(200);
    // Only CANCELLED and EXPIRED release a room, so anything else must have
    // been counted as blocking rather than silently ignored.
    const filter = Booking.countDocuments.mock.calls[0][0];
    expect(filter.status.$nin).toEqual(['Cancelled', 'Expired']);
    expect(Booking.updateMany).not.toHaveBeenCalled();
  });

  it('skips the booking guard entirely when the property has no rooms', async () => {
    mockRooms();

    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}`);

    expect(res.statusCode).toBe(200);
    expect(Booking.countDocuments).not.toHaveBeenCalled();
    expect(Room.deleteMany).toHaveBeenCalledWith({ propertyId: PROPERTY_ID });
  });

  it('rejects a malformed id before touching the database', async () => {
    const res = await request(app).delete('/api/house-listing/not-an-object-id');

    expect(res.statusCode).toBe(400);
    expect(Property.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('reports 404 when the property is already gone', async () => {
    Property.findByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete(`/api/house-listing/${PROPERTY_ID}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});