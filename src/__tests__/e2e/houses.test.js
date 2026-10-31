import request from 'supertest';
import app from '../../app.mjs';
import { Property } from '../../models/Property.mjs';
import { Room } from '../../models/Room.mjs';

const agentId = '6a057ca99d9d0fbeb233073d';

jest.mock('../../middleware/authMiddleware.mjs', () => ({
  isAuthenticated: (req, res, next) => {
    req.user = { _id: '6a057ca99d9d0fbeb233073d', role: 'ADMIN' };
    next();
  },
  checkRole: () => (req, res, next) => next(),
}));

describe('Property listing API', () => {
  beforeAll(async () => {
    await Property.init();
    await Room.init();
  });

  beforeEach(async () => {
    await Property.deleteMany({});
    await Room.deleteMany({});
  });

  it('creates property fees and inline room fees that round-trip through list and detail', async () => {
    const response = await request(app)
      .post('/api/house-listing')
      .send({
        title: 'Fee round-trip house',
        description: 'A property with room and monthly fee round-trip coverage.',
        propertyType: 'HOSTEL',
        verificationStatus: 'VERIFIED',
        bookingFee: 1500,
        rentalFee: 48000,
        physicalAddress: { district: 'Dedza', village: 'Bembeke' },
        rooms: [{ type: 'SINGLE', bookingFee: 500, rentalFee: 22000 }],
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.data.bookingFee).toBe(1500);
    expect(response.body.data.rentalFee).toBe(48000);
    expect(response.body.data.rooms[0].bookingFee).toBe(500);
    expect(response.body.data.rooms[0].rentalFee).toBe(22000);

    const propertyId = response.body.data._id;
    const listResponse = await request(app)
      .get('/api/house-listing')
      .query({ owner: agentId });
    const listedProperty = listResponse.body.data.properties.find(
      (property) => property._id === propertyId,
    );
    expect(listedProperty.bookingFee).toBe(1500);
    expect(listedProperty.rentalFee).toBe(48000);

    const detailResponse = await request(app).get(`/api/house-listing/${propertyId}`);
    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.body.data.bookingFee).toBe(1500);
    expect(detailResponse.body.data.rentalFee).toBe(48000);
    expect(detailResponse.body.data.rooms[0].bookingFee).toBe(500);
    expect(detailResponse.body.data.rooms[0].rentalFee).toBe(22000);
  });

  it('persists updated property fees on a later fetch', async () => {
    const property = await Property.create({
      title: 'Property update fees',
      description: 'A property used to verify updated monetary fields.',
      owner: agentId,
      verificationStatus: 'VERIFIED',
    });

    const updateResponse = await request(app)
      .put(`/api/house-listing/${property._id}`)
      .send({ bookingFee: 2750, rentalFee: 51500 });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.body.data.bookingFee).toBe(2750);
    expect(updateResponse.body.data.rentalFee).toBe(51500);

    const detailResponse = await request(app).get(`/api/house-listing/${property._id}`);
    expect(detailResponse.body.data.bookingFee).toBe(2750);
    expect(detailResponse.body.data.rentalFee).toBe(51500);
  });

  it('rejects duplicate owner and district/village listings, including concurrent creates', async () => {
    const payload = {
      description: 'A property used to verify duplicate address protection.',
      physicalAddress: { district: 'Mchinji', village: 'Kapiri' },
      rooms: [{ type: 'SINGLE', rentalFee: 20000 }],
    };
    const first = await request(app)
      .post('/api/house-listing')
      .send({ ...payload, title: 'First listing' });
    const second = await request(app)
      .post('/api/house-listing')
      .send({ ...payload, title: 'Second listing' });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
    expect(second.body.error).toBe('Duplicate property');
    expect(await Room.countDocuments({})).toBe(1);

    await Property.deleteMany({});
    await Room.deleteMany({});
    const concurrent = await Promise.all([
      request(app)
        .post('/api/house-listing')
        .send({ ...payload, title: 'Concurrent listing one' }),
      request(app)
        .post('/api/house-listing')
        .send({ ...payload, title: 'Concurrent listing two' }),
    ]);

    expect(concurrent.map((result) => result.statusCode).sort()).toEqual([201, 409]);
  });
});
