import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

//  get all bookings (Admin/Agent utility)
export const getBookings = asyncHandler(async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('clientId', 'firstName lastName email phone')
      .populate({
        path: 'roomId',
        populate: { path: 'propertyId', select: 'title location price' },
      });

    if (!bookings) {
      return sendResponse(res, 400, false, 'Failed to retrieve bookings');
    }

    return sendResponse(
      res,
      200,
      true,
      'Bookings retrieved successfully',
      bookings,
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

    return sendResponse(res, 200, true, 'Booking found', booking);
  } catch (error) {
    next(error);
  }
});

// create a new booking
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

    // Check room availability
    const room = await Room.findById(roomId);
    if (!room) {
      return sendResponse(res, 404, false, 'Room not found');
    }

    if (!room.available) {
      return sendResponse(
        res,
        409,
        false,
        'This room is currently not available for booking',
      );
    }

    const booking = await Booking.create({
      clientId: new mongoose.Types.ObjectId(clientId),
      roomId: new mongoose.Types.ObjectId(roomId),
      bookingDate: bookingDate ? new Date(bookingDate) : new Date(),
      status: BookingStatus.PENDING,
      amount,
      commissionAmount: commissionAmount || 0,
    });

    if (!booking) {
      return sendResponse(res, 400, false, 'Failed to create booking');
    }

    // Mark room as unavailable
    room.available = false;
    await room.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('clientId', 'firstName lastName email phone')
      .populate('roomId');

    return sendResponse(
      res,
      201,
      true,
      'Booking created successfully',
      populatedBooking,
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
      updatedBooking,
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

    // Release room availability back
    const room = await Room.findById(booking.roomId);
    if (room) {
      room.available = true;
      await room.save();
    }

    return sendResponse(
      res,
      200,
      true,
      'Booking cancelled successfully',
      booking,
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

    return sendResponse(
      res,
      200,
      true,
      'Booking confirmed successfully',
      booking,
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

    // Release room  back if booking was active
    const room = await Room.findById(booking.roomId);
    if (room) {
      room.available = true;
      await room.save();
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
