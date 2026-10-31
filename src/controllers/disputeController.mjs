import { Dispute } from '../models/Dispute.mjs';
import { Booking } from '../models/Booking.mjs';
import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { User } from '../models/User.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import { DisputeStatus } from '../models/enums/DisputeStatus.mjs';
import { createNotification } from '../services/notificationService.mjs';
import { asyncHandler, sendResponse, withId, withIdList } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

const propertyForBooking = async (booking) => {
  if (booking.bookableItemType === 'Property') {
    return Property.findById(booking.bookableItemId);
  }

  const room = await Room.findById(booking.bookableItemId);
  return room?.propertyId ? Property.findById(room.propertyId) : null;
};

//  raise a new dispute
export const raiseDispute = asyncHandler(async (req, res, next) => {
  try {
    const raisedBy = req.user.id || req.user.sub || req.user._id;
    const { bookingId, issue } = req.validatedData || req.body;

    if (!bookingId || !issue) {
      return sendResponse(
        res,
        400,
        false,
        'Missing required fields: bookingId, issue',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return sendResponse(res, 400, false, 'Invalid booking ID format');
    }

    // Verify booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return sendResponse(res, 404, false, 'Associated booking not found');
    }

    // Authorization: only the booking client or an admin can raise a dispute
    const userId = String(req.user._id || req.user.id || req.user.sub);
    const bookingClientId = String(booking.clientId || '');
    const isAdmin = String(req.user.role || '').toUpperCase() === 'ADMIN';
    if (!isAdmin && bookingClientId && bookingClientId !== userId) {
      return sendResponse(res, 403, false, 'You can only raise disputes on your own bookings');
    }

    // Prevent duplicate open disputes for the same booking
    const existing = await Dispute.findOne({ bookingId, status: { $in: [DisputeStatus.OPEN] } });
    if (existing) {
      return sendResponse(res, 409, false, 'An open dispute already exists for this booking');
    }

    const dispute = await Dispute.create({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      raisedBy: new mongoose.Types.ObjectId(userId),
      issue,
      status: DisputeStatus.OPEN,
    });

    if (!dispute) {
      return sendResponse(res, 400, false, 'Bad request, dispute not created');
    }

    // Notify all admins about the new dispute
    const admins = await User.find({ role: UserRole.ADMIN, isActive: true }).select('_id');
    for (const admin of admins) {
      await createNotification({
        recipientRole: 'ADMIN',
        recipientId: admin._id,
        kind: 'SYSTEM',
        title: 'New dispute raised',
        message: `A dispute has been raised on booking ${bookingId}.`,
        senderId: raisedBy,
      });
    }

    // Notify the property agent for either a property or room booking.
    const property = await propertyForBooking(booking);
    if (property?.owner) {
      await createNotification({
        recipientRole: 'AGENT',
        recipientId: property.owner,
        kind: 'SYSTEM',
        title: 'Dispute raised on your property',
        message: 'A dispute has been raised on a booking for one of your properties.',
        senderId: raisedBy,
      });
    }

    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('bookingId')
      .populate('raisedBy', 'firstName lastName email phone');

    return sendResponse(
      res,
      201,
      true,
      'Dispute raised successfully',
      withId(populatedDispute),
    );
  } catch (error) {
    next(error);
  }
});

//  get all disputes (Admin / Support utility)
//
//  Scoping: an ADMIN sees every dispute, while an AGENT only sees disputes
//  raised on bookings for rooms or whole properties the agent owns.
export const getAllDisputes = asyncHandler(async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.validatedData?.page || req.query?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.validatedData?.limit || req.query?.limit || 10)));
    const statusFilter = req.validatedData?.status || req.query?.status;
    const bookingFilter = req.validatedData?.bookingId || req.query?.bookingId;

    const role = String(req.user?.role || '').toUpperCase();
    const filter = {};

    if (role !== 'ADMIN') {
      // CLIENT: only their own disputes
      if (role === 'CLIENT') {
        filter.raisedBy = req.user._id;
      } else {
        // AGENT: disputes on their properties
        const ownedProps = await Property.find({ owner: req.user._id }).select('_id');
        const ownedPropIds = ownedProps.map((p) => p._id);
        const ownedRooms = await Room.find({ propertyId: { $in: ownedPropIds } }).select('_id');
        const ownedRoomIds = ownedRooms.map((r) => r._id);
        if (ownedRoomIds.length === 0 && ownedPropIds.length === 0) {
          return sendResponse(res, 200, true, 'Disputes retrieved successfully', [], { page, limit, total: 0 });
        }
        const ownedBookings = await Booking.find({
          $or: [
            { bookableItemType: 'Room', bookableItemId: { $in: ownedRoomIds } },
            { bookableItemType: 'Property', bookableItemId: { $in: ownedPropIds } },
          ],
        }).select('_id');
        const ownedBookingIds = ownedBookings.map((b) => b._id);
        if (ownedBookingIds.length === 0) {
          return sendResponse(res, 200, true, 'Disputes retrieved successfully', [], { page, limit, total: 0 });
        }
        filter.bookingId = { $in: ownedBookingIds };
      }
    }

    if (statusFilter) filter.status = statusFilter;
    if (bookingFilter && mongoose.Types.ObjectId.isValid(bookingFilter)) {
      filter.bookingId = new mongoose.Types.ObjectId(bookingFilter);
    }

    const total = await Dispute.countDocuments(filter);
    const disputes = await Dispute.find(filter)
      .populate({ path: 'bookingId', populate: { path: 'bookableItemId' } })
      .populate('raisedBy', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return sendResponse(
      res,
      200,
      true,
      'Disputes retrieved successfully',
      withIdList(disputes),
      { page, limit, total },
    );
  } catch (error) {
    next(error);
  }
});

//  get dispute by ID
export const getDisputeById = asyncHandler(async (req, res, next) => {
  try {
    const disputeId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return sendResponse(res, 400, false, 'Invalid dispute ID format');
    }

    const dispute = await Dispute.findById(disputeId)
      .populate({
        path: 'bookingId',
        populate: { path: 'bookableItemId' },
      })
      .populate('raisedBy', 'firstName lastName email phone');

    if (!dispute) {
      return sendResponse(
        res,
        404,
        false,
        `Dispute with id ${disputeId} not found`,
      );
    }

    // Ownership: raiser, property owner/agent, or admin
    const role = String(req.user?.role || '').toUpperCase();
    const userId = String(req.user._id || req.user.id || req.user.sub);
    const raiserId = String(dispute.raisedBy?._id || dispute.raisedBy);
    const property = await propertyForBooking(dispute.bookingId);
    const ownerId = String(property?.owner || '');
    const isOwner = ownerId && ownerId === userId;
    const isRaiser = raiserId === userId;
    if (role !== 'ADMIN' && !isRaiser && !isOwner) {
      return sendResponse(res, 403, false, 'You are not allowed to view this dispute');
    }

    return sendResponse(res, 200, true, 'Dispute found', withId(dispute));
  } catch (error) {
    next(error);
  }
});

//  resolve or reject a dispute
export const resolveDispute = asyncHandler(async (req, res, next) => {
  try {
    const disputeId = req.params.id;
    const { status, resolutionNotes } = req.validatedData || req.body;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return sendResponse(res, 400, false, 'Invalid dispute ID format');
    }

    const allowedStatuses = [DisputeStatus.RESOLVED, DisputeStatus.REJECTED];
    if (!status || !allowedStatuses.includes(status)) {
      return sendResponse(
        res,
        400,
        false,
        `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
      );
    }

    const dispute = await Dispute.findById(disputeId).populate('bookingId');
    if (!dispute) {
      return sendResponse(
        res,
        404,
        false,
        `Dispute with id ${disputeId} not found`,
      );
    }

    // Ownership: only the property owner/agent or admin can resolve
    const role = String(req.user?.role || '').toUpperCase();
    const userId = String(req.user._id || req.user.id || req.user.sub);
    const property = await propertyForBooking(dispute.bookingId);
    const ownerId = String(property?.owner || '');
    if (role !== 'ADMIN' && ownerId !== userId) {
      return sendResponse(res, 403, false, 'You can only resolve disputes on your own properties');
    }

    dispute.status = status;
    if (resolutionNotes !== undefined) dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedBy = req.user._id || req.user.id || req.user.sub;
    dispute.resolvedAt = new Date();
    await dispute.save();

    // Notify the client who raised the dispute
    if (dispute.raisedBy) {
      const statusLabel = status === DisputeStatus.RESOLVED ? 'resolved' : 'rejected';
      await createNotification({
        recipientRole: 'CLIENT',
        recipientId: dispute.raisedBy,
        kind: 'SYSTEM',
        title: `Dispute ${statusLabel}`,
        message: `Your dispute has been ${statusLabel}.`,
        senderId: req.user?.sub || req.user?.id || req.user?._id,
      });
    }

    const populated = await Dispute.findById(dispute._id)
      .populate({ path: 'bookingId', populate: { path: 'bookableItemId' } })
      .populate('raisedBy', 'firstName lastName email phone');

    return sendResponse(
      res,
      200,
      true,
      `Dispute status updated to ${status}`,
      withId(populated),
    );
  } catch (error) {
    next(error);
  }
});

//  delete a dispute
export const deleteDispute = asyncHandler(async (req, res, next) => {
  try {
    const disputeId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(disputeId)) {
      return sendResponse(res, 400, false, 'Invalid dispute ID format');
    }

    const deletedDispute = await Dispute.findByIdAndDelete(disputeId);

    if (!deletedDispute) {
      return sendResponse(
        res,
        404,
        false,
        'Failed to delete dispute or dispute not found',
      );
    }

    return sendResponse(
      res,
      200,
      true,
      `Dispute ${disputeId} deleted successfully`,
    );
  } catch (error) {
    next(error);
  }
});
