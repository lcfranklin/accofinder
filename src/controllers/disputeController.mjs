import { Dispute } from '../models/Dispute.mjs';
import { Booking } from '../models/Booking.mjs';
import { DisputeStatus } from '../models/enums/DisputeStatus.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

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

    const dispute = await Dispute.create({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      raisedBy: new mongoose.Types.ObjectId(raisedBy),
      issue,
      status: DisputeStatus.OPEN,
    });

    if (!dispute) {
      return sendResponse(res, 400, false, 'Bad request, dispute not created');
    }

    const populatedDispute = await Dispute.findById(dispute._id)
      .populate('bookingId')
      .populate('raisedBy', 'firstName lastName email phone');

    return sendResponse(
      res,
      201,
      true,
      'Dispute raised successfully',
      populatedDispute,
    );
  } catch (error) {
    next(error);
  }
});

//  get all disputes (Admin / Support utility)
export const getAllDisputes = asyncHandler(async (req, res, next) => {
  try {
    const disputes = await Dispute.find()
      .populate({
        path: 'bookingId',
        populate: { path: 'roomId' },
      })
      .populate('raisedBy', 'firstName lastName email phone');

    if (!disputes) {
      return sendResponse(res, 400, false, 'Failed to retrieve disputes');
    }

    return sendResponse(
      res,
      200,
      true,
      'Disputes retrieved successfully',
      disputes,
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
        populate: { path: 'roomId' },
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

    return sendResponse(res, 200, true, 'Dispute found', dispute);
  } catch (error) {
    next(error);
  }
});

//  resolve or reject a dispute
export const resolveDispute = asyncHandler(async (req, res, next) => {
  try {
    const disputeId = req.params.id;
    const { status } = req.validatedData || req.body;

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

    const dispute = await Dispute.findById(disputeId);
    if (!dispute) {
      return sendResponse(
        res,
        404,
        false,
        `Dispute with id ${disputeId} not found`,
      );
    }

    dispute.status = status;
    await dispute.save();

    return sendResponse(
      res,
      200,
      true,
      `Dispute status updated to ${status}`,
      dispute,
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
