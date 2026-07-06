import Hostel from "../models/Hostel.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";


export const createHostel = asyncHandler(async (req, res, next) => {
    const {property,
            title,
            description,
            totalRooms,
            totalBeds,
            bookingFee,
            monthlyRent,
            amenities,
            rules,
            isActive,
            gender} = req.body;

    const requiredFields = ['property', 'title', 'totalRooms', 'totalBeds'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
        return sendResponse(res, 400, false, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const hostel = Hostel.create({
        title,
        description,
        totalRooms,
        totalBeds,
        bookingFee,
        monthlyRent,
        property,
        amenities,
        rules,
        isActive,
        gender
    });

    sendResponse(res, 201, true, "Hostel Created", hostel);
});

export const getAllHostels = asyncHandler(async (req, res, next) => {
    const hostels = await Hostel.find();
    res.status(200).json(hostels);
});

