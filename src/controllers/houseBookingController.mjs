import mongoose from 'mongoose';
import HouseBooking from '../models/HouseBooking.mjs';

export const getBookings = async (req, res, next) => {
  try {
    const bookings = await HouseBooking.find();
    if (!bookings) {
      return res.status(500).json({
        status: 'fail',
        message: 'Failed to fetch bookings',
      });
    }

    if (bookings.length === 0) {
      return res.status(404).json({
        status: 'fail',
        message: 'No bookings available',
      });
    }

    res.status(200).json({
      status: 'success',
      bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const createBook = async (req, res, next) => {
  try {
    const booking = new HouseBooking(req.body);
    const savedBooking = await booking.save();

    if (!savedBooking) {
      return res.status(500).json({
        status: 'fail',
        message: 'failed to create booking',
      });
    }
    res.status(202).json({
      status: 'success',
      data: savedBooking,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  const bookId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(bookId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid booking ID',
    });
  }

  try {
    const booking = await HouseBooking.findById(bookId);
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: 'Booking not found',
      });
    }

    res.status(200).json({
      status: 'success',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBooking = async (req, res, next) => {
  const bookingId = req.params.id;
  if (!mongoose.Types.ObjectsId.isValid(bookingId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'invalid booking Id',
    });
  }

  try {
    const deletedBooking = await HouseBooking.findByIdAndDelete(bookingId);
    if (!deletedBooking) {
      return res.status(500).json({
        status: 'fail',
        message: `something wwent wrong while deleting booki with id ${bookingId}`,
      });
    }

    res.status(200).json({
      status: 'success',
      message: `booking ${bookingId} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

export const updateBooking = async (req, res, next) => {
  const bookingId = req.params.id;
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    return res.status(400).json({
      status: 'fail',
      message: 'invalid booking Id',
    });
  }

  try {
    const updatedBooking = await HouseBooking.findByIdAndUpdate(
      bookingId,
      req.body,
      { new: true },
    );

    if (!updatedBooking) {
      return res.status(500).json({
        status: 'fail',
        message: `something wwent wrong while updating booki with id ${bookingId}`,
      });
    }

    res.status(200).json({
      status: 'success',
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};
