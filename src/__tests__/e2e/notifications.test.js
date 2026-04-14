import request from 'supertest';
import app from '../../app.mjs';
import Notification from '../../models/Notification.mjs';

jest.mock('../../models/Notification.mjs');

describe('Notifications API (MVP)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/notifications returns mapped results', async () => {
    const mockData = [{ _id: '1', message: 'hello' }, { _id: '2', message: 'world' }];
    Notification.find.mockResolvedValue(mockData);

    const res = await request(app).get('/api/notifications');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(mockData);
    expect(Notification.find).toHaveBeenCalledTimes(1);
  });

  it('POST /api/notifications creates notification', async () => {
    const payload = { message: 'hi there' };
    const created = { _id: '10', ...payload };

    Notification.mockImplementation(() => ({ save: jest.fn().mockResolvedValue(created) }));

    const res = await request(app).post('/api/notifications').send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(created);
  });

  it('POST /api/notifications handles save error', async () => {
    const payload = { message: 'fail' };
    const error = new Error('Save error');
    Notification.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(error) }));

    const res = await request(app).post('/api/notifications').send(payload);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Save error');
  });
});
