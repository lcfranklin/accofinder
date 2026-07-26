// controllers/houseBookingController.mjs
import mongoose from 'mongoose';
import Booking from '../models/Booking.mjs';
import Room from '../models/Room.mjs';
import House from '../models/House.mjs';
import Hostel from '../models/Hostel.mjs';
import Property from '../models/Property.mjs';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateBooking = (query) =>
  query
    .populate('rentableUnit') // resolves to House/Room/Bed doc
    .populate('tenant', 'name email')
    .populate('payment');

const getUnitModel = (unitType) => mongoose.model(unitType);

const getUnitOwnerId = async (unitType, unitId) => {
  if (unitType === 'House') {
    const house = await House.findById(unitId).select('owner');
    return house?.owner ?? null;
  }

  if (unitType === 'Room') {
    const room = await Room.findById(unitId).select('property hostel');
    if (!room) return null;

    if (room.property) {
      const property = await Property.findById(room.property).select('owner');
      return property?.owner ?? null;
    }

    if (room.hostel) {
      const hostel = await Hostel.findById(room.hostel).select('property');
      if (!hostel) return null;
      const property = await Property.findById(hostel.property).select('owner');
      return property?.owner ?? null;
    }

    return null;
  }

  if (unitType === 'Bed') {
    const Bed = getUnitModel('Bed');
    const bed = await Bed.findById(unitId).select('room');
    if (!bed) return null;
    return getUnitOwnerId('Room', bed.room);
  }

  return null;
};

// GET /bookings — admin only ( checkRole in routes)

export const getBookings = async (req, res, next) => {
  try {
    const bookings = await populateBooking(Booking.find());
    const booking = await Booking.findById(bookId);
    if (!booking) {
      return res.status(404).json({
        status: 'fail',
        message: `Booking with id ${id} not found`,
      });
    }

    const isAdmin = req.user.role === 'ADMIN';
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
      results: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// POST /bookings — any authenticated user

export const createBooking = async (req, res, next) => {
  try {
    const { unitId, unitType, startDate, endDate, specialNotes } = req.body;
    const tenantId = req.user._id;

    const UnitModel = getUnitModel(unitType);
    const unit = await UnitModel.findById(unitId);
    if (!unit) {
      return res
        .status(404)
        .json({ status: 'fail', message: `${unitType} not found` });
    }

    if (unitType === 'Room') {
      const Bed = getUnitModel('Bed');
      const bedCount = await Bed.countDocuments({ room: unitId });
      if (bedCount > 0) {
        return res.status(400).json({
          status: 'fail',
          message:
            'This room has individual beds — book a specific bed instead of the whole room',
        });
      }
    }

    const ownerId = await getUnitOwnerId(unitType, unitId);
    if (ownerId && ownerId.toString() === tenantId.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: `You cannot book your own ${unitType.toLowerCase()}`,
      });
    }

    if (unit.isAvailable === false) {
      return res.status(409).json({
        status: 'fail',
        message: `This ${unitType.toLowerCase()} is currently unavailable`,
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const available = await Booking.isUnitAvailable(
      unitId,
      unitType,
      start,
      end,
    );
    if (!available) {
      return res.status(409).json({
        status: 'fail',
        message: `This ${unitType.toLowerCase()} is already booked for the selected dates`,
      });
    }

    const numberOfMonths = Math.max(
      1,
      (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()),
    );

    const booking = await Booking.create({
      tenant: tenantId,
      rentableUnit: unitId,
      unitType,
      startDate: start,
      endDate: end,
      bookingFee: unit.bookingFee,
      totalRentAmount: unit.monthlyRent * numberOfMonths,
      specialNotes,
    });

    if (unitType === 'Bed') {
      await unit.bookBed();
    } else {
      unit.isAvailable = false;
      await unit.save();
    }

    const populated = await populateBooking(Booking.findById(booking._id));

    res.status(201).json({ status: 'success', data: populated });
  } catch (error) {
    next(error);
  }
};

// GET /bookings/:id — tenant, unit owner, or admin

export const getBookingById = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid booking ID format' });
  }

  try {
    const booking = await populateBooking(Booking.findById(id));
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: `Booking with id ${id} not found` });
    }

    const isAdmin = req.user.role === 'admin';
    const isTenant = booking.tenant._id.toString() === req.user._id.toString();
    const ownerId = await getUnitOwnerId(
      booking.unitType,
      booking.rentableUnit._id,
    );
    const isUnitOwner =
      ownerId && ownerId.toString() === req.user._id.toString();

    if (!isAdmin && !isTenant && !isUnitOwner) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to view this booking',
      });
    }

    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id — tenant only, PENDING bookings only

export const updateBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid booking ID format' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: `Booking with id ${id} not found` });
    }

    if (booking.tenant.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to update this booking',
      });
    }

    if (booking.status !== 'PENDING') {
      return res.status(400).json({
        status: 'fail',
        message: `Only PENDING bookings can be updated. Current status: ${booking.status}`,
      });
    }

    const { startDate, endDate, specialNotes } = req.body;
    const updates = {};
    if (specialNotes !== undefined) updates.specialNotes = specialNotes;

    if (startDate || endDate) {
      const start = new Date(startDate ?? booking.startDate);
      const end = new Date(endDate ?? booking.endDate);

      if (end <= start) {
        return res.status(400).json({
          status: 'fail',
          message: 'End date must be after start date',
        });
      }

      const overlap = await Booking.findOne({
        _id: { $ne: booking._id },
        rentableUnit: booking.rentableUnit,
        unitType: booking.unitType,
        status: { $ne: 'CANCELLED' },
        startDate: { $lt: end },
        endDate: { $gt: start },
      });

      if (overlap) {
        return res.status(409).json({
          status: 'fail',
          message: 'This unit is already booked for the new dates',
        });
      }

      const UnitModel = getUnitModel(booking.unitType);
      const unit = await UnitModel.findById(booking.rentableUnit);
      const numberOfMonths = Math.max(
        1,
        (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth()),
      );

      updates.startDate = start;
      updates.endDate = end;
      updates.totalRentAmount = unit.monthlyRent * numberOfMonths;
    }

    const updated = await populateBooking(
      Booking.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true },
      ),
    );

    res.status(200).json({ status: 'success', data: updated });
  } catch (error) {
    next(error);
  }
};

// DELETE /bookings/:id — tenant or admin, non-PAID/CONFIRMED only

export const deleteBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid booking ID format' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: `Booking with id ${id} not found` });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isTenant = booking.tenant.toString() === req.user._id.toString();

    if (!isAdmin && !isTenant) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to delete this booking',
      });
    }

    if (['PAID', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot delete a PAID or CONFIRMED booking. Cancel it first',
      });
    }

    await Booking.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: `Booking ${id} deleted successfully`,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/cancel — tenant, unit owner, or admin

export const cancelBooking = async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!isValidId(id)) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid booking ID format' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: `Booking with id ${id} not found` });
    }

    const isAdmin = req.user.role === 'admin';
    const isTenant = booking.tenant.toString() === req.user._id.toString();
    const ownerId = await getUnitOwnerId(
      booking.unitType,
      booking.rentableUnit,
    );
    const isUnitOwner =
      ownerId && ownerId.toString() === req.user._id.toString();

    if (!isAdmin && !isTenant && !isUnitOwner) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to cancel this booking',
      });
    }

    if (booking.status === 'CANCELLED') {
      return res
        .status(400)
        .json({ status: 'fail', message: 'Booking is already cancelled' });
    }

    await booking.cancel(reason);

    if (booking.unitType === 'Bed') {
      const Bed = getUnitModel('Bed');
      const bed = await Bed.findById(booking.rentableUnit);
      if (bed) await bed.releaseBed();
    }

    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/confirm — unit owner or admin

export const confirmBooking = async (req, res, next) => {
  const { id } = req.params;

  if (!isValidId(id)) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid booking ID format' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: `Booking with id ${id} not found` });
    }

    const isAdmin = req.user.role === 'admin';
    const ownerId = await getUnitOwnerId(
      booking.unitType,
      booking.rentableUnit,
    );
    const isUnitOwner =
      ownerId && ownerId.toString() === req.user._id.toString();

    if (!isAdmin && !isUnitOwner) {
      return res.status(403).json({
        status: 'fail',
        message: 'Only the unit owner can confirm this booking',
      });
    }

    await booking.confirm();

    res.status(200).json({
      status: 'success',
      message: 'Booking confirmed successfully',
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /bookings/:id/pay

export const markBookingPaid = async (req, res, next) => {
  const { id } = req.params;
  const { paymentId } = req.body;

  if (!isValidId(id) || !isValidId(paymentId)) {
    return res
      .status(400)
      .json({ status: 'fail', message: 'Invalid ID format' });
  }

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res
        .status(404)
        .json({ status: 'fail', message: `Booking with id ${id} not found` });
    }

    await booking.markPaid(paymentId);

    res.status(200).json({ status: 'success', data: booking });
  } catch (error) {
    next(error);
  }
};
