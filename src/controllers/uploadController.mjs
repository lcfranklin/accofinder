import { Media } from '../models/Media.mjs';
import { Property } from '../models/Property.mjs';
import { generateUploadUrl } from '../utils/s3Presigner.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

//  get S3 presigned upload URL
export const getUploadUrl = asyncHandler(async (req, res, next) => {
  try {
    const { fileType } = req.query;
    const extension = fileType || 'jpg';
    const key = `uploads/${Date.now()}.${extension}`;

    const url = await generateUploadUrl({
      key,
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    if (!url) {
      return sendResponse(res, 500, false, 'Failed to generate upload URL');
    }

    return sendResponse(
      res,
      200,
      true,
      'Presigned upload URL generated successfully',
      {
        uploadUrl: url,
        key,
      },
    );
  } catch (error) {
    next(error);
  }
});

//  attach uploaded media metadata to a property
export const attachMediaToProperty = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId, url, type } = req.validatedData || req.body;

    if (!propertyId || !url || !type) {
      return sendResponse(
        res,
        400,
        false,
        'Missing required fields: propertyId, url, type',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    // Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return sendResponse(res, 404, false, 'Target property not found');
    }

    const media = await Media.create({
      propertyId: new mongoose.Types.ObjectId(propertyId),
      url,
      type,
    });

    if (!media) {
      return sendResponse(res, 400, false, 'Failed to attach media record');
    }

    return sendResponse(
      res,
      201,
      true,
      'Media attached to property successfully',
      media,
    );
  } catch (error) {
    next(error);
  }
});

//  get all media files for a specific property
export const getMediaByProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    const mediaList = await Media.find({ propertyId });

    return sendResponse(
      res,
      200,
      true,
      'Media retrieved successfully',
      mediaList,
    );
  } catch (error) {
    next(error);
  }
});

//  delete media record by ID
export const deleteMedia = asyncHandler(async (req, res, next) => {
  try {
    const mediaId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return sendResponse(res, 400, false, 'Invalid media ID format');
    }

    const deletedMedia = await Media.findByIdAndDelete(mediaId);

    if (!deletedMedia) {
      return sendResponse(
        res,
        404,
        false,
        'Media record not found or already deleted',
      );
    }

    return sendResponse(
      res,
      200,
      true,
      `Media record ${mediaId} deleted successfully`,
    );
  } catch (error) {
    next(error);
  }
});
