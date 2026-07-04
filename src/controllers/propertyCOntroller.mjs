import Property from "../models/Property.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";


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