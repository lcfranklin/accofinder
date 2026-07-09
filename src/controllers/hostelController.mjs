import Hostel from "../models/Hostel.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";
import mongoose from "mongoose";

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

export const getHostelById = asyncHandler( async (req, res, next) =>{
    const hostelId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(hostelId)) {
        return sendResponse(res, 400, false, "Invalid property ID");
    }
    const hostel = await Hostel.findById(hostelId).populate('property');

    if(!hostel){
        return sendResponse(res, 404, false, `hostel with id ${hostelId} was not found`);
    }
        return sendResponse(res, 200, true, `hostel with id ${hostelId} found`, hostel);
});