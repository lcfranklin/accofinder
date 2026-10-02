import mongoose from 'mongoose';
import { Room } from '../models/Room.mjs';

// Provisional hold primitives.
//
// Every read and write of a room's hold state goes through here so that the
// "only the holder may release it" rule is enforced in exactly one place. That
// rule is what stops a stale cancel from freeing a room that a different
// booking has since taken.

const objectId = (value) => {
  if (!value) return null;
  return value instanceof mongoose.Types.ObjectId
    ? value
    : new mongoose.Types.ObjectId(String(value));
};

// A hold is live while it has an expiry that has not yet passed. A room with no
// hold at all is trivially free, which is why this is safe to call on rooms
// created before the hold fields existed.
export const isHoldActive = (room, now = new Date()) =>
  Boolean(room?.holdExpiresAt) &&
  new Date(room.holdExpiresAt).getTime() > now.getTime();

// True when a new booking may claim this room: it must not be permanently
// unavailable, and any hold on it must already have lapsed. Deliberately
// tolerant of a lapsed-but-not-yet-swept hold so a stale hold can never make a
// bookable room look taken.
export const isRoomBookable = (room, now = new Date()) =>
  Boolean(room) &&
  room.available === true &&
  !isHoldActive(room, now);

// Atomically claim the hold for `bookingId`.
//
// This single findOneAndUpdate is the concurrency guarantee: two clients racing
// for the same room cannot both match the filter, because Mongo applies the
// predicate and the update as one atomic document operation. The loser gets
// null back and is told the room is taken. An earlier read-then-write pair
// (check `available`, then save) let both requests through.
export const claimHold = async ({ roomId, bookingId, expiresAt }) => {
  const now = new Date();
  return Room.findOneAndUpdate(
    {
      _id: roomId,
      available: true,
      $or: [
        { holdRef: null },
        { holdRef: { $exists: false } },
        { holdExpiresAt: null },
        { holdExpiresAt: { $exists: false } },
        { holdExpiresAt: { $lte: now } },
      ],
    },
    { $set: { holdRef: objectId(bookingId), holdExpiresAt: expiresAt } },
    { returnDocument: 'after' },
  );
};

// Clear the hold, but only if this booking still holds it.
//
// Returns true when the room was released by this call, false when the hold had
// already moved on (expired and re-claimed, or confirmed). Callers use the
// return value to avoid reporting a release that did not happen.
export const releaseHold = async ({ roomId, bookingId }) => {
  const result = await Room.updateOne(
    { _id: roomId, holdRef: objectId(bookingId) },
    { $set: { holdRef: null, holdExpiresAt: null } },
  );
  return result.modifiedCount === 1;
};

// Take the room off the market permanently because payment was confirmed.
//
// Normally the booking still holds the room, and this is one atomic step. But a
// payment can be verified after the hold lapsed and the fields were swept. If
// nobody else has claimed the room by then we still honour the confirmation;
// if someone else holds it, we must not steal it, and the caller is told so it
// can refund rather than confirm.
export const confirmRoom = async ({ roomId, bookingId }) => {
  const claimed = await Room.updateOne(
    { _id: roomId, holdRef: objectId(bookingId) },
    { $set: { available: false, holdRef: null, holdExpiresAt: null } },
  );
  if (claimed.modifiedCount === 1) {
    return { confirmed: true, reason: 'hold_released' };
  }

  const room = await Room.findById(roomId).select(
    'available holdRef holdExpiresAt',
  );
  if (!room) return { confirmed: false, reason: 'room_missing' };

  if (isRoomBookable(room)) {
    // The hold lapsed but nobody took the room, so the payment still wins.
    const taken = await Room.updateOne(
      { _id: roomId, holdRef: null },
      { $set: { available: false } },
    );
    return taken.modifiedCount === 1
      ? { confirmed: true, reason: 'hold_lapsed_unclaimed' }
      : { confirmed: false, reason: 'room_taken' };
  }

  return { confirmed: false, reason: 'room_taken' };
};

// Annotate rooms for the listing endpoint. A room under a live hold is still
// listed - it is not permanently booked - but the client needs to know it is
// spoken for so it can say "On Hold" and disable the action.
export const decorateRoomsWithHold = (rooms, now = new Date()) =>
  rooms.map((room) => {
    const doc =
      room && typeof room.toObject === 'function' ? room.toObject() : room;
    const active = isHoldActive(doc, now);
    return {
      ...doc,
      holdActive: active,
      // True when the hold belongs to nobody we could act on, i.e. it is either
      // free or held by a booking that is no longer live.
      isBookable: isRoomBookable(doc, now),
      holdExpiresAt: active ? doc.holdExpiresAt : null,
    };
  });

// Single-room form of the above, for the detail endpoint that drives the
// Book Now button. Returns null for a missing room so callers can keep their
// own 404 handling.
export const decorateRoomWithHold = (room, now = new Date()) => {
  if (!room) return null;
  return decorateRoomsWithHold([room], now)[0];
};