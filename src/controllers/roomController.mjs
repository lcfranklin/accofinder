import mongoose from "mongoose";
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

export const updateRoom = asyncHandler(async(req, res, next) =>{
        const roomId = req.params.id;

        const {roomName,description,capacity,property,hostel,monthlyRent,bookingFee,isAvailable,
                floorNumber,squareFootage,hasWindow,hasBalcony,amenities}= req.body;
        
        const updates = {roomName,description,capacity,property,hostel,monthlyRent,bookingFee,
                isAvailable,floorNumber,squareFootage,hasWindow,hasBalcony,amenities};
        
        const allowedUpdates = ['roomName','description','capacity','property','hostel','monthlyRent',
                'bookingFee','isAvailable','floorNumber','squareFootage','hasWindow','hasBalcony','amenities'];

        const updateKeys = Object.keys(updates);
        const isValidUpdate = updateKeys.every(key => allowedUpdates.includes(key));

        if(!isValidUpdate || updateKeys.length == 0){
                return sendResponse(res, 400, false, "Invalid room update")
        }

        const room = await Room.findByIdAndUpdate(
                roomId,
                {$set:{
                        roomName: roomName,
                        description: description,
                        capacity: capacity,
                        property: property,
                        hostel: hostel,
                        monthlyRent: monthlyRent,
                        bookingFee: bookingFee,
                        isAvailable: isAvailable,
                        floorNumber: floorNumber,
                        squareFootage: squareFootage,
                        hasWindow: hasWindow,
                        hasBalcony: hasBalcony,
                        amenities: amenities
                }
                },
                {
                        new: true
                }
        );

        if (!room || updateKeys.length == 0) {
                return sendResponse(res, 400, false, " Bad request for room update")
        }

        return sendResponse(res, 200, true, `Room with id: ${roomId} was updated`, room);
});

export const getAllRooms = asyncHandler(async (req, res, next)=>{
        const rooms = await Room.find().populate('property').populate('hostel');
        sendResponse(res, 200, true, "All rooms retrieved", rooms);
});

export const getRoomById = asyncHandler(async(req, res, next) =>{
        const roomId = req.params.id;

        if(!mongoose.Types.ObjectId.isValid(roomId)){
                return sendResponse(res, 400, false, "Invalid Id format")
        }

        const room = await Room.findById(roomId).populate('hostel');
        if(!room){
                return sendResponse(res, 404, false, `Room with id ${roomId} was not found`);
        }
        return sendResponse(res, 200, true, `Room with id ${roomId} was found`, room);
});


export const deleteRoom = asyncHandler(async (req, res, next)=> {
        const roomId = req.params.id
        const deletedRoom = await Room.findByIdAndDelete(roomId)
        if(!deletedRoom){
                return sendResponse(res, 500, false, "Failed to delete Room")
        }

        return sendResponse(res, 200, true, `Room with id ${roomId} got deleted successfully`)
});