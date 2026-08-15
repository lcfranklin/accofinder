import { Property } from '../models/Property.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

//  create  new property
export const createProperty = asyncHandler(async (req, res, next) => {
  try {
    const { title, location, price, description, status, agentId, landlordId } =
      req.validatedData || req.body;

    const requiredFields = [
      'title',
      'location',
      'price',
      'description',
      'agentId',
      'landlordId',
    ];
    const missingFields = requiredFields.filter(
      (field) => !(req.validatedData || req.body)[field],
    );

    if (missingFields.length > 0) {
      return sendResponse(
        res,
        400,
        false,
        `Missing required fields: ${missingFields.join(', ')}`,
      );
    }

    const property = await Property.create({
      title,
      location,
      price,
      description,
      status,
      agentId,
      landlordId,
    });

    if (!property) {
      return sendResponse(res, 400, false, 'Bad request, property not created');
    }

    return sendResponse(
      res,
      201,
      true,
      'Property created successfully',
      property,
    );
  } catch (error) {
    next(error);
  }
});

//  update an existing property
export const updateProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    const { title, location, price, description, status, agentId, landlordId } =
      req.validatedData || req.body;

    const updates = {
      title,
      location,
      price,
      description,
      status,
      agentId,
      landlordId,
    };

    // Remove undefined values
    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key],
    );

    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, 'Invalid or empty update fields');
    }

    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedProperty) {
      return sendResponse(res, 404, false, 'Property not found or not updated');
    }

    return sendResponse(
      res,
      200,
      true,
      'Property updated successfully',
      updatedProperty,
    );
  } catch (error) {
    next(error);
  }
});

//  get all properties
export const getAllProperties = asyncHandler(async (req, res, next) => {
  try {
    const properties = await Property.find()
      .populate('agentId', 'firstName lastName email phone')
      .populate('landlordId', 'firstName lastName email phone paymentDetails');

    if (!properties) {
      return sendResponse(res, 400, false, 'Bad request, properties not found');
    }

    return sendResponse(
      res,
      200,
      true,
      'Properties retrieved successfully',
      properties,
    );
  } catch (error) {
    next(error);
  }
});

//  get a property by ID
export const getPropertyById = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    const property = await Property.findById(propertyId)
      .populate('agentId', 'firstName lastName email phone')
      .populate('landlordId', 'firstName lastName email phone paymentDetails');

    if (!property) {
      return sendResponse(
        res,
        404,
        false,
        `Property with id ${propertyId} not found`,
      );
    }

    return sendResponse(res, 200, true, `Property found`, property);
  } catch (error) {
    next(error);
  }
});

//  delete a property
export const deleteProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID');
    }

    const deletedProperty = await Property.findByIdAndDelete(propertyId);

    if (!deletedProperty) {
      return sendResponse(
        res,
        404,
        false,
        'Failed to delete property or property not found',
      );
    }

    return sendResponse(
      res,
      200,
      true,
      `Property with id ${propertyId} deleted successfully`,
    );
  } catch (error) {
    next(error);
  }
});
