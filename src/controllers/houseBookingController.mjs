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

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// GET /bookings — admin only
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

// GET /bookings/:id — any authenticated user, but only their own unless admin
export const getBookingById = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
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

    const isAdmin = req.user.role === 'admin';
    const isTenant = booking.tenant._id.toString() === req.user._id.toString();
    const isOwner = booking.owner._id.toString() === req.user._id.toString();

    if (!isAdmin && !isTenant && !isOwner) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to view this booking',
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

// POST /bookings — any authenticated user
export const createBooking = async (req, res, next) => {
  try {
    const { houseId, startDate, endDate, specialNotes } = req.body;
    const tenantId = req.user._id;

    const house = await HouseListing.findById(houseId);
    if (!house) {
      return res.status(404).json({
        status: 'fail',
        message: 'House not found',
      });
    }

    // prevent owner from booking their own house
    if (house.owner.toString() === tenantId.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot book your own house',
      });
    }

    // prevent duplicate active bookings on the same house
    const existingBooking = await HouseBooking.findOne({
      house: houseId,
      tenant: tenantId,
      status: { $in: ['pending', 'confirmed', 'active'] },
    });

    if (existingBooking) {
      return res.status(400).json({
        status: 'fail',
        message: 'You already have an active booking for this house',
      });
    }

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

// PATCH /bookings/:id — only the tenant who booked
export const updateBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
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

    // only the tenant who created the booking can update it
    if (booking.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to update this booking',
      });
    }

    // only pending bookings can be updated
    if (booking.status !== 'pending') {
      return res.status(400).json({
        status: 'fail',
        message: `Only pending bookings can be updated. Current status: ${booking.status}`,
      });
    }

    // strip all sensitive fields — only allow safe ones through
    const { startDate, endDate, specialNotes } = req.body;

    // recalculate derived fields if dates are being changed
    let updates = { specialNotes };

    if (startDate || endDate) {
      const start = new Date(startDate ?? booking.startDate);
      const end = new Date(endDate ?? booking.endDate);

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

      updates = {
        ...updates,
        startDate: start,
        endDate: end,
        numberOfMonths,
        totalAmount: booking.pricePerMonth * numberOfMonths,
      };
    }

    const updatedBooking = await populateBooking(
      HouseBooking.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true },
      ),
    );

    res.status(200).json({
      status: 'success',
      data: updatedBooking,
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /bookings/:id — tenant or admin
export const deleteBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
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

    const isAdmin = req.user.role === 'admin';
    const isTenant = booking.tenant.toString() === req.user._id.toString();

    if (!isAdmin && !isTenant) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to delete this booking',
      });
    }

    // only allow deletion of non-active bookings
    if (booking.status === 'active') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot delete an active booking. Cancel it first',
      });
    }

    await HouseBooking.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: `Booking ${id} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/cancel — tenant or owner
export const cancelBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
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

    const isTenant = booking.tenant.toString() === req.user._id.toString();
    const isOwner = booking.owner.toString() === req.user._id.toString();

    if (!isTenant && !isOwner) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to cancel this booking',
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

// PATCH /bookings/:id/confirm — only the house owner
export const confirmBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
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

    if (booking.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the house owner can confirm this booking',
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
