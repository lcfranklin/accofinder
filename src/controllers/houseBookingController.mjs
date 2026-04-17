import mongoose from 'mongoose';
import HouseBooking from '../models/HouseBooking.mjs';
import HouseListing from '../models/HouseListing.mjs';

const populateBooking = (query) =>
  query
    .populate('house', 'title price costCategory')
    .populate('tenant', 'name email')
    .populate('owner', 'name email')
    .populate('cancelledBy', 'name email')
    .populate('createdBy', 'name email');

// GET /bookings
export const getBookings = async (req, res, next) => {
  try {
    const bookings = await populateBooking(HouseBooking.find());
    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// GET /bookings/:id
export const getBookingById = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid booking ID format',
    });
  }

  try {
    const booking = await populateBooking(HouseBooking.findById(id));
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking with id ${id} not found`,
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

// POST /bookings
export const createBooking = async (req, res, next) => {
  try {
    const { houseId, startDate, endDate, specialNotes } = req.body;
    const tenantId = req.user._id;

    // fetch the house to get owner and price
    const house = await HouseListing.findById(houseId);
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'House not found',
      });
    }

    // calculate number of months and total amount
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        status: 'fail',
        message: 'End date must be after start date',
      });
    }

    const numberOfMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    if (numberOfMonths < 1) {
      return res.status(400).json({
        status: 'fail',
        message: 'Booking must be at least 1 month',
      });
    }

    const pricePerMonth = house.price;
    const totalAmount = pricePerMonth * numberOfMonths;

    const booking = new HouseBooking({
      house: houseId,
      tenant: tenantId,
      owner: house.owner,
      startDate: start,
      endDate: end,
      numberOfMonths,
      pricePerMonth,
      totalAmount,
      createdBy: tenantId,
      specialNotes,
    });

    const savedBooking = await booking.save();

    res.status(201).json({
      status: 'success',
      data: savedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id
export const updateBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid booking ID format',
    });
  }

  try {
    // these fields cannot be updated directly
    const {
      house,
      tenant,
      owner,
      isPaid,
      paidAt,
      payment,
      totalAmount,
      pricePerMonth,
      numberOfMonths,
      createdBy,
      ...safeBody
    } = req.body;

    const updatedBooking = await populateBooking(
      HouseBooking.findByIdAndUpdate(
        id,
        { $set: safeBody },
        { new: true, runValidators: true },
      ),
    );

    if (!updatedBooking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking with id ${id} not found`,
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

// DELETE /bookings/:id
export const deleteBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid booking ID format',
    });
  }

  try {
    const deletedBooking = await HouseBooking.findByIdAndDelete(id);
    if (!deletedBooking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking with id ${id} not found`,
      });
    }

    res.status(200).json({
      status: 'success',
      message: `Booking ${id} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/cancel
export const cancelBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid booking ID format',
    });
  }

  try {
    const booking = await HouseBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking with id ${id} not found`,
      });
    }

    const nonCancellableStatuses = ['completed', 'cancelled', 'rejected'];
    if (nonCancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        status: 'fail',
        message: `Cannot cancel a booking that is already ${booking.status}`,
      });
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user._id;
    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/confirm
export const confirmBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid booking ID format',
    });
  }

  try {
    const booking = await HouseBooking.findById(id);
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking with id ${id} not found`,
      });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'fail',
        message: `Only pending bookings can be confirmed. Current status: ${booking.status}`,
      });
    }

    booking.status = 'confirmed';
    await booking.save();

    res.status(200).json({
      status: 'success',
      message: 'Booking confirmed successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
