import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import {
  asyncHandler,
  sendResponse,
  withId,
  withIdList,
} from '../utils/helpers.mjs';
import { createNotification } from '../services/notificationService.mjs';
import {
  claimHold,
  releaseHold,
  confirmRoom,
  isHoldActive,
  isRoomBookable,
} from '../services/holdService.mjs';
import {
  HOLD_DURATION_MS,
  HOLD_HARD_CAP_MS,
  HOLD_SUBJECT_STATUSES,
} from '../config/holdConfig.mjs';
import mongoose from 'mongoose';

// Resolve the owner (agent) of the property a room belongs to, so booking and
// payment controllers can notify the right user. Returns null if not found.
const ownerOfRoom = async (room) => {
  if (!room || !room.propertyId) return null;
  const property = await Property.findById(room.propertyId);
  return property ? property.owner : null;
};

//  get all bookings (Admin/Agent utility)
//
//  Scoping: an ADMIN sees every booking, while an AGENT / LANDLORD only sees
//  bookings made on rooms of properties they own (booking -> room -> property
//  -> owner). Without this an agent could see the bookings of every other
//  agent's properties.
export const getBookings = asyncHandler(async (req, res, next) => {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    let filter = {};

    if (role === 'ADMIN') {
    } else if (role === 'CLIENT') {
      filter.clientId = req.user._id;
    } else {
      const ownedProps = await Property.find({
        owner: req.user._id,
      }).select('_id');

      const ownedPropIds = ownedProps.map((property) => property._id);

      const ownedRooms = await Room.find({
        propertyId: { $in: ownedPropIds },
      }).select('_id');

      const ownedRoomIds = ownedRooms.map((room) => room._id);

      if (ownedRoomIds.length === 0) {
        return sendResponse(
          res,
          200,
          true,
          'Bookings retrieved successfully',
          [],
        );
      }

      filter.roomId = { $in: ownedRoomIds };
    }

    const bookings = await Booking.find(filter)
      .populate('clientId', 'firstName lastName email phone')
      .populate({
        path: 'roomId',
        populate: {
          path: 'propertyId',
          select: 'title location price',
        },
      })
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      'Bookings retrieved successfully',
      withIdList(bookings),
    );
  } catch (error) {
    next(error);
  }
});

//  get booking by ID
export const getBookingById = asyncHandler(async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendResponse(res, 400, false, 'Invalid booking ID format');
    }

    const booking = await Booking.findById(bookingId)
      .populate('clientId', 'firstName lastName email phone')
      .populate({
        path: 'roomId',
        populate: {
          path: 'propertyId',
          select: 'title location price agentId landlordId',
        },
      });

    if (!booking) {
      return sendResponse(
        res,
        404,
        false,
        `Booking with id ${bookingId} not found`,
      );
    }

    return sendResponse(res, 200, true, 'Booking found', withId(booking));
  } catch (error) {
    next(error);
  }
});

//  create a new booking — places a provisional hold, it does not book
//
//  This previously flipped room.available to false the moment the request
//  landed, taking the room off the market before any payment was attempted and
//  leaving it there indefinitely if the user never paid. Instead the booking
//  starts as PENDING_PAYMENT and the room is held for a bounded window; only a
//  verified payment makes the booking permanent.
export const createBooking = asyncHandler(async (req, res, next) => {
  try {
    const clientId = req.user.id || req.user.sub || req.user._id;
    const { roomId, bookingDate, amount, commissionAmount } =
      req.validatedData || req.body;

    if (!roomId || !amount) {
      return sendResponse(
        res,
        400,
        false,
        'Missing required fields: roomId, amount',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return sendResponse(res, 400, false, 'Invalid room ID format');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendResponse(res, 404, false, 'Room not found');
    }

    // A confirmed booking owns the room outright, so no hold applies to it.
    if (!room.available) {
      return sendResponse(
        res,
        409,
        false,
        'This room is already booked',
        null,
        { holdActive: false, isBookable: false },
      );
    }

    // Pre-allocate the booking id so the hold can reference it inside the same
    // atomic claim that assigns the hold. Without this the hold would have to
    // be written in a second step, leaving a window where the room is held by
    // nobody at all.
    const bookingId = new mongoose.Types.ObjectId();
    const now = Date.now();
    const expiresAt = new Date(now + HOLD_DURATION_MS);
    const hardExpiresAt = new Date(now + HOLD_HARD_CAP_MS);

    // The single atomic step that decides this request's fate. Exactly one
    // racing request can match this filter, so only one client ever holds.
    const claimed = await claimHold({ roomId, bookingId, expiresAt });

    if (!claimed) {
      // Lost the race, or the room was booked while we were reading it. Report
      // the hold state so the app can say "On Hold" rather than a flat error.
      const current = await Room.findById(roomId).select(
        'available holdRef holdExpiresAt',
      );
      const heldByOther =
        current &&
        current.available === true &&
        isHoldActive(current) &&
        current.holdRef?.toString() !== bookingId.toString();

      return sendResponse(
        res,
        409,
        false,
        heldByOther
          ? 'This room is currently on hold by another user. It becomes bookable again if that hold expires.'
          : 'This room is no longer available for booking',
        null,
        {
          holdActive: Boolean(heldByOther),
          isBookable: Boolean(current && isRoomBookable(current)),
          holdExpiresAt: heldByOther ? current.holdExpiresAt : null,
        },
      );
    }

    let booking;
    try {
      booking = await Booking.create({
        _id: bookingId,
        clientId: new mongoose.Types.ObjectId(clientId),
        roomId: new mongoose.Types.ObjectId(roomId),
        bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
        status: BookingStatus.PENDING_PAYMENT,
        amount,
        commissionAmount: commissionAmount || 0,
        expiresAt,
        hardExpiresAt,
      });
    } catch (error) {
      // Never strand a hold on a booking that does not exist.
      await releaseHold({ roomId, bookingId });
      throw error;
    }

    // Tell the property owner a room on their property is being held. The
    // wording deliberately says "holding", not "reserved" — nothing is booked
    // until money clears.
    const ownerId = await ownerOfRoom(room);
    if (ownerId) {
      await createNotification({
        recipientRole: 'AGENT',
        recipientId: ownerId,
        kind: 'SYSTEM',
        title: 'Room held for booking',
        message: `A client is holding a room on one of your properties (MK ${amount}) while they complete payment.`,
        senderId: clientId,
        bookingId: booking._id,
      });
    }

    const populatedBooking = await Booking.findById(booking._id)
      .populate('clientId', 'firstName lastName email phone')
      .populate('roomId');

    // expiresAt rides along on the booking itself, so the app has everything it
    // needs to render a countdown without a second round trip.
    return sendResponse(
      res,
      201,
      true,
      'Room held for booking. Complete payment before the hold expires.',
      withId(populatedBooking),
      {
        holdExpiresAt: expiresAt,
        status: BookingStatus.PENDING_PAYMENT,
      },
    );
  } catch (error) {
    next(error);
  }
});

//  update booking details (hold in progress only)
//
//  Editable only while the booking is still a hold. Once money has moved or the
//  hold has lapsed the amount and date are a financial/audit fact, so they stop
//  being silently rewritable.
export const updateBooking = asyncHandler(async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendResponse(res, 400, false, 'Invalid booking ID format');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendResponse(
        res,
        404,
        false,
        `Booking with id ${bookingId} not found`,
      );
    }

    const EDITABLE_STATUSES = [
      BookingStatus.PENDING_PAYMENT,
      BookingStatus.FAILED,
      BookingStatus.PENDING, // legacy rows from before the hold model
    ];

    if (!EDITABLE_STATUSES.includes(booking.status)) {
      return sendResponse(
        res,
        400,
        false,
        `This booking can no longer be edited (status: ${booking.status}).`,
      );
    }

    const { bookingDate, amount, commissionAmount } =
      req.validatedData || req.body;
    const updates = { bookingDate, amount, commissionAmount };

    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key],
    );

    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, 'Invalid or empty update fields');
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    return sendResponse(
      res,
      200,
      true,
      'Booking updated successfully',
      withId(updatedBooking),
    );
  } catch (error) {
    next(error);
  }
});

//  cancel a booking / abandon a hold
//
//  Two distinct outcomes share this endpoint:
//
//    - the booking was a live hold   -> release the hold, room becomes bookable
//    - the booking was CONFIRMED     -> the room was permanently booked; keep it
//                                       that way, because freeing it here would
//                                       silently hand a paid-for room to someone
//                                       else while the client believes it was
//                                       cancelled.
export const cancelBooking = asyncHandler(async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendResponse(res, 400, false, 'Invalid booking ID format');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendResponse(
        res,
        404,
        false,
        `Booking with id ${bookingId} not found`,
      );
    }

    if ([BookingStatus.CANCELLED, BookingStatus.EXPIRED].includes(booking.status)) {
      return sendResponse(
        res,
        400,
        false,
        `Booking is already ${booking.status.toLowerCase()}`,
      );
    }

    const wasConfirmed = booking.status === BookingStatus.CONFIRMED;
    const wasLiveHold = HOLD_SUBJECT_STATUSES.includes(booking.status);

    booking.status = BookingStatus.CANCELLED;
    await booking.save();

    // Only the holder may release the hold. If this booking already lost the
    // room (expired and re-claimed, or confirmed) releaseHold matches nothing
    // and the current holder keeps it — which is the bug that let a stale
    // cancel free somebody else's room.
    let roomReleased = false;
    if (!wasConfirmed && wasLiveHold) {
      roomReleased = await releaseHold({
        roomId: booking.roomId,
        bookingId: booking._id,
      });
    }

    const room = await Room.findById(booking.roomId);

    if (!wasConfirmed) {
      // Notify the client that their booking was cancelled (and the owner).
      if (booking.clientId) {
        await createNotification({
          recipientRole: 'CLIENT',
          recipientId: booking.clientId,
          kind: 'SYSTEM',
          title: 'Booking cancelled',
          message: 'Your booking has been cancelled and the room is available again.',
          senderId: req.user?.sub || req.user?.id || req.user?._id,
          bookingId: booking._id,
        });
      }
      const ownerId = await ownerOfRoom(room);
      if (ownerId) {
        await createNotification({
          recipientRole: 'AGENT',
          recipientId: ownerId,
          kind: 'SYSTEM',
          title: 'Booking cancelled',
          message: 'A hold on your property was cancelled.',
          senderId: req.user?.sub || req.user?.id || req.user?._id,
          bookingId: booking._id,
        });
      }
    } else {
      // Cancelling a paid, confirmed booking needs a human: the money is
      // already taken and the room is genuinely gone.
      const ownerId = await ownerOfRoom(room);
      if (ownerId) {
        await createNotification({
          recipientRole: 'AGENT',
          recipientId: ownerId,
          kind: 'SYSTEM',
          title: 'Confirmed booking cancelled',
          message:
            'A confirmed booking on your property was cancelled. The room stays marked as booked until you re-list it.',
          senderId: req.user?.sub || req.user?.id || req.user?._id,
          bookingId: booking._id,
        });
      }
    }

    return sendResponse(
      res,
      200,
      true,
      wasConfirmed
        ? 'Booking cancelled. The room remains booked because payment was already confirmed.'
        : 'Booking cancelled successfully',
      withId(booking),
      { roomReleased, roomRemainsBooked: wasConfirmed },
    );
  } catch (error) {
    next(error);
  }
});

// confirm a booking — normally driven by a verified payment
//
// This endpoint remains available as an agent/admin override (e.g. settling a
// cash payment taken offline), but it is no longer on the critical path:
// processPayment -> verifyMobilePayment confirms the booking automatically.
//
// It refuses to confirm a booking whose hold has lapsed AND whose room has
// since been taken by someone else. Overwriting that would double-book the
// room, so we surface the conflict for a human instead of forcing it through.
export const confirmBooking = asyncHandler(async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendResponse(res, 400, false, 'Invalid booking ID format');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendResponse(
        res,
        404,
        false,
        `Booking with id ${bookingId} not found`,
      );
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return sendResponse(res, 400, false, 'Booking is already confirmed');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return sendResponse(
        res,
        400,
        false,
        'Cannot confirm a cancelled booking',
      );
    }

    // Take the room off the market atomically, but only if we still hold it.
    const outcome = await confirmRoom({
      roomId: booking.roomId,
      bookingId: booking._id,
    });

    if (!outcome.confirmed) {
      return sendResponse(
        res,
        409,
        false,
        outcome.reason === 'room_missing'
          ? 'The room for this booking no longer exists.'
          : 'This booking no longer holds the room, so it cannot be confirmed. Another booking now holds it - resolve this manually.',
        withId(booking),
        { roomConfirmed: false, reason: outcome.reason },
      );
    }

    booking.status = BookingStatus.CONFIRMED;
    // Hold fields on the booking are now historical, not live.
    booking.expiresAt = null;
    await booking.save();

    // Notify the client (and the property owner) that the booking is confirmed.
    if (booking.clientId) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: booking.clientId,
        kind: 'SYSTEM',
        title: 'Booking confirmed',
        message: 'Your booking has been confirmed.',
        senderId: booking.clientId,
        bookingId: booking._id,
      });
    }
    const ownerId = await ownerOfRoom(await Room.findById(booking.roomId));
    if (ownerId) {
      await createNotification({
        recipientRole: 'AGENT',
        recipientId: ownerId,
        kind: 'SYSTEM',
        title: 'Booking confirmed',
        message: 'A booking on your property has been confirmed.',
        senderId: booking.clientId,
        bookingId: booking._id,
      });
    }

    return sendResponse(
      res,
      200,
      true,
      'Booking confirmed successfully',
      withId(booking),
    );
  } catch (error) {
    next(error);
  }
});

//  delete a booking
export const deleteBooking = asyncHandler(async (req, res, next) => {
  try {
    const bookingId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendResponse(res, 400, false, 'Invalid booking ID format');
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendResponse(
        res,
        404,
        false,
        `Booking with id ${bookingId} not found`,
      );
    }

    if (
      [BookingStatus.PAID, BookingStatus.CONFIRMED].includes(booking.status)
    ) {
      return sendResponse(
        res,
        400,
        false,
        'Cannot delete a PAID or CONFIRMED booking. Cancel it first.',
      );
    }

    // Dropping the row destroys the audit trail that reconciliation and
    // "a payment arrived after the hold lapsed" support depends on, so a hold
    // is expired/cancelled rather than deleted. Only rows that were never a
    // live hold may be deleted outright.
    const wasLiveHold = HOLD_SUBJECT_STATUSES.includes(booking.status);
    if (wasLiveHold) {
      booking.status =
        booking.status === BookingStatus.EXPIRED
          ? BookingStatus.EXPIRED
          : BookingStatus.CANCELLED;
      booking.expiredAt = booking.expiredAt || new Date();
      await booking.save();

      // Same ownership rule as cancelBooking: only the holder frees the room.
      const roomReleased = await releaseHold({
        roomId: booking.roomId,
        bookingId: booking._id,
      });

      return sendResponse(
        res,
        200,
        true,
        'Hold withdrawn. The booking record was kept for audit instead of deleted.',
        withId(booking),
        { deleted: false, roomReleased },
      );
    }

    await Booking.findByIdAndDelete(bookingId);

    // Row is gone and it was not holding anything, so there is no hold to
    // release. Deliberately does not touch room.available: a CONFIRMED room is
    // permanently booked and clearing that flag here would double-book it.
    return sendResponse(
      res,
      200,
      true,
      `Booking ${bookingId} deleted successfully`,
      null,
      { deleted: true },
    );
  } catch (error) {
    next(error);
  }
});
