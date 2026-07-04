import Bed from "../models/Bed.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";


export const createBed = asyncHandler(async (req, res, next)=> {
    const {bedNumber, monthlyRent, bookingFee, isAvailable, bedType, position} = req.body;

    const bed = await Bed.create({
        bedNumber,
        monthlyRent,
        bookingFee,
        isAvailable,
        bedType
    })
    if(!bed) sendResponse(res, 400, "Invalid bed data")
    sendResponse(req, 201, true, "Bed created successfully", bed)

});