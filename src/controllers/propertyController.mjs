import { Property } from '../models/Property.mjs';
import { Room } from '../models/Room.mjs';
import { Media } from '../models/media.mjs';
import { Booking } from '../models/Booking.mjs';
import { Review } from '../models/Review.mjs';
import { Verification } from '../models/Verifications.mjs';
import { User } from '../models/User.mjs';
import { UserRole } from '../models/enums/UserRole.mjs';
import { BookingStatus } from '../models/enums/BookingStatus.mjs';
import { deleteS3ObjectsByUrls } from '../config/s3.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import { createNotification } from '../services/notificationService.mjs';
import mongoose from 'mongoose';

const propertyToDto = (property) => {
  const document = property.toObject ? property.toObject() : property;
  return {
    ...document,
    bookingFee: document.bookingFee ?? 0,
    rentalFee: document.rentalFee ?? 0,
  };
};

const roomToDto = (room) => {
  const document = room.toObject ? room.toObject() : room;
  return {
    ...document,
    bookingFee: document.bookingFee ?? 0,
    rentalFee: document.rentalFee ?? 0,
  };
};

const sendDuplicateProperty = (res) =>
  res.status(409).json({
    error: 'Duplicate property',
    message: 'This agent already has a property at this district and village address.',
  });

export const createProperty = asyncHandler(async (req, res, next) => {
  try {
    const {
      title,
      description,
      bookingFee,
      rentalFee,
      propertyType,
      physicalAddress,
      verificationStatus,
      amenities,
      landlord,
      landlordPhone,
      isActive,
      rooms = [],
    } = req.validatedData;

    const owner = req.user?._id;
    if (!owner) {
      return sendResponse(res, 401, false, 'Unauthorized: could not resolve agent from token');
    }

    if (physicalAddress?.district && physicalAddress?.village) {
      const duplicate = await Property.findOne({
        owner,
        'physicalAddress.district': physicalAddress.district,
        'physicalAddress.village': physicalAddress.village,
      }).select('_id');
      if (duplicate) return sendDuplicateProperty(res);
    }

    const property = await Property.create({
      title,
      description,
      bookingFee: bookingFee ?? 0,
      rentalFee: rentalFee ?? 0,
      propertyType,
      physicalAddress,
      verificationStatus: verificationStatus ?? 'PENDING',
      amenities: amenities ?? [],
      landlord,
      landlordPhone,
      isActive: isActive !== undefined ? isActive : true,
      owner,
    });

    if (!property) {
      return sendResponse(res, 400, false, 'Bad request, property not created');
    }

    // Create inline rooms atomically
    let createdRooms = [];
    if (rooms.length > 0) {
      const roomDocs = rooms.map((r) => ({
        propertyId: property._id,
        type: String(r.type || '').toUpperCase(),
        bookingFee: r.bookingFee ?? 0,
        rentalFee: r.rentalFee ?? r.price ?? 0,
        available: r.available !== undefined ? r.available : true,
      }));
      createdRooms = await Room.insertMany(roomDocs, { ordered: true });
    }

    // Notify all admins that a new property has been submitted for review
    const admins = await User.find({ role: UserRole.ADMIN, isActive: true }).select('_id');
    for (const admin of admins) {
      await createNotification({
        recipientRole: 'ADMIN',
        recipientId: admin._id,
        kind: 'SYSTEM',
        title: 'New property submitted',
        message: `A new property "${title}" has been submitted and requires review.`,
        senderId: owner,
      });
    }

    return sendResponse(res, 201, true, 'Property created successfully', {
      ...propertyToDto(property),
      rooms: createdRooms.map(roomToDto),
    });
  } catch (error) {
    if (error.code === 11000) return sendDuplicateProperty(res);
    next(error);
  }
});

export const updateProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    const existing = await Property.findById(propertyId).select('owner verificationStatus');
    if (!existing) {
      return sendResponse(res, 404, false, 'Property not found');
    }

    const userId = String(req.user?._id || req.user?.id || req.user?.sub);
    if (!isAdmin && String(existing.owner) !== userId) {
      return sendResponse(res, 403, false, 'You can only edit your own properties');
    }

    const {
      media,
      title,
      description,
      bookingFee,
      rentalFee,
      propertyType,
      physicalAddress,
      verificationStatus,
      verificationReason,
      approvedBy,
      approvedByName,
      amenities,
      landlord,
      landlordPhone,
      isActive,
    } = req.validatedData;

    const isAdmin = String(req.user?.role || '').toUpperCase() === 'ADMIN';
    if (!isAdmin && (verificationStatus !== undefined || approvedBy !== undefined || approvedByName !== undefined)) {
      return sendResponse(res, 403, false, 'Only admins can change verification status');
    }

    const setUpdates = {};
    if (title !== undefined) setUpdates.title = title;
    if (description !== undefined) setUpdates.description = description;
    if (bookingFee !== undefined) setUpdates.bookingFee = bookingFee;
    if (rentalFee !== undefined) setUpdates.rentalFee = rentalFee;
    if (propertyType !== undefined) setUpdates.propertyType = propertyType;
    if (physicalAddress !== undefined) setUpdates.physicalAddress = physicalAddress;
    if (verificationStatus !== undefined) setUpdates.verificationStatus = verificationStatus;
    // Clear a stale rejection reason whenever the property moves away from
    // REJECTED (agent resubmits, admin re-verifies). Set it explicitly only
    // when the admin rejects with a reason.
    if (verificationStatus !== undefined && verificationStatus !== 'REJECTED') {
      setUpdates.verificationReason = '';
    } else if (verificationReason !== undefined) {
      setUpdates.verificationReason = verificationReason;
    }
    // Record who approved the listing when it becomes VERIFIED. Prefer the
    // value supplied by the client (the approving user's id/name), falling back
    // to the authenticated user so the approver is never blank.
    if (approvedBy !== undefined && mongoose.Types.ObjectId.isValid(approvedBy)) {
      setUpdates.approvedBy = new mongoose.Types.ObjectId(approvedBy);
    }
    if (approvedByName !== undefined) {
      setUpdates.approvedByName = approvedByName.trim();
    }
    if (verificationStatus === 'VERIFIED') {
      if (!setUpdates.approvedBy && req.user?._id) {
        setUpdates.approvedBy = new mongoose.Types.ObjectId(req.user._id);
      }
      if (!setUpdates.approvedByName) {
        const approverLast = req.user?.surname || req.user?.lastName || '';
        setUpdates.approvedByName =
          [req.user?.firstName, approverLast].filter(Boolean).join(' ').trim();
      }
    }
    // Mirror the rejection-reason behaviour: when a property leaves VERIFIED
    // (rejected, reverted to pending/draft/resubmitted) drop the stale approval.
    if (verificationStatus !== undefined && verificationStatus !== 'VERIFIED') {
      setUpdates.approvedBy = null;
      setUpdates.approvedByName = '';
    }
    if (amenities !== undefined) setUpdates.amenities = amenities;
    if (landlord !== undefined) setUpdates.landlord = landlord;
    if (landlordPhone !== undefined) setUpdates.landlordPhone = landlordPhone;
    if (isActive !== undefined) setUpdates.isActive = isActive;

    const updateOp = {};
    if (Object.keys(setUpdates).length > 0) updateOp.$set = setUpdates;

    if (media && media.length > 0) {
      const mediaObjectIds = media.map((id) => new mongoose.Types.ObjectId(id));
      updateOp.$addToSet = { media: { $each: mediaObjectIds } };
    }

    if (Object.keys(updateOp).length === 0) {
      return sendResponse(res, 400, false, 'Invalid or empty update fields');
    }

    // Snapshot the current state so a decision notification is only sent when
    // the verification status actually changes (not on every unrelated edit).
    const before = await Property.findById(propertyId).select('owner verificationStatus');

    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      updateOp,
      { new: true, runValidators: true },
    );

    if (!updatedProperty) {
      return sendResponse(res, 404, false, 'Property not found or not updated');
    }

    // This is the path the mobile admin app uses (PUT /house-listing/:id). It
    // used to persist the decision without telling the owner, so a rejected
    // agent never saw a notification. Mirror the approval endpoint here.
    if (
      before &&
      verificationStatus !== undefined &&
      verificationStatus !== before.verificationStatus &&
      (verificationStatus === 'REJECTED' || verificationStatus === 'VERIFIED')
    ) {
      const recipientId = updatedProperty.owner || before.owner;
      if (recipientId) {
        const reason = (setUpdates.verificationReason || '').trim();
        await createNotification({
          recipientRole: 'AGENT',
          recipientId,
          kind: 'SYSTEM',
          title: verificationStatus === 'REJECTED' ? 'Property rejected' : 'Property approved',
          message: verificationStatus === 'REJECTED'
            ? (reason
                ? `Your property was rejected. Reason: ${reason}`
                : 'Your property was rejected. Please review it and resubmit.')
            : 'Your property has been approved and is now live.',
          senderId: req.user?._id,
        });
      }
    }

    return sendResponse(
      res,
      200,
      true,
      'Property updated successfully',
      propertyToDto(updatedProperty),
    );
  } catch (error) {
    next(error);
  }
});

export const getAllProperties = asyncHandler(async (req, res, next) => {
  try {
    const {
      propertyType,
      district,
      village,
      amenities,
      isActive,
      search,
      owner,
      verificationStatus,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.validatedData || req.query;

    const filter = {};
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (owner) {
      const callerId = String(req.user?._id || req.user?.id || req.user?.sub || '');
      const isAdmin = String(req.user?.role || '').toUpperCase() === 'ADMIN';
      if (!isAdmin && owner !== callerId) {
        return sendResponse(res, 403, false, 'You can only view your own properties');
      }
      filter.owner = owner;
    }

    const callerRole = String(req.user?.role || '').toUpperCase();

    // Privacy / catalogue rules:
    // - Owners/managers (agent, landlord) who do not pass an explicit "owner"
    //   only get their own properties back, not the whole database.
    // - The public catalogue (anonymous users and CLIENTS) only ever reveals
    //   VERIFIED listings, so unverified or pending listings cannot leak to
    //   people browsing the app. Only admins see every status.
    if (!owner && callerRole !== 'ADMIN') {
      if (req.user && (callerRole === 'AGENT' || callerRole === 'LANDLORD'))
        filter.owner = req.user._id;
      filter.verificationStatus = 'VERIFIED';
      if (isActive === undefined) filter.isActive = true;
    }

    if (propertyType) filter.propertyType = propertyType;
    if (district) filter['physicalAddress.district'] = new RegExp(district, 'i');
    if (village) filter['physicalAddress.village'] = new RegExp(village, 'i');
    if (isActive !== undefined) filter.isActive = isActive;
    if (amenities) {
      const arr = Array.isArray(amenities) ? amenities : [amenities];
      filter.amenities = { $in: arr };
    }
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
        { landlord: new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortDir = sortOrder === 'asc' ? 1 : -1;

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate('owner', 'firstName surname email phone')
        .populate('approvedBy', 'firstName surname email phone')
        .populate('media')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, 'Properties retrieved successfully', {
      properties: properties.map(propertyToDto),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const getPropertyById = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    const [property, rooms] = await Promise.all([
      Property.findById(propertyId)
        .populate('owner', 'firstName surname email phone')
        .populate('approvedBy', 'firstName surname email phone')
        .populate('media'),
      Room.find({ propertyId }),
    ]);

    if (!property) {
      return sendResponse(res, 404, false, `Property with id ${propertyId} not found`);
    }

    const userId = String(req.user?._id || req.user?.id || req.user?.sub || '');
    const isAdmin = String(req.user?.role || '').toUpperCase() === 'ADMIN';
    const isOwner = userId && String(property.owner?._id || property.owner) === userId;
    const status = String(property.verificationStatus || '').toUpperCase();
    if (!isAdmin && !isOwner && status !== 'VERIFIED') {
      return sendResponse(res, 404, false, `Property with id ${propertyId} not found`);
    }
      ...propertyToDto(property),
      rooms: rooms.map(roomToDto),
    });
  } catch (error) {
    next(error);
  }
});

export const deleteProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    // Rooms have to be resolved up front: bookings reference rooms rather than
    // properties, so the guard below needs their ids before the cascade runs.
    const rooms = await Room.find({ propertyId }).select('_id');
    const roomIds = rooms.map((room) => room._id);

    // Deleting a property that still has occupied rooms would orphan live
    // bookings against rooms that no longer exist. Only CANCELLED and EXPIRED
    // release the room; holds, in-flight payments, retryable failures and
    // confirmed bookings all still occupy it. An unrecognised future status
    // blocks by default, which is the safe direction for a guard.
    const activeBookingFilter = {
      bookableItemId: { $in: roomIds },
      bookableItemType: 'Room',
      status: { $nin: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
    };
    // Also block if the whole property has active bookings
    const propertyActive = await Booking.countDocuments({
      bookableItemId: new mongoose.Types.ObjectId(propertyId),
      bookableItemType: 'Property',
      status: { $nin: [BookingStatus.CANCELLED, BookingStatus.EXPIRED] },
    });
    const activeBookings = roomIds.length
      ? await Booking.countDocuments(activeBookingFilter)
      : 0;

    // force=true is the explicit override the admin confirmation dialog sends
    // after it has shown the warning below.
    const force = req.query.force === 'true';

    if (activeBookings + propertyActive > 0 && !force) {
      return sendResponse(
        res,
        409,
        false,
        `This property still has ${activeBookings} active booking${activeBookings === 1 ? '' : 's'}. Deleting it now would leave those bookings without a room.`,
        null,
        { activeBookings }
      );
    }

    const deletedProperty = await Property.findByIdAndDelete(propertyId);

    if (!deletedProperty) {
      return sendResponse(res, 404, false, 'Failed to delete property or property not found');
    }

    // Forced delete: close the outstanding holds instead of leaving bookings
    // pointing at deleted rooms. The admin dialog states this before confirming.
    if (activeBookings > 0) {
      await Booking.updateMany(activeBookingFilter, {
        $set: { status: BookingStatus.CANCELLED },
      });
    }

    // Remove related rooms.
    await Room.deleteMany({ propertyId });

    // Reviews and verification records are keyed directly on propertyId, so
    // they would otherwise outlive the property as dangling rows - a deleted
    // listing still showing its rating history and approval audit trail.
    // Nothing references them in turn, so they can go unconditionally.
    await Review.deleteMany({ propertyId });
    await Verification.deleteMany({ propertyId });

    // Remove related media records AND their actual files from S3 so images do
    // not leak as orphaned objects in the bucket.
    const mediaList = await Media.find({ propertyId });
    const urls = mediaList.map((m) => m.url).filter(Boolean);
    if (urls.length) {
      try {
        await deleteS3ObjectsByUrls(urls);
      } catch (err) {
        console.error(`Failed to delete S3 objects for property ${propertyId}:`, err.message || err);
      }
    }
    await Media.deleteMany({ propertyId });

    return sendResponse(res, 200, true, `Property with id ${propertyId} deleted successfully`);
  } catch (error) {
    next(error);
  }
});
