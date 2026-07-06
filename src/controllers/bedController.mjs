import Bed from "../models/Bed.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";


export const createBed = asyncHandler(async (req, res, next)=> {
    const {bedNumber, room, monthlyRent, bookingFee, isAvailable, bedType} = req.body;

    const requiredFields = ['bedNumber', 'room', 'monthlyRent', 'bookingFee', 'isAvailable', 'bedType'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            sendResponse(res, 400, `${field} is required`);
            return;
        }
    }

    const existingBed = await Bed.findOne({bedNumber});
    if (existingBed) {
        sendResponse(res, 400, "Bed with the same number and position already exists");
        return;
    }

    const bed = await Bed.create({
        bedNumber,
        room,
        monthlyRent,
        bookingFee,
        isAvailable,
        bedType
    })
    if(!bed) sendResponse(res, 400, "Invalid bed data")
    sendResponse(res, 201, true, "Bed created successfully", bed)

});


export const getAllBeds = asyncHandler(async (req, res, next)=>{
    const beds = await Bed.find().populate('room');
    sendResponse(res, 200, true, "All beds retrieved", beds);
});