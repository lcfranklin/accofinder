import { Property } from '../models/Property.mjs';
import { Room } from '../models/Room.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

export const createProperty = asyncHandler(async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
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

    const property = await Property.create({
      title,
      description,
      price: price ?? 0,
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
        price: r.price || 0,
        available: r.available !== undefined ? r.available : true,
      }));
      createdRooms = await Room.insertMany(roomDocs, { ordered: true });
    }

    return sendResponse(res, 201, true, 'Property created successfully', {
      ...property.toObject(),
      rooms: createdRooms,
    });
  } catch (error) {
    next(error);
  }
});

export const updateProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    const {
      media,
      title,
      description,
      price,
      propertyType,
      physicalAddress,
      verificationStatus,
      amenities,
      landlord,
      landlordPhone,
      isActive,
    } = req.validatedData;

    const setUpdates = {};
    if (title !== undefined) setUpdates.title = title;
    if (description !== undefined) setUpdates.description = description;
    if (price !== undefined) setUpdates.price = price;
    if (propertyType !== undefined) setUpdates.propertyType = propertyType;
    if (physicalAddress !== undefined) setUpdates.physicalAddress = physicalAddress;
    if (verificationStatus !== undefined) setUpdates.verificationStatus = verificationStatus;
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

    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      updateOp,
      { new: true, runValidators: true },
    );

    if (!updatedProperty) {
      return sendResponse(res, 404, false, 'Property not found or not updated');
    }

    return sendResponse(res, 200, true, 'Property updated successfully', updatedProperty);
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
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.validatedData || req.query;

    const filter = {};
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
        .populate('owner', 'firstName lastName email phone')
        .populate('media')
        .sort({ [sortBy]: sortDir })
        .skip(skip)
        .limit(Number(limit)),
      Property.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, 'Properties retrieved successfully', {
      properties,
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
        .populate('owner', 'firstName lastName email phone')
        .populate('media'),
      Room.find({ propertyId }),
    ]);

    if (!property) {
      return sendResponse(res, 404, false, `Property with id ${propertyId} not found`);
    }

    return sendResponse(res, 200, true, 'Property found', {
      ...property.toObject(),
      rooms,
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

    const deletedProperty = await Property.findByIdAndDelete(propertyId);

    if (!deletedProperty) {
      return sendResponse(res, 404, false, 'Failed to delete property or property not found');
    }

    await Room.deleteMany({ propertyId });

    return sendResponse(res, 200, true, `Property with id ${propertyId} deleted successfully`);
  } catch (error) {
    next(error);
  }
});
