import Property from "../models/Property.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";
import mongoose from "mongoose";

export const createProperty = asyncHandler(async (req, res, next)=>{
    const {
            title,
            description,
            owner,
            physicalAddress,
            district,
            village,
            location,
            coordinates,
            verificationStatus,
            amenities,
            media,
            isActive,
            averageRating,
            totalReviews
    } = req.body

    const requiredFields = ['title', 'description', 'owner'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return sendResponse(res, 400, false, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const property = Property.create({
            title,
            description,
            owner,
            physicalAddress,
            district,
            village,
            location,
            coordinates,
            verificationStatus,
            amenities,
            media,
            isActive,
            averageRating,
            totalReviews
    })

    if(!property) sendResponse(res, 400, false, " Bad request property not created");
    sendResponse(res, 200, true, "property was created", property)
});

export const getAllProperties = asyncHandler(async (req, res, next)=>{
    const properties = await Property.find();
    if(!properties) sendResponse(res, 400, false, " Bad request properties not found");
    sendResponse(res, 200, true, "properties were found", properties)
});

export const getPropertyById = asyncHandler( async (req, res, next) => {
    const propertyId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return sendResponse(res, 400, false, "Invalid property ID");
    }

    const property = await Property.findById(propertyId).populate('owner');
    if (!property) {
    return sendResponse(res, 404, false, `property with id ${propertyId} not found`);
    }
    return sendResponse(res, 200, true, `property with id ${propertyId} found`, property);
});