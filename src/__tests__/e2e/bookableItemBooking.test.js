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
const agentId = '6a057ca99d9d0fbeb233073d';

describe('bookable item bookings', () => {
  beforeAll(async () => {
    await Property.init();
    await Room.init();
  });

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
      .send({
        bookableItemId: property._id.toString(),
        clientId: agentId,
        amount: 40000,
        commissionAmount: 4000,
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.bookableItemType).toBe('Property');
    expect(response.body.data.amount).toBe(40000);
    expect(response.body.data.commissionAmount).toBe(4000);
    expect(response.body.data.bookableItemId._id).toBe(property._id.toString());
    expect(response.body.data.bookableItemId.title).toBe('Whole property');
    expect(response.body.data).not.toHaveProperty('roomId');
    expect(response.body.data).not.toHaveProperty('propertyId');
    expect((await Property.findById(property._id)).available).toBe(false);
    expect(response.body.data.status).toBe('PendingPayment');
    expect(response.body.holdExpiresAt).toBeTruthy();
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
      .send({
        bookableItemId: room._id.toString(),
        clientId: agentId,
        amount: 40000,
        commissionAmount: 4000,
      });

    expect(roomResponse.statusCode).toBe(201);
    expect(roomResponse.body.data.bookableItemType).toBe('Room');
    expect(roomResponse.body.data.amount).toBe(40000);
    expect(roomResponse.body.data.commissionAmount).toBe(4000);
    expect(roomResponse.body.data.bookableItemId._id).toBe(room._id.toString());
    expect(roomResponse.body.data.bookableItemId.type).toBe('SINGLE');
    expect(roomResponse.body.data).not.toHaveProperty('roomId');
    expect(roomResponse.body.data).not.toHaveProperty('propertyId');
    const storedRoom = await Room.findById(room._id);
    expect(storedRoom.available).toBe(true);
    expect(storedRoom.holdRef.toString()).toBe(roomResponse.body.data._id);
    expect(storedRoom.holdExpiresAt).toEqual(new Date(roomResponse.body.holdExpiresAt));
  });

  it('cancels a room booking by its polymorphic bookable item ID and releases its hold', async () => {
    const property = await Property.create({
      title: 'Booking cancellation property',
      owner: ownerId,
    });
    const room = await Room.create({
      propertyId: property._id,
      type: 'SINGLE',
      bookingFee: 500,
      rentalFee: 20000,
    });

    const bookingResponse = await request(app)
      .post('/api/bookings')
      .send({
        bookableItemId: room._id.toString(),
        clientId: agentId,
        amount: 40000,
        commissionAmount: 4000,
      });
    expect(bookingResponse.statusCode).toBe(201);

    const cancelResponse = await request(app)
      .patch(`/api/bookings/${bookingResponse.body.data._id}/cancel`);
    expect(cancelResponse.statusCode).toBe(200);
    expect(cancelResponse.body.data.status).toBe('Cancelled');
    expect(cancelResponse.body.roomReleased).toBe(true);

    const reloadedRoom = await Room.findById(room._id);
    expect(reloadedRoom.holdRef).toBeNull();
    expect(reloadedRoom.holdExpiresAt).toBeNull();
    expect(reloadedRoom.available).toBe(true);
  });

  it('confirms a room booking using its bookableItemId', async () => {
    const property = await Property.create({
      title: 'Booking confirmation property',
      owner: ownerId,
    });
    const room = await Room.create({
      propertyId: property._id,
      type: 'DOUBLE',
      bookingFee: 1000,
      rentalFee: 30000,
    });
    const bookingResponse = await request(app)
      .post('/api/bookings')
      .send({ bookableItemId: room._id.toString(), amount: 40000 });
    expect(bookingResponse.statusCode).toBe(201);

    const confirmation = await request(app)
      .patch(`/api/bookings/${bookingResponse.body.data._id}/confirm`);
    expect(confirmation.statusCode).toBe(200);
    expect(confirmation.body.data.status).toBe('Confirmed');
    const reloadedRoom = await Room.findById(room._id);
    expect(reloadedRoom.available).toBe(false);
    expect(reloadedRoom.holdRef).toBeNull();
  });

  it('creates properties with fees and inline room fees and returns them on list and detail', async () => {
    const response = await request(app)
      .post('/api/properties')
      .send({
        title: 'Fee round-trip property',
        description: 'A property used for pricing round-trip coverage.',
        propertyType: 'HOSTEL',
        verificationStatus: 'VERIFIED',
        bookingFee: 125.5,
        rentalFee: 45000,
        physicalAddress: { district: 'Dedza', village: 'Bembeke' },
        rooms: [{ type: 'SINGLE', bookingFee: 2000, rentalFee: 25000 }],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.bookingFee).toBe(125.5);
    expect(response.body.data.rentalFee).toBe(45000);
    expect(response.body.data.rooms[0].bookingFee).toBe(2000);
    expect(response.body.data.rooms[0].rentalFee).toBe(25000);

    const propertyId = response.body.data._id;
    const listed = await request(app)
      .get('/api/properties')
      .query({ owner: agentId });
    const listItem = listed.body.data.properties.find((item) => item._id === propertyId);
    expect(listItem.bookingFee).toBe(125.5);
    expect(listItem.rentalFee).toBe(45000);

    const detail = await request(app).get(`/api/properties/${propertyId}`);
    expect(detail.statusCode).toBe(200);
    expect(detail.body.data.bookingFee).toBe(125.5);
    expect(detail.body.data.rentalFee).toBe(45000);
    expect(detail.body.data.rooms[0].bookingFee).toBe(2000);
    expect(detail.body.data.rooms[0].rentalFee).toBe(25000);
    expect((await Room.findById(detail.body.data.rooms[0]._id)).rentalFee).toBe(25000);
  });

  it('updates property fees and preserves them after fetching the property again', async () => {
    const property = await Property.create({
      title: 'Property fee update',
      description: 'A property used for update round-trip coverage.',
      owner: agentId,
    });

    const update = await request(app)
      .put(`/api/properties/${property._id}`)
      .send({ bookingFee: 300, rentalFee: 52000 });
    expect(update.statusCode).toBe(200);
    expect(update.body.data.bookingFee).toBe(300);
    expect(update.body.data.rentalFee).toBe(52000);

    const detail = await request(app).get(`/api/properties/${property._id}`);
    expect(detail.body.data.bookingFee).toBe(300);
    expect(detail.body.data.rentalFee).toBe(52000);
  });

  it('rejects duplicate property addresses for the same agent', async () => {
    const payload = {
      title: 'First property at address',
      description: 'A property used to verify duplicate address rejection.',
      physicalAddress: { district: 'Mchinji', village: 'Kapiri' },
    };

    const first = await request(app).post('/api/properties').send(payload);
    const duplicate = await request(app)
      .post('/api/properties')
      .send({ ...payload, title: 'Second property at address' });

    expect(first.statusCode).toBe(201);
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.body.error).toBe('Duplicate property');
    expect(duplicate.body.message).toMatch(/district and village address/i);
  });

  it('uses the unique address index to reject concurrent duplicate creates', async () => {
    const payload = {
      description: 'A property used to verify concurrent duplicate protection.',
      physicalAddress: { district: 'Ntcheu', village: 'Tsangano' },
    };
    const results = await Promise.all([
      request(app).post('/api/properties').send({ ...payload, title: 'Concurrent property one' }),
      request(app).post('/api/properties').send({ ...payload, title: 'Concurrent property two' }),
    ]);

    expect(results.map((result) => result.statusCode).sort()).toEqual([201, 409]);
    expect(results.find((result) => result.statusCode === 409).body.error).toBe(
      'Duplicate property',
    );
    const addressIndex = Property.schema.indexes().find(
      ([keys, options]) => options.name === 'unique_owner_physical_address' &&
        keys.owner === 1 &&
        keys['physicalAddress.district'] === 1 &&
        keys['physicalAddress.village'] === 1,
    );
    expect(addressIndex?.[1].unique).toBe(true);
    const databaseIndexes = await Property.collection.indexes();
    expect(databaseIndexes).toContainEqual(
      expect.objectContaining({
        name: 'unique_owner_physical_address',
        unique: true,
      }),
    );
  });

  it.each([
    ['rentalFee', -1],
    ['rentalFee', 'not-a-number'],
    ['rentalFee', 'NaN'],
    ['rentalFee', 'Infinity'],
    ['bookingFee', -1],
    ['bookingFee', 'not-a-number'],
    ['bookingFee', 'NaN'],
    ['bookingFee', 'Infinity'],
  ])('rejects invalid property %s values with a field-level error', async (field, value) => {
    const response = await request(app)
      .post('/api/properties')
      .send({
        title: 'Invalid property fee',
        description: 'A property used to verify monetary validation.',
        [field]: value,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.details.join(' ')).toContain(field);
  });

  it('creates a Qt-shaped room payload while discarding client-owned state', async () => {
    const property = await Property.create({
      title: 'Qt room payload property',
      owner: agentId,
    });
    const clientId = '6a057ca99d9d0fbeb2330740';
    const response = await request(app)
      .post('/api/rooms')
      .send({
        id: clientId,
        propertyId: property._id.toString(),
        type: 'SINGLE',
        price: 27500,
        available: true,
        holdActive: true,
        holdExpiresAt: '2026-10-28T15:00:00.000Z',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.rentalFee).toBe(27500);
    expect(response.body.data.bookingFee).toBe(0);
    expect(response.body.data).not.toHaveProperty('price');
    expect(response.body.data._id).not.toBe(clientId);
    expect(response.body.data.holdActive).toBeUndefined();
    expect(response.body.data.holdExpiresAt).toBeNull();
    expect((await Room.findById(response.body.data._id)).rentalFee).toBe(27500);
  });

  it('updates room fees and preserves them after fetching the room again', async () => {
    const property = await Property.create({
      title: 'Room fee update property',
      owner: agentId,
    });
    const room = await Room.create({
      propertyId: property._id,
      type: 'DOUBLE',
      bookingFee: 1000,
      rentalFee: 10000,
    });

    const update = await request(app)
      .put(`/api/rooms/${room._id}`)
      .send({ bookingFee: 3000, rentalFee: 35000 });
    expect(update.statusCode).toBe(200);
    expect(update.body.data.bookingFee).toBe(3000);
    expect(update.body.data.rentalFee).toBe(35000);

    const detail = await request(app).get(`/api/rooms/${room._id}`);
    expect(detail.body.data.bookingFee).toBe(3000);
    expect(detail.body.data.rentalFee).toBe(35000);

    const listing = await request(app)
      .get('/api/rooms')
      .query({ propertyId: property._id.toString() });
    expect(listing.body.data[0].bookingFee).toBe(3000);
    expect(listing.body.data[0].rentalFee).toBe(35000);
  });

  it.each([
    ['create', 'bookingFee', -1],
    ['create', 'bookingFee', 'not-a-number'],
    ['create', 'bookingFee', 'NaN'],
    ['create', 'bookingFee', 'Infinity'],
    ['create', 'rentalFee', -1],
    ['create', 'rentalFee', 'not-a-number'],
    ['create', 'rentalFee', 'NaN'],
    ['create', 'rentalFee', 'Infinity'],
    ['update', 'bookingFee', -1],
    ['update', 'rentalFee', 'not-a-number'],
    ['update', 'rentalFee', 'NaN'],
    ['update', 'rentalFee', 'Infinity'],
  ])('rejects invalid room %s on %s with a field-level error', async (operation, field, value) => {
    const property = await Property.create({
      title: `Room validation ${operation}`,
      owner: agentId,
    });
    const room = operation === 'update'
      ? await Room.create({ propertyId: property._id, type: 'SINGLE' })
      : null;
    const response = operation === 'create'
      ? await request(app).post('/api/rooms').send({
          propertyId: property._id.toString(),
          type: 'SINGLE',
          [field]: value,
        })
      : await request(app).put(`/api/rooms/${room._id}`).send({ [field]: value });

    expect(response.statusCode).toBe(400);
    expect(response.body.details.join(' ')).toContain(field);
  });
});
