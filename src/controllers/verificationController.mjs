import { Verification } from '../models/Verifications.mjs';
import { Property } from '../models/Property.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import { createNotification } from '../services/notificationService.mjs';
import mongoose from 'mongoose';

// The mobile app serializes verification status as an int
// (VerificationStatus enum: Approved=0, Rejected=1, NotVerified=2).
export const STATUS_TO_INT = { Approved: 0, Rejected: 1, Pending: 2 };
export const STATUS_FROM_INT = {
  0: 'Approved',
  1: 'Rejected',
  2: 'Pending',
};

const toVerificationApi = (v) => {
  const obj = v.toObject ? v.toObject() : { ...v };
  const docId = String(v._id);
  return {
    ...obj,
    id: docId,
    _id: docId,
    agentId: v.agentId ? String(v.agentId) : '',
    propertyId: v.propertyId ? String(v.propertyId) : '',
    status: STATUS_TO_INT[v.status] ?? 2,
    verifiedAt: v.verifiedAt ? new Date(v.verifiedAt).toISOString() : '',
  };
};

const upsertVerification = async ({ propertyId, agentId, status, notes }) => {
  const doc = {
    agentId,
    status,
    notes: notes ?? '',
    verifiedAt: new Date(),
  };
  return Verification.findOneAndUpdate(
    { propertyId },
    { $set: doc },
    { returnDocument: 'after', upsert: true, runValidators: true },
  );
};

//  POST /api/property/:id  (app: createVerification id = propertyId)
export const createVerification = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;
    const { agentId, notes, verifiedAt, status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return sendResponse(res, 404, false, 'Property not found');
    }

    const stringStatus = STATUS_FROM_INT[Number(status)] ?? 'Pending';
    const verifyingAgent =
      agentId ||
      (req.user && (req.user.sub || req.user.id || req.user._id));

    const verification = await upsertVerification({
      propertyId,
      agentId: verifyingAgent,
      status: stringStatus,
      notes,
    });

    return sendResponse(
      res,
      200,
      true,
      'Verification saved successfully',
      toVerificationApi(verification),
    );
  } catch (error) {
    next(error);
  }
});

//  GET /api/property/history
export const getVerificationHistory = asyncHandler(async (req, res, next) => {
  try {
    const verifications = await Verification.find()
      .sort({ createdAt: -1 })
      .populate('agentId', 'firstName surname email phone');

    return sendResponse(
      res,
      200,
      true,
      'Verification history retrieved successfully',
      verifications.map(toVerificationApi),
    );
  } catch (error) {
    next(error);
  }
});

//  PATCH /api/property/:propertyId  (app approve/reject)
export const approveOrRejectProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;
    const { agentId, notes, status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return sendResponse(res, 404, false, 'Property not found');
    }

    const intStatus = Number(status);
    const isApproved = intStatus === 0;

    property.verificationStatus = isApproved ? 'VERIFIED' : 'REJECTED';
    await property.save();

    // Notify only the agent who owns/submitted this property.
    if (property.owner) {
      await createNotification({
        recipientRole: 'AGENT',
        recipientId: property.owner,
        kind: 'SYSTEM',
        title: isApproved ? 'Property approved' : 'Property rejected',
        message: isApproved
          ? 'Your property has been approved and is now live.'
          : 'Your property was rejected. Check the reason and resubmit.',
        senderId: req.user?.sub || req.user?.id || req.user?._id,
      });
    }

    const verifyingAgent =
      agentId ||
      (req.user && (req.user.sub || req.user.id || req.user._id));

    const verification = await upsertVerification({
      propertyId,
      agentId: verifyingAgent,
      status: isApproved ? 'Approved' : 'Rejected',
      notes,
    });

    return sendResponse(
      res,
      200,
      true,
      isApproved ? 'Property approved successfully' : 'Property rejected successfully',
      toVerificationApi(verification),
    );
  } catch (error) {
    next(error);
  }
});