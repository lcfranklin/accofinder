import mongoose from "mongoose";
import Bed from "../models/Bed.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";


export const createBed = asyncHandler(async (req, res, next)=> {
    const {bedNumber, room, monthlyRent, bookingFee, isAvailable,
            bedType} = req.body;

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
        bedNumber,room,monthlyRent,bookingFee,isAvailable,bedType});

    if(!bed) sendResponse(res, 400, "Invalid bed data")
    sendResponse(res, 201, true, "Bed created successfully", bed)

});

export const updateBed = asyncHandler(async(req, res, next) =>{
    const bedId = req.params.id;
    const {bedNumber, room, monthlyRent, bookingFee, isAvailable,
            bedType} = req.body;

    const  updates = {bedNumber, room, monthlyRent, bookingFee, 
                        isAvailable,bedType}
    
    const allowedUpdates = ['bedNumber', 'room', 'monthlyRent', 'bookingFee', 
                        'isAvailable','bedType']
    
    const updateKeys = Object.keys(updates);
    const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

    if (!isValidUpdate || updateKeys.length === 0) {
        return sendResponse(res, 400, false, "Invalid or empty bed update fields")
    }
    
    const bed = await Bed.findByIdAndUpdate(
        bedId,
        { $set: {
            bedNumber: bedNumber, 
            room: room, 
            monthlyRent: monthlyRent, 
            bookingFee: bookingFee, 
            isAvailable: isAvailable,
            bedType: bedType
            } 
        },         
        { 
            new: true
        }
    );
    if (!bed) {
        return sendResponse(res, 404, false, "Bed not updated")
    }

        return sendResponse(res, 200, true, "Bed updated", bed)
});


export const getAllBeds = asyncHandler(async (req, res, next)=>{
    const beds = await Bed.find().populate('room');
    sendResponse(res, 200, true, "All beds retrieved", beds);
});

export const getBedById = asyncHandler(async(req, res, next) =>{
    const bedId = req.params.id;

    if(!mongoose.Types.ObjectId.isValid(bedId)){
        return sendResponse(res, false, `invalid format for id ${bedId}`);
    }

    const bed = await Bed.findById(bedId).populate('room');
    if(!bed){
        return sendResponse(res, 404, false, `Bed with id ${bedId} was not found`);
    }
    return sendResponse(res, 200, true, `Bed with id ${bedId} was found`,bed);
});

export const deleteBed = asyncHandler(async (req,res,next)=> {
        const bedId = req.params.id
        const deletedBed = await Bed.findByIdAndDelete(bedId);
        if(!deleteBed){
            return sendResponse(res, 500, false, "Failed to delete Bed")
        }

        return sendResponse(res, 200, true, `Bed with id ${bedId} got deleted successfully`)
});