import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { PropertyType } from '../models/enums/PropertyType.mjs';
import { asyncHandler, sendResponse, withId, withIdList } from '../utils/helpers.mjs';
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

// Resolve the owner (agent) for a property/room item. For room bookings, the
// room has a propertyId. For property bookings, the item itself is the property.
const ownerOfBookableItem = async (item) => {
  if (!item) return null;
  if (item.owner) return item.owner;
  if (item.propertyId) {
    const property = await Property.findById(item.propertyId);
    return property ? property.owner : null;
  }
  return null;
};

const resolveBookableItem = async (bookableItemId) => {
  if (!bookableItemId || !mongoose.Types.ObjectId.isValid(bookableItemId)) {
    return null;
  }

  const property = await Property.findById(bookableItemId);
  if (property?.propertyType === PropertyType.WHOLE) {
    return { type: 'Property', item: property };
  }

  const room = await Room.findById(bookableItemId);
  if (room) {
    return { type: 'Room', item: room };
  }

  return property ? { type: 'Property', item: property } : null;
};

const normalizeBookableItemType = (type) => {
  if (!type) return null;
  const value = String(type).trim();
  if (!value) return null;
  if (value.toLowerCase() === 'property') return 'Property';
  if (value.toLowerCase() === 'room') return 'Room';
  return value;
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
      const ownedRoomIds = ownedRooms.map((r) => r._id);
      if (ownedRoomIds.length === 0 && ownedPropIds.length === 0) {
        return sendResponse(res, 200, true, 'Bookings retrieved successfully', []);
      }

      filter.$or = [
        {
          bookableItemType: 'Room',
          bookableItemId: { $in: ownedRoomIds },
        },
        {
          bookableItemType: 'Property',
          bookableItemId: { $in: ownedPropIds },
        },
      ];
    }

    const bookings = await Booking.find(filter)
      .populate('clientId', 'firstName lastName email phone')
      .populate('bookableItemId')
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
      .populate('bookableItemId');

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
    const {
      bookableItemId,
      bookingDate,
      amount,
      commissionAmount,
    } = req.validatedData || req.body;

    if (!bookableItemId || !amount) {
      return sendResponse(
        res,
        400,
        false,
        'Missing required fields: bookableItemId, amount',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(bookableItemId)) {
      return sendResponse(res, 400, false, 'Invalid bookable item ID format');
    }

    const resolvedItem = await resolveBookableItem(bookableItemId);
    if (!resolvedItem) {
      return sendResponse(
        res,
        404,
        false,
        'Bookable item not found',
      );
    }
    const { type: resolvedType, item } = resolvedItem;

    if (resolvedType === 'Property') {
      if (item.propertyType !== PropertyType.WHOLE) {
        return sendResponse(
          res,
          400,
          false,
          'Only whole properties can be booked directly; select a room instead',
        );
      }
      if (item.available === false) {
        return sendResponse(
          res,
          409,
          false,
          'This property is currently not available for booking',
        );
      }
    } else if (item.available === false) {
      return sendResponse(
        res,
        409,
        false,
        'This room is already booked',
        null,
        { holdActive: false, isBookable: false },
      );
    }

    const booking = await Booking.create({
      clientId: new mongoose.Types.ObjectId(clientId),
      bookableItemType: resolvedType,
      bookableItemId: new mongoose.Types.ObjectId(bookableItemId),
      bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
      status: BookingStatus.PENDING,
      amount,
      commissionAmount: commissionAmount || 0,
    });

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

    const ownerId = await ownerOfBookableItem(item);
    if (ownerId) {
      await createNotification({
        recipientRole: 'AGENT',
        recipientId: ownerId,
        kind: 'SYSTEM',
        title: 'New booking',
        message: resolvedType === 'Property'
          ? `A client reserved a property on your listing (MK ${amount}).`
          : `A client reserved a room on one of your properties (MK ${amount}).`,
        senderId: clientId,
        bookingId: booking._id,
      });
    }

    item.available = false;
    await item.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('clientId', 'firstName lastName email phone')
      .populate('bookableItemId');

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

    // Release the bookable item availability back.
    const normalizedType = normalizeBookableItemType(booking.bookableItemType);
    const bookableItem = normalizedType === 'Property'
      ? await Property.findById(booking.bookableItemId)
      : await Room.findById(booking.bookableItemId);
    if (bookableItem) {
      bookableItem.available = true;
      await bookableItem.save();
    }

    // Notify the client that their booking was cancelled (and the owner).
    if (booking.clientId) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: booking.clientId,
        kind: 'SYSTEM',
        title: 'Booking cancelled',
        message: 'Your booking has been cancelled.',
        senderId: req.user?.sub || req.user?.id || req.user?._id,
        bookingId: booking._id,
      });
    }
    const ownerId = await ownerOfBookableItem(bookableItem);
    if (ownerId) {
      await createNotification({
        recipientRole: 'AGENT',
        recipientId: ownerId,
        kind: 'SYSTEM',
        title: 'Booking cancelled',
        message: 'A booking on your property was cancelled.',
        senderId: req.user?.sub || req.user?.id || req.user?._id,
        bookingId: booking._id,
      });
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
    const normalizedType = normalizeBookableItemType(booking.bookableItemType);
    const ownerItem = normalizedType === 'Property'
      ? await Property.findById(booking.bookableItemId)
      : await Room.findById(booking.bookableItemId);
    const ownerId = await ownerOfBookableItem(ownerItem);
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

//  release a confirmed booking back to the market (refund / re-list)
//
//  cancelBooking deliberately leaves a CONFIRMED room booked, because a client
//  walking away must not silently hand a paid-for room to someone else. When the
//  money is actually refunded, though, the room is free again - and only an
//  admin or the property owner may make that call. This endpoint is the
//  counterpart that sets the booking to REFUNDED and puts the room back on the
//  market.
export const releaseBooking = asyncHandler(async (req, res, next) => {
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

    if (booking.status === BookingStatus.REFUNDED) {
      return sendResponse(res, 400, false, 'Booking is already refunded');
    }

    if (booking.status !== BookingStatus.CONFIRMED) {
      return sendResponse(
        res,
        400,
        false,
        `Only a confirmed booking can be released (status: ${booking.status}).`,
      );
    }

    const room = await Room.findById(booking.roomId);
    if (!room) {
      return sendResponse(
        res,
        404,
        false,
        'The room for this booking no longer exists.',
      );
    }

    // Authorisation: an admin can always release; an agent/landlord only for a
    // property they own.
    const role = String(req.user?.role || '').toUpperCase();
    if (role !== 'ADMIN') {
      const ownerId = await ownerOfRoom(room);
      const requesterId = req.user?.id || req.user?.sub || req.user?._id;
      if (!ownerId || String(ownerId) !== String(requesterId)) {
        return sendResponse(
          res,
          403,
          false,
          'Only an admin or the property owner can release this booking.',
        );
      }
    }

    booking.status = BookingStatus.REFUNDED;
    booking.refundedAt = new Date();
    // The hold fields were historical once confirmed; make sure nothing here is
    // mistaken for a live hold.
    booking.expiresAt = null;
    await booking.save();

    // Return the room to the market and clear any leftover hold so it is
    // immediately bookable again.
    const reopened = await Room.updateOne(
      { _id: booking.roomId },
      { $set: { available: true, holdRef: null, holdExpiresAt: null } },
    );

    if (booking.clientId) {
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: booking.clientId,
        kind: 'SYSTEM',
        title: 'Booking refunded',
        message:
          'Your booking has been refunded and released. The room is available again.',
        senderId: req.user?.sub || req.user?.id || req.user?._id,
        bookingId: booking._id,
      });
    }

    return sendResponse(
      res,
      200,
      true,
      'Booking released. The room is available again.',
      withId(booking),
      { roomReleased: reopened.modifiedCount === 1 },
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
      return sendResponse(
        res,
        200,
        true,
        `Booking ${bookingId} cancelled successfully`,
        withId(booking),
        { deleted: false },
      );
    }

    // Release the bookable item back if the booking was active.
    const normalizedType = normalizeBookableItemType(booking.bookableItemType);
    const item = normalizedType === 'Property'
      ? await Property.findById(booking.bookableItemId)
      : await Room.findById(booking.bookableItemId);
    if (item) {
      item.available = true;
      await item.save();
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
