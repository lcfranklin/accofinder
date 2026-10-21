import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { PropertyType } from '../models/enums/PropertyType.mjs';
import { asyncHandler, sendResponse, withId, withIdList } from '../utils/helpers.mjs';
import { createNotification } from '../services/notificationService.mjs';
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

    if (role !== 'ADMIN') {
      const ownedProps = await Property.find({ owner: req.user._id }).select('_id');
      const ownedPropIds = ownedProps.map((p) => p._id);
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

    if (!bookings) {
      return sendResponse(res, 400, false, 'Failed to retrieve bookings');
    }

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

// create a new booking
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
        'This room is currently not available for booking',
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

    if (!booking) {
      return sendResponse(res, 400, false, 'Failed to create booking');
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

    return sendResponse(
      res,
      201,
      true,
      'Booking created successfully',
      withId(populatedBooking),
    );
  } catch (error) {
    next(error);
  }
});

//  update booking details (PENDING state only)
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

    if (booking.status !== BookingStatus.PENDING) {
      return sendResponse(
        res,
        400,
        false,
        `Only PENDING bookings can be updated. Current status: ${booking.status}`,
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

//  cancel a booking
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

    if (booking.status === BookingStatus.CANCELLED) {
      return sendResponse(res, 400, false, 'Booking is already cancelled');
    }

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
      'Booking cancelled successfully',
      withId(booking),
    );
  } catch (error) {
    next(error);
  }
});

// confirm a booking
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

    booking.status = BookingStatus.CONFIRMED;
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

    await Booking.findByIdAndDelete(bookingId);

    // Release the bookable item back if the booking was active.
    const normalizedType = normalizeBookableItemType(booking.bookableItemType);
    const item = normalizedType === 'Property'
      ? await Property.findById(booking.bookableItemId)
      : await Room.findById(booking.bookableItemId);
    if (item) {
      item.available = true;
      await item.save();
    }

    return sendResponse(
      res,
      200,
      true,
      `Booking ${bookingId} deleted successfully`,
    );
  } catch (error) {
    next(error);
  }
});
