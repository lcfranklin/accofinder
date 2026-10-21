import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Room } from '../../models/Room.mjs';
import { Booking } from '../../models/Booking.mjs';
import { BookingStatus } from '../../models/enums/BookingStatus.mjs';
import {
  claimHold,
  releaseHold,
  confirmRoom,
  isHoldActive,
  isRoomBookable,
  decorateRoomWithHold,
} from '../../services/holdService.mjs';
import { releaseExpiredHolds } from '../../services/holdExpiryService.mjs';

// Drives the real MongoDB so the atomicity claims are actually exercised. The
// whole point of this change is that concurrent holds and owner-checked
// releases behave correctly under Mongo's atomic document semantics, and that
// cannot be verified against mocks.

jest.setTimeout(60000);

let mongo;
const propertyId = new mongoose.Types.ObjectId();
const ownerId = new mongoose.Types.ObjectId();
const clientId = new mongoose.Types.ObjectId();

const makeRoom = async (overrides = {}) => {
  const room = await Room.create({
    propertyId,
    type: 'SINGLE',
    price: 50000,
    available: true,
    ...overrides,
  });
  return room;
};

const makeBooking = async (room, overrides = {}) => {
  const now = Date.now();
  const booking = await Booking.create({
    clientId,
    roomId: room._id,
    amount: 50000,
    status: BookingStatus.PENDING_PAYMENT,
    expiresAt: new Date(now + 20 * 60 * 1000),
    hardExpiresAt: new Date(now + 65 * 60 * 1000),
    ...overrides,
  });
  return booking;
};

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();

  // Importing the models transitively pulls in config/firebase.mjs, which can
  // leave mongoose already bound to another URI. Drop any existing connection
  // so these tests can only ever touch the throwaway in-memory database and
  // never the configured dev/test cluster.
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await Promise.all([Room.deleteMany({}), Booking.deleteMany({})]);
});

describe('hold predicates', () => {
  it('treats a room with no hold as free', () => {
    expect(isHoldActive({})).toBe(false);
    expect(isHoldActive({ holdRef: null, holdExpiresAt: null })).toBe(false);
    expect(isRoomBookable({ available: true, holdRef: null })).toBe(true);
  });

  it('treats a lapsed hold as free even before the sweeper runs', () => {
    const lapsed = {
      available: true,
      holdRef: new mongoose.Types.ObjectId(),
      holdExpiresAt: new Date(Date.now() - 1000),
    };
    expect(isHoldActive(lapsed)).toBe(false);
    // This is what makes correctness independent of the sweeper running.
    expect(isRoomBookable(lapsed)).toBe(true);
  });

  it('treats a live hold as not bookable', () => {
    const live = {
      available: true,
      holdRef: new mongoose.Types.ObjectId(),
      holdExpiresAt: new Date(Date.now() + 60_000),
    };
    expect(isHoldActive(live)).toBe(true);
    expect(isRoomBookable(live)).toBe(false);
  });

  it('treats a confirmed room as not bookable regardless of hold', () => {
    expect(
      isRoomBookable({ available: false, holdExpiresAt: null }),
    ).toBe(false);
  });
});

describe('claimHold', () => {
  it('claims a free room and stamps both fields atomically', async () => {
    const room = await makeRoom();
    const bookingId = new mongoose.Types.ObjectId();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

    const claimed = await claimHold({ roomId: room._id, bookingId, expiresAt });

    expect(claimed).not.toBeNull();
    expect(claimed.holdRef.toString()).toBe(bookingId.toString());
    expect(claimed.holdExpiresAt.toISOString()).toBe(expiresAt.toISOString());
  });

  it('refuses a second claim while the hold is live', async () => {
    const room = await makeRoom();
    const first = new mongoose.Types.ObjectId();
    const second = new mongoose.Types.ObjectId();

    await claimHold({
      roomId: room._id,
      bookingId: first,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const loser = await claimHold({
      roomId: room._id,
      bookingId: second,
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(loser).toBeNull();

    const stored = await Room.findById(room._id);
    expect(stored.holdRef.toString()).toBe(first.toString());
  });

  it('lets exactly one of many concurrent claims win', async () => {
    const room = await makeRoom();
    const contenders = Array.from({ length: 12 }, () => new mongoose.Types.ObjectId());

    const results = await Promise.all(
      contenders.map((bookingId) =>
        claimHold({
          roomId: room._id,
          bookingId,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(1);

    const stored = await Room.findById(room._id);
    expect(contenders.map(String)).toContain(stored.holdRef.toString());
  });

  it('allows a claim once the previous hold has lapsed', async () => {
    const room = await makeRoom();
    await claimHold({
      roomId: room._id,
      bookingId: new mongoose.Types.ObjectId(),
      expiresAt: new Date(Date.now() - 1000),
    });

    const nextId = new mongoose.Types.ObjectId();
    const claimed = await claimHold({
      roomId: room._id,
      bookingId: nextId,
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(claimed).not.toBeNull();
    expect(claimed.holdRef.toString()).toBe(nextId.toString());
  });

  it('never claims a permanently booked room', async () => {
    const room = await makeRoom({ available: false });

    const claimed = await claimHold({
      roomId: room._id,
      bookingId: new mongoose.Types.ObjectId(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    expect(claimed).toBeNull();
  });
});

describe('releaseHold', () => {
  it('releases a hold the booking actually owns', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room);
    await claimHold({
      roomId: room._id,
      bookingId: booking._id,
      expiresAt: booking.expiresAt,
    });

    const released = await releaseHold({
      roomId: room._id,
      bookingId: booking._id,
    });

    expect(released).toBe(true);
    const stored = await Room.findById(room._id);
    expect(stored.holdRef).toBeNull();
    expect(stored.holdExpiresAt).toBeNull();
  });

  it('does NOT free a room held by a different booking', async () => {
    // The regression this whole change exists for: booking A is cancelled after
    // its hold lapsed and booking B took the room. A's release must not free B.
    const room = await makeRoom();
    const bookingA = await makeBooking(room);
    const bookingB = await makeBooking(room);

    await claimHold({
      roomId: room._id,
      bookingId: bookingB._id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const released = await releaseHold({
      roomId: room._id,
      bookingId: bookingA._id,
    });

    expect(released).toBe(false);
    const stored = await Room.findById(room._id);
    expect(stored.holdRef.toString()).toBe(bookingB._id.toString());
  });
});

describe('confirmRoom', () => {
  it('books the room permanently and clears the hold', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room);
    await claimHold({
      roomId: room._id,
      bookingId: booking._id,
      expiresAt: booking.expiresAt,
    });

    const outcome = await confirmRoom({
      roomId: room._id,
      bookingId: booking._id,
    });

    expect(outcome.confirmed).toBe(true);
    const stored = await Room.findById(room._id);
    expect(stored.available).toBe(false);
    expect(stored.holdRef).toBeNull();
    expect(stored.holdExpiresAt).toBeNull();
  });

  it('honours a late confirmation when nobody took the room', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room);
    // Hold already swept away; room is free and unheld.
    await Room.updateOne(
      { _id: room._id },
      { $set: { holdRef: null, holdExpiresAt: null } },
    );

    const outcome = await confirmRoom({
      roomId: room._id,
      bookingId: booking._id,
    });

    expect(outcome.confirmed).toBe(true);
    const stored = await Room.findById(room._id);
    expect(stored.available).toBe(false);
  });

  it('refuses to steal a room now held by someone else', async () => {
    const room = await makeRoom();
    const bookingA = await makeBooking(room);
    const bookingB = await makeBooking(room);

    await claimHold({
      roomId: room._id,
      bookingId: bookingB._id,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const outcome = await confirmRoom({
      roomId: room._id,
      bookingId: bookingA._id,
    });

    expect(outcome.confirmed).toBe(false);
    const stored = await Room.findById(room._id);
    // B's hold untouched, room still bookable for B.
    expect(stored.available).toBe(true);
    expect(stored.holdRef.toString()).toBe(bookingB._id.toString());
  });
});

describe('releaseExpiredHolds', () => {
  it('expires a lapsed hold and frees the room', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room, {
      expiresAt: new Date(Date.now() - 1000),
      hardExpiresAt: new Date(Date.now() + 60_000),
    });
    await claimHold({
      roomId: room._id,
      bookingId: booking._id,
      expiresAt: booking.expiresAt,
    });

    const stats = await releaseExpiredHolds({ notify: false });

    expect(stats.expired).toBe(1);
    expect(stats.roomsReleased).toBe(1);

    const storedBooking = await Booking.findById(booking._id);
    expect(storedBooking.status).toBe(BookingStatus.EXPIRED);
    expect(storedBooking.expiredAt).not.toBeNull();

    const storedRoom = await Room.findById(room._id);
    expect(storedRoom.holdRef).toBeNull();
    expect(storedRoom.holdExpiresAt).toBeNull();
  });

  it('leaves a hold that is still inside its window', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room);

    const stats = await releaseExpiredHolds({ notify: false });

    expect(stats.expired).toBe(0);
    const storedBooking = await Booking.findById(booking._id);
    expect(storedBooking.status).toBe(BookingStatus.PENDING_PAYMENT);
  });

  it('never expires a confirmed booking', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room, {
      status: BookingStatus.CONFIRMED,
      expiresAt: new Date(Date.now() - 1000),
      hardExpiresAt: new Date(Date.now() - 1000),
    });

    const stats = await releaseExpiredHolds({ notify: false });

    expect(stats.expired).toBe(0);
    const stored = await Booking.findById(booking._id);
    expect(stored.status).toBe(BookingStatus.CONFIRMED);
  });

  it('expires a hold that blew through the hard cap even if a grace extension moved expiresAt', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room, {
      status: BookingStatus.PAYMENT_IN_FLIGHT,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      hardExpiresAt: new Date(Date.now() - 1000),
    });

    const stats = await releaseExpiredHolds({ notify: false });

    expect(stats.expired).toBe(1);
    const stored = await Booking.findById(booking._id);
    expect(stored.status).toBe(BookingStatus.EXPIRED);
  });

  it('does not free a room that a confirmed booking owns', async () => {
    const room = await makeRoom({ available: false });
    const booking = await makeBooking(room, {
      status: BookingStatus.PENDING_PAYMENT,
      expiresAt: new Date(Date.now() - 1000),
    });
    // Booked room with a stale hold pointer left behind.
    await Room.updateOne(
      { _id: room._id },
      { $set: { holdRef: booking._id, holdExpiresAt: new Date(Date.now() - 1000) } },
    );

    await releaseExpiredHolds({ notify: false });

    const stored = await Room.findById(room._id);
    // Hold fields cleared, but the room stays permanently unavailable.
    expect(stored.holdRef).toBeNull();
    expect(stored.available).toBe(false);
  });
});

describe('listing annotation', () => {
  it('flags a held room as on hold but still bookable-in-principle', async () => {
    const room = await makeRoom();
    const decorated = decorateRoomWithHold(
      await Room.findById(room._id),
    );

    expect(decorated.holdActive).toBe(false);
    expect(decorated.isBookable).toBe(true);
  });

  it('flags a live hold so the client can say "On Hold"', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room);
    await claimHold({
      roomId: room._id,
      bookingId: booking._id,
      expiresAt: booking.expiresAt,
    });

    const decorated = decorateRoomWithHold(await Room.findById(room._id));

    expect(decorated.holdActive).toBe(true);
    expect(decorated.isBookable).toBe(false);
    expect(decorated.holdExpiresAt).toBeTruthy();
  });

  it('does not leak a lapsed expiry to the client', async () => {
    const room = await makeRoom();
    await claimHold({
      roomId: room._id,
      bookingId: new mongoose.Types.ObjectId(),
      expiresAt: new Date(Date.now() - 1000),
    });

    const decorated = decorateRoomWithHold(await Room.findById(room._id));

    expect(decorated.holdActive).toBe(false);
    expect(decorated.holdExpiresAt).toBeNull();
  });
});