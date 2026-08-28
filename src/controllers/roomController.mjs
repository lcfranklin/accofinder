import { Room } from '../models/Room.mjs';
import { Property } from '../models/Property.mjs';
import { asyncHandler, sendResponse } from '../utils/helpers.mjs';
import mongoose from 'mongoose';

// get all rooms
export const getAllRooms = asyncHandler(async (req, res, next) => {
  try {
    const rooms = await Room.find().populate(
      'propertyId',
      'title location price status',
    );

    if (!rooms) {
      return sendResponse(res, 400, false, 'Failed to retrieve rooms');
    }

    return sendResponse(res, 200, true, 'Rooms retrieved successfully', rooms);
  } catch (error) {
    next(error);
  }
});

// get rooms by property ID
export const getRoomsByProperty = asyncHandler(async (req, res, next) => {
  try {
    const propertyId = req.params.propertyId;

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    const rooms = await Room.find({ propertyId }).populate(
      'propertyId',
      'title location price',
    );

    return sendResponse(
      res,
      200,
      true,
      'Rooms for property retrieved successfully',
      rooms,
    );
  } catch (error) {
    next(error);
  }
});

//  get room by ID
export const getRoomById = asyncHandler(async (req, res, next) => {
  try {
    const roomId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return sendResponse(res, 400, false, 'Invalid room ID format');
    }

    const room = await Room.findById(roomId).populate(
      'propertyId',
      'title location price agentId landlordId',
    );

    if (!room) {
      return sendResponse(res, 404, false, `Room with id ${roomId} not found`);
    }

    return sendResponse(res, 200, true, 'Room found', room);
  } catch (error) {
    next(error);
  }
});

// create a new room under a property
export const createRoom = asyncHandler(async (req, res, next) => {
  try {
    const { propertyId, type, price, available } = req.validatedData || req.body;

    if (!propertyId || !type) {
      return sendResponse(
        res,
        400,
        false,
        'Missing required fields: propertyId, type',
      );
    }

    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return sendResponse(res, 400, false, 'Invalid property ID format');
    }

    // Verify parent Property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return sendResponse(res, 404, false, 'Parent property not found');
    }

    const room = await Room.create({
      propertyId: new mongoose.Types.ObjectId(propertyId),
      type,
      price: price ?? 0,
      available: available !== undefined ? available : true,
    });

    if (!room) {
      return sendResponse(res, 400, false, 'Bad request, room not created');
    }

    return sendResponse(res, 201, true, 'Room created successfully', room);
  } catch (error) {
    next(error);
  }
});

//  update room details
export const updateRoom = asyncHandler(async (req, res, next) => {
  try {
    const roomId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return sendResponse(res, 400, false, 'Invalid room ID format');
    }

    const { type, price, available } = req.validatedData || req.body;
    const updates = { type, price, available };

    Object.keys(updates).forEach(
      (key) => updates[key] === undefined && delete updates[key],
    );

    if (Object.keys(updates).length === 0) {
      return sendResponse(res, 400, false, 'Invalid or empty update fields');
    }

    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      { $set: updates },
      { returnDocument: 'after', runValidators: true },
    );

    if (!updatedRoom) {
      return sendResponse(res, 404, false, `Room with id ${roomId} not found`);
    }

    return sendResponse(
      res,
      200,
      true,
      'Room updated successfully',
      updatedRoom,
    );
  } catch (error) {
    next(error);
  }
});

// toggle availability
export const toggleRoomAvailability = asyncHandler(async (req, res, next) => {
  try {
    const roomId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return sendResponse(res, 400, false, 'Invalid room ID format');
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return sendResponse(res, 404, false, `Room with id ${roomId} not found`);
    }

    room.available = !room.available;
    await room.save();

    return sendResponse(
      res,
      200,
      true,
      `Room availability updated to ${room.available}`,
      room,
    );
  } catch (error) {
    next(error);
  }
});

//  delete  room
export const deleteRoom = asyncHandler(async (req, res, next) => {
  try {
    const roomId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return sendResponse(res, 400, false, 'Invalid room ID format');
    }

    const deletedRoom = await Room.findByIdAndDelete(roomId);

    if (!deletedRoom) {
      return sendResponse(
        res,
        404,
        false,
        'Failed to delete room or room not found',
      );
    }

    return sendResponse(
      res,
      200,
      true,
      `Room with id ${roomId} deleted successfully`,
    );
  } catch (error) {
    next(error);
  }
});
