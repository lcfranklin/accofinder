import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3, { S3_BUCKET } from '../config/s3.mjs';
import { Media } from '../models/media.mjs';
import { Property } from '../models/Property.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

export const uploadMedia = asyncHandler(async (req, res, next) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, false, 'No file received in the request');
    }

    const { propertyId, type = 'image', isPrimary = 'false', roomId = '-1' } = req.body;

    if (!propertyId) {
      return sendResponse(res, 400, false, 'Missing required field: propertyId');
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    const property = await Property.findById(propertyId);
    if (!property) {
      return sendResponse(res, 404, false, 'Target property not found');
    }
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const key = `properties/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype || 'image/jpeg',
      }),
    );

    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

    const media = await Media.create({
      propertyId: new mongoose.Types.ObjectId(propertyId),
      url,
      type,
      isPrimary: isPrimary === 'true' || isPrimary === true,
      roomId: roomId ?? '-1',
    });

    return sendResponse(res, 201, true, 'Media uploaded successfully', media);
  } catch (error) {
    next(error);
  }
});

export const getUploadUrl = asyncHandler(async (req, res, next) => {
  try {
    const { fileType } = req.query;
    const extension = fileType || 'jpg';
    const key = `uploads/${Date.now()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    if (!url) {
      return sendResponse(res, 500, false, 'Failed to generate upload URL');
    }

    return sendResponse(res, 200, true, 'Presigned upload URL generated successfully', {
      uploadUrl: url,
      key,
    });
  } catch (error) {
    next(error);
  }
});

export const attachMediaToProperty = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId, url, type } = req.validatedData || req.body;

    if (!propertyId || !url || !type) {
      return sendResponse(res, 400, false, 'Missing required fields: propertyId, url, type');
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

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

    return sendResponse(res, 201, true, 'Media attached to property successfully', media);
  } catch (error) {
    next(error);
  }
});

export const getMediaByProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    const mediaList = await Media.find({ propertyId });

    return sendResponse(res, 200, true, 'Media retrieved successfully', mediaList);
  } catch (error) {
    next(error);
  }
});

export const deleteMedia = asyncHandler(async (req, res, next) => {
  try {
    const mediaId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(mediaId)) {
      return sendResponse(res, 400, false, 'Invalid media ID format');
    }

    const deletedMedia = await Media.findByIdAndDelete(mediaId);

    if (!deletedMedia) {
      return sendResponse(res, 404, false, 'Media record not found or already deleted');
    }

    return sendResponse(res, 200, true, `Media record ${mediaId} deleted successfully`);
  } catch (error) {
    next(error);
  }
});
