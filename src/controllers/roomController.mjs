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
        if(!room)sendResponse(res, 400, "bad request room not created");
        sendResponse(res, 201, "Room was created", room)
})