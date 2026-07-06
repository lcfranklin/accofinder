import Room from "../models/Room.mjs";
import { asyncHandler, sendResponse } from "../utils/helpers.mjs";


export const createRoom = asyncHandler(async (req, res, next)=>{

        const {roomName,
                description,
                capacity,
                property,
                hostel,
                monthlyRent,
                bookingFee,
                isAvailable,
                floorNumber,
                squareFootage,
                hasWindow,
                hasBalcony,
                amenities
        }= req.body;

        const requiredFields = ['roomName', 'capacity', 'hostel', 'monthlyRent', 'bookingFee'];
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
                return sendResponse(res, 400, `Missing required fields: ${missingFields.join(', ')}`);
        }

        const room = Room.create({
                roomName,
                description,
                capacity,
                property,
                hostel,
                monthlyRent,
                bookingFee,
                isAvailable,
                floorNumber,
                squareFootage,
                hasWindow,
                hasBalcony,
                amenities
        });

        if(!room)sendResponse(res, 400, false, "bad request room not created");
        sendResponse(res, 201, true, "Room was created", room)
});


export const getAllRooms = asyncHandler(async (req, res, next)=>{
        const rooms = await Room.find().populate('property').populate('hostel');
        sendResponse(res, 200, true, "All rooms retrieved", rooms);
});


